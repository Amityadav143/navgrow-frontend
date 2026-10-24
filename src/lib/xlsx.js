/**
 * © 2024–2026 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 *
 * Minimal Excel (.xlsx) reading and writing — enough for product sheets, with
 * no library. An .xlsx file is a ZIP of XML parts.
 *
 *   readXlsx(buffer)  → rows of the FIRST worksheet as strings; rows[i] is sheet
 *                       row i+1 (blank rows kept, so row numbers in messages
 *                       match what the admin sees in Excel). Reads shared and
 *                       inline strings, numbers, booleans and formulas' values.
 *   buildXlsx(sheets) → Uint8Array of a workbook: text and number cells, a bold
 *                       frozen header row, column widths, text-formatted columns
 *                       (so SKUs like 00123 and HSN codes keep their zeros).
 */

const u16 = (b, o) => b[o] | (b[o + 1] << 8);
const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

/** Rows beyond this are refused (a product sheet is far smaller). */
export const MAX_XLSX_ROWS = 20000;

/* ─── Reading ───────────────────────────────────────────────────────────── */

async function inflateRaw(bytes) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error("This browser can't open .xlsx files. In Excel use File › Save As › CSV UTF-8, and upload that instead.");
  }
  const stream = new ReadableStream({ start(c) { c.enqueue(bytes); c.close(); } })
    .pipeThrough(new DecompressionStream('deflate-raw'));
  const reader = stream.getReader();
  const parts = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    size += value.length;
  }
  const out = new Uint8Array(size);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/** Entries of a ZIP archive: name → () => Promise<Uint8Array>. */
function unzip(buffer) {
  const b = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let end = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) {
    if (u32(b, i) === 0x06054b50) { end = i; break; }
  }
  if (end < 0) throw new Error("This doesn't look like an Excel (.xlsx) file. Save it from Excel as .xlsx or CSV and try again.");
  const count = u16(b, end + 10);
  let p = u32(b, end + 16);
  const names = new TextDecoder();
  const files = new Map();
  for (let n = 0; n < count && p + 46 <= b.length && u32(b, p) === 0x02014b50; n++) {
    const method = u16(b, p + 10);
    const size = u32(b, p + 20);
    const nameLen = u16(b, p + 28);
    const extraLen = u16(b, p + 30);
    const commentLen = u16(b, p + 32);
    const local = u32(b, p + 42);
    const name = names.decode(b.subarray(p + 46, p + 46 + nameLen));
    files.set(name, async () => {
      if (u32(b, local) !== 0x04034b50) throw new Error('The .xlsx file is damaged.');
      const start = local + 30 + u16(b, local + 26) + u16(b, local + 28);
      const data = b.subarray(start, start + size);
      if (method === 0) return data;
      if (method === 8) return inflateRaw(data);
      throw new Error('The .xlsx file uses a compression this page can\'t read — save it again from Excel.');
    });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

const decodeXml = (s) => String(s)
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&amp;/g, '&');

/** The text of a string item: every <t> run, without phonetic (<rPh>) hints. */
const textOf = (fragment) => [...String(fragment).replace(/<rPh\b[\s\S]*?<\/rPh>/g, '')
  .matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(m => decodeXml(m[1])).join('');

const columnIndex = (ref) => {
  let n = 0;
  for (const ch of String(ref).replace(/[^A-Za-z]/g, '').toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

/** Rows of the first worksheet of an .xlsx file, as strings. */
export async function readXlsx(buffer) {
  const files = unzip(buffer);
  const read = async (name) => (files.has(name) ? new TextDecoder().decode(await files.get(name)()) : null);

  let sheetPath = 'xl/worksheets/sheet1.xml';
  const workbook = await read('xl/workbook.xml');
  const rels = await read('xl/_rels/workbook.xml.rels');
  if (workbook && rels) {
    const first = workbook.match(/<sheet\b[^>]*?\br:id="([^"]+)"/);
    if (first) {
      const rel = [...rels.matchAll(/<Relationship\b[^>]*>/g)].map(m => m[0])
        .find(tag => tag.includes(`Id="${first[1]}"`));
      const target = rel && rel.match(/\bTarget="([^"]+)"/);
      if (target) {
        const t = target[1];
        sheetPath = t.startsWith('/') ? t.slice(1) : `xl/${t.replace(/^\.\//, '')}`;
      }
    }
  }
  const sheet = await read(sheetPath);
  if (!sheet) throw new Error('No worksheet found in the .xlsx file.');

  const shared = [];
  const sst = await read('xl/sharedStrings.xml');
  if (sst) for (const m of sst.matchAll(/<si>([\s\S]*?)<\/si>/g)) shared.push(textOf(m[1]));

  const rows = [];
  let next = 0;
  for (const rm of sheet.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const rAttr = (rm[1] || '').match(/\br="(\d+)"/);
    const index = rAttr ? Number(rAttr[1]) - 1 : next;
    next = index + 1;
    const cells = [];
    for (const cm of (rm[2] || '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cm[1] || '';
      const inner = cm[2] || '';
      const ref = (attrs.match(/\br="([A-Za-z]+)\d*"/) || [])[1];
      const type = (attrs.match(/\bt="([^"]+)"/) || [])[1] || 'n';
      const v = (inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
      let value = '';
      if (type === 's') value = shared[Number(v)] ?? '';
      else if (type === 'inlineStr') value = textOf(inner);
      else if (type === 'b') value = v === '1' ? 'TRUE' : 'FALSE';
      else if (type === 'str' || type === 'e') value = v != null ? decodeXml(v) : '';
      else if (v != null) {
        const n = Number(v);
        // 0.1 + 0.2 style float noise from Excel ("450.00000000000006") → "450"
        value = Number.isFinite(n) ? String(Math.round(n * 1e9) / 1e9) : decodeXml(v);
      }
      const col = ref ? columnIndex(ref) : cells.length;
      if (col < 0 || col > 16383) continue;
      while (cells.length < col) cells.push('');
      cells[col] = value;
    }
    if (!cells.some(c => String(c).trim() !== '')) continue;
    if (index >= MAX_XLSX_ROWS) {
      throw new Error(`The sheet has data in row ${index + 1}. Upload at most ${MAX_XLSX_ROWS.toLocaleString('en-IN')} rows at a time.`);
    }
    while (rows.length < index) rows.push([]);
    rows[index] = cells;
  }
  return rows;
}

/* ─── Writing ───────────────────────────────────────────────────────────── */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/** A ZIP archive (files stored uncompressed — small, and readable everywhere). */
export function zip(files, when = new Date()) {
  const enc = new TextEncoder();
  const time = (when.getHours() << 11) | (when.getMinutes() << 5) | (when.getSeconds() >> 1);
  const date = ((Math.max(1980, when.getFullYear()) - 1980) << 9) | ((when.getMonth() + 1) << 5) | when.getDate();
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
    const crc = crc32(data);
    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);          // names are UTF-8
    lv.setUint16(8, 0, true);               // stored
    lv.setUint16(10, time, true);
    lv.setUint16(12, date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, name.length, true);
    local.set(name, 30);
    chunks.push(local, data);

    const entry = new Uint8Array(46 + name.length);
    const cv = new DataView(entry.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, time, true);
    cv.setUint16(14, date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    entry.set(name, 46);
    central.push(entry);
    offset += local.length + data.length;
  }
  const size = central.reduce((s, e) => s + e.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, size, true);
  ev.setUint32(16, offset, true);
  const all = [...chunks, ...central, end];
  const out = new Uint8Array(all.reduce((s, c) => s + c.length, 0));
  let o = 0;
  for (const c of all) { out.set(c, o); o += c.length; }
  return out;
}

const esc = (s) => String(s)
  // Characters XML 1.0 doesn't allow (Excel refuses the file otherwise).
  // eslint-disable-next-line no-control-regex
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const columnName = (i) => {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

// Cell styles (index into cellXfs below).
const STYLE = { normal: 0, header: 1, text: 2, wrap: 3, title: 4, note: 5 };

const STYLES_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
  + '<fonts count="4">'
  + '<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>'
  + '<font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font>'
  + '<font><b/><sz val="13"/><name val="Calibri"/><family val="2"/></font>'
  + '<font><i/><sz val="10"/><color rgb="FF555555"/><name val="Calibri"/><family val="2"/></font>'
  + '</fonts>'
  + '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'
  + '<fill><patternFill patternType="solid"><fgColor rgb="FFFDE68A"/><bgColor indexed="64"/></patternFill></fill></fills>'
  + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
  + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
  + '<cellXfs count="6">'
  + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
  + '<xf numFmtId="49" fontId="1" fillId="2" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"/>'
  + '<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
  + '<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'
  + '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
  + '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'
  + '</cellXfs>'
  + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
  + '</styleSheet>';

/**
 * One worksheet. sheet = {
 *   rows: Array<Array<string | number | null | { v, style }>>,
 *   cols: [{ width, text, wrap }],   per column (text = keep typed values as text)
 *   header: true,                     first row bold, highlighted and frozen
 * }
 */
function sheetXml(sheet) {
  const cols = sheet.cols || [];
  const out = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
    + 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'];
  if (sheet.header) {
    out.push('<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>'
      + '<selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>');
  } else {
    out.push('<sheetViews><sheetView workbookViewId="0"/></sheetViews>');
  }
  out.push('<sheetFormatPr defaultRowHeight="15"/>');
  if (cols.length) {
    out.push('<cols>');
    cols.forEach((c, i) => {
      const style = c.wrap ? STYLE.wrap : c.text ? STYLE.text : null;
      out.push(`<col min="${i + 1}" max="${i + 1}" width="${Number(c.width) || 12}" customWidth="1"${style != null ? ` style="${style}"` : ''}/>`);
    });
    out.push('</cols>');
  }
  out.push('<sheetData>');
  (sheet.rows || []).forEach((row, ri) => {
    const cells = [];
    (row || []).forEach((cell, ci) => {
      const obj = cell != null && typeof cell === 'object' ? cell : { v: cell };
      const v = obj.v;
      if (v == null || v === '') return;
      const ref = `${columnName(ci)}${ri + 1}`;
      const col = cols[ci] || {};
      let style = obj.style != null ? STYLE[obj.style] ?? STYLE.normal
        : sheet.header && ri === 0 ? STYLE.header
          : col.wrap ? STYLE.wrap : col.text ? STYLE.text : null;
      if (typeof v === 'number' && Number.isFinite(v)) {
        if (style === STYLE.text || style === STYLE.wrap) style = null;
        cells.push(`<c r="${ref}"${style ? ` s="${style}"` : ''}><v>${v}</v></c>`);
      } else {
        cells.push(`<c r="${ref}" t="inlineStr"${style ? ` s="${style}"` : ''}><is><t xml:space="preserve">${esc(v)}</t></is></c>`);
      }
    });
    if (cells.length) out.push(`<row r="${ri + 1}">${cells.join('')}</row>`);
  });
  out.push('</sheetData></worksheet>');
  return out.join('');
}

/** A workbook from sheets [{ name, rows, cols, header }] (the first sheet opens first). */
export function buildXlsx(sheets) {
  const list = (sheets || []).map((s, i) => ({
    ...s,
    name: String(s.name || `Sheet${i + 1}`).replace(/[[\]:*?/\\]/g, ' ').slice(0, 31) || `Sheet${i + 1}`,
  }));
  if (!list.length) throw new Error('A workbook needs at least one sheet.');
  const files = [
    { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      + '<Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + list.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
      + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      + '</Types>' },
    { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
      + '</Relationships>' },
    { name: 'xl/workbook.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
      + 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      + '<bookViews><workbookView activeTab="0"/></bookViews><sheets>'
      + list.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')
      + '</sheets></workbook>' },
    { name: 'xl/_rels/workbook.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + list.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')
      + `<Relationship Id="rId${list.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`
      + '</Relationships>' },
    { name: 'xl/styles.xml', data: STYLES_XML },
    ...list.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s) })),
  ];
  return zip(files);
}
