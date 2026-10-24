/**
 * © 2024–2026 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 *
 * Bulk product upload & update from a spreadsheet — including products sold
 * in options (e.g. Cement by Brand × Grade × Pack size).
 *
 *   • Reads Excel (.xlsx), CSV / TSV, or cells pasted from Excel / Google Sheets.
 *   • One row per product; a product sold in options takes ONE ROW PER OPTION —
 *     rows with the same Handle (or Name) are one product. Option names go in
 *     "Option1 Name"…, each row's choices in "Option1 Value"…; that row's SKU,
 *     Price, MRP, Stock, Min Order and Bulk Prices are the option's. A sheet
 *     with plain "Brand", "Grade", "Size"… columns works too.
 *   • Product details (description, photos, GST…) only need the first row.
 *   • Existing products are found by SKU, Handle or Name and UPDATED: blank
 *     cells keep what's saved, "none" clears a value, and options that aren't
 *     in the sheet stay as they are. The preview lists every change first.
 *   • Shopify product exports import as they are (Handle, Title, Option1 Name /
 *     Value, Variant SKU / Price / Compare At Price / Inventory Qty, Body (HTML),
 *     Image Src, Published / Status…).
 *
 * No React here — everything is unit-tested in src/__tests__/productImport.test.js.
 */
import { normalizeTiers, safeTiers, parseTiers, rupees } from '@/lib/pricing';
import { normalizeGstRate, OLD_GST_RATES } from '@/lib/gst';
import { parseRules } from '@/lib/pincodeRules';
import { readXlsx, buildXlsx } from '@/lib/xlsx';

export const MAX_SHEET_ROWS = 5000;
export const MAX_OPTIONS = 300;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
const SKU_RE = /^[A-Z0-9][A-Z0-9._/-]{0,63}$/;
const EXAMPLE_OPTION_NAMES = ['Brand', 'Grade', 'Pack size'];

/* ─── Reading a spreadsheet ─────────────────────────────────────────────── */

const isBlankRow = (r) => !r || r.every(c => String(c ?? '').trim() === '');

/**
 * RFC-4180 CSV/TSV: quoted fields with delimiters, line breaks and "" escapes.
 * Every record is returned — blank ones too — so row numbers match the sheet.
 * A quote in the middle of a field (12" pipe) is kept as a character.
 */
export function parseCSV(text, delimiter = ',') {
  let t = String(text ?? '');
  if (t.charCodeAt(0) === 0xFEFF) t = t.slice(1);
  const rows = [];
  let row = [], cur = '', inQ = false, quoted = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (inQ) {
      if (ch === '"') {
        if (t[i + 1] === '"') { cur += '"'; i++; } else inQ = false;
      } else cur += ch;
    } else if (ch === '"' && cur === '' && !quoted) {
      inQ = true; quoted = true;
    } else if (ch === delimiter) {
      row.push(cur); cur = ''; quoted = false;
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++;
      row.push(cur); cur = ''; quoted = false;
      rows.push(row); row = [];
    } else cur += ch;
  }
  if (cur !== '' || row.length || quoted) { row.push(cur); rows.push(row); }
  while (rows.length && isBlankRow(rows[rows.length - 1])) rows.pop();
  return rows;
}

/** Tab (pasted cells), semicolon (Excel in many locales) or comma — whichever the first lines use most. */
export function detectDelimiter(text) {
  const lines = String(text ?? '').replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim()).slice(0, 5);
  let best = ',', bestCount = 0;
  for (const d of ['\t', ';', ',']) {
    let n = 0;
    for (const line of lines) {
      let inQ = false;
      for (const ch of line) {
        if (ch === '"') inQ = !inQ;
        else if (!inQ && ch === d) n++;
      }
    }
    if (n > bestCount) { best = d; bestCount = n; }
  }
  return best;
}

/** Rows from a File: .xlsx, .csv, .tsv or .txt. */
export async function readSpreadsheetFile(file) {
  const name = String(file?.name || '').toLowerCase();
  if (file?.size > MAX_FILE_BYTES) throw new Error('The file is larger than 10 MB — split it into smaller sheets.');
  if (/\.(xls|ods|numbers)$/.test(name)) {
    throw new Error('Please save the sheet as Excel Workbook (.xlsx) or CSV UTF-8 — in Excel: File › Save As.');
  }
  if (/\.(xlsx|xlsm)$/.test(name)) return readXlsx(await file.arrayBuffer());
  const text = await file.text();
  return parseCSV(text, detectDelimiter(text));
}

/** Rows from pasted text (cells copied from a spreadsheet arrive tab-separated). */
export function rowsFromText(text) {
  const t = String(text ?? '');
  return parseCSV(t, detectDelimiter(t));
}

/* ─── Columns ───────────────────────────────────────────────────────────── */

/**
 * The sheet's columns, in template order. level 'product': read from the
 * product's first row that has it; 'row': the product's own, or that option's.
 * type: number cells in Excel; text: kept as text in Excel (leading zeros).
 */
export const COLUMNS = [
  { key: 'handle', label: 'Handle', level: 'product', width: 28, text: true,
    help: "The product's web address: navgrow.org/shop/<handle>. Rows with the same Handle are one product. Optional — blank: made from the Name.", example: 'opc-ppc-cement' },
  { key: 'name', label: 'Name', level: 'product', width: 34, required: 'new',
    help: 'Product name. Rows with the same Name are one product when there is no Handle.', example: 'Cement — OPC & PPC (50 kg bag)' },
  { key: 'category', label: 'Category', level: 'product', width: 22, required: 'new',
    help: 'e.g. Civil & Construction, Safety Equipment.', example: 'Civil & Construction' },
  { key: 'unitLabel', label: 'Unit', level: 'product', width: 9,
    help: 'What one unit is — bag, tonne, piece, litre… Shown as "₹420 / bag".', example: 'bag' },
  { key: 'gstRate', label: 'GST Rate', level: 'product', width: 9, type: 'number',
    help: '0, 5, 18 or 40 (also 3 and 0.25). Blank on a new product: the category\'s tax rule.', example: '18' },
  { key: 'hsnCode', label: 'HSN Code', level: 'product', width: 10, text: true,
    help: '4–8 digits, printed on the invoice. e.g. 2523 cement, 7214 TMT bars.', example: '2523' },
  { key: 'option1Name', label: 'Option1 Name', level: 'product', width: 14,
    help: 'For a product sold in options: what the buyer chooses, e.g. Brand. Needed on the first row only.', example: 'Brand' },
  { key: 'option1Value', label: 'Option1 Value', level: 'row', width: 16,
    help: "This row's choice, e.g. UltraTech.", example: 'UltraTech' },
  { key: 'option2Name', label: 'Option2 Name', level: 'product', width: 14, help: 'e.g. Grade.', example: 'Grade' },
  { key: 'option2Value', label: 'Option2 Value', level: 'row', width: 16, help: 'e.g. OPC 53.', example: 'OPC 53' },
  { key: 'option3Name', label: 'Option3 Name', level: 'product', width: 14, help: 'e.g. Pack size.', example: 'Pack size' },
  { key: 'option3Value', label: 'Option3 Value', level: 'row', width: 16, help: 'e.g. 50 kg bag.', example: '50 kg bag' },
  { key: 'sku', label: 'SKU', level: 'row', width: 18, text: true,
    help: "The product's SKU — or, on an option row, the option's. Letters, digits, - _ / . Blank: one is made.", example: 'CEM-UT-OPC53' },
  { key: 'price', label: 'Price', level: 'row', width: 10, type: 'number', required: 'new',
    help: 'Selling price per unit in ₹, including GST.', example: '450' },
  { key: 'mrp', label: 'MRP', level: 'row', width: 10, type: 'number',
    help: 'Optional; not lower than the price. none = remove.', example: '480' },
  { key: 'stockQty', label: 'Stock', level: 'row', width: 9, type: 'number',
    help: 'Units in stock (whole number). Blank on an existing product: unchanged.', example: '500' },
  { key: 'minOrderQty', label: 'Min Order', level: 'row', width: 10, type: 'number',
    help: 'Minimum order quantity. Blank: 1 (an option: the product\'s).', example: '10' },
  { key: 'bulkPrices', label: 'Bulk Prices', level: 'row', width: 20,
    help: 'Price per unit from a quantity: 50:440, 200:430 — or % off: 50:2%, 200:4%. none = remove.', example: '50:440, 200:430' },
  { key: 'deliveryCharge', label: 'Delivery Charge', level: 'row', width: 11, type: 'number',
    help: 'Per-unit delivery base in ₹. Blank: the delivery zone\'s default.', example: '' },
  { key: 'optionActive', label: 'Option Active', level: 'row', width: 10,
    help: 'yes / no — switch an option off without deleting it.', example: 'yes' },
  { key: 'optionImage', label: 'Option Image', level: 'row', width: 24,
    help: 'Photo shown when this option is picked (https://…). Optional.', example: '' },
  { key: 'sharedBulkPrices', label: 'Shared Bulk Discount', level: 'product', width: 14,
    help: 'Products with options only: a % discount for every option without its own bulk prices, e.g. 100:2%.', example: '' },
  { key: 'productSku', label: 'Product SKU', level: 'product', width: 18, text: true,
    help: 'SKU of a product sold in options (each option has its own SKU in the SKU column).', example: '' },
  { key: 'active', label: 'Published', level: 'product', width: 10,
    help: 'yes = live in the shop, no = draft. Blank: new → yes; existing → unchanged.', example: 'yes' },
  { key: 'featured', label: 'Featured', level: 'product', width: 9, help: 'yes / no.', example: 'no' },
  { key: 'badge', label: 'Badge', level: 'product', width: 14, help: 'Short label on the card, e.g. Bestseller. none = remove.', example: 'Fresh stock' },
  { key: 'imageUrl', label: 'Image URL', level: 'product', width: 30,
    help: 'Main photo (https://…). Tip: upload photos in the product form, or paste links to them here.', example: 'https://…/cement.jpg' },
  { key: 'imageUrls', label: 'Image URLs', level: 'product', width: 30, help: 'More photos, one per line.', example: '' },
  { key: 'tagline', label: 'Tagline', level: 'product', width: 24, help: 'One line under the name.', example: '' },
  { key: 'summary', label: 'Summary', level: 'product', width: 34, help: 'One or two lines shown near the price.', example: 'Fresh cement from leading brands.' },
  { key: 'description', label: 'Description', level: 'product', width: 40, help: 'Full description.', example: '' },
  { key: 'warranty', label: 'Warranty', level: 'product', width: 22, help: '', example: '' },
  { key: 'features', label: 'Features', level: 'product', width: 30, help: 'One per line (Alt+Enter in Excel), or separate with \\n.', example: 'Fresh stock\\nGST invoice' },
  { key: 'benefits', label: 'Benefits', level: 'product', width: 30, help: 'One per line.', example: '' },
  { key: 'applications', label: 'Applications', level: 'product', width: 30, help: 'One per line.', example: '' },
  { key: 'specifications', label: 'Specifications', level: 'product', width: 30, help: '"Label: value", one per line.', example: 'Pack: 50 kg' },
  { key: 'deliveryRestricted', label: 'Limited Delivery', level: 'product', width: 11,
    help: 'yes = sell only to the pincodes listed (others can ask for a quote).', example: '' },
  { key: 'allowedPincodes', label: 'Allowed Pincodes', level: 'product', width: 22, text: true,
    help: 'Pincodes, prefixes or ranges: 734001; 7340*; 734101-734105.', example: '' },
  { key: 'deliveryAreaNote', label: 'Delivery Area Note', level: 'product', width: 22, help: 'e.g. Siliguri & Jalpaiguri only.', example: '' },
];
const COLUMN = Object.fromEntries(COLUMNS.map(c => [c.key, c]));
const OPTION_KEYS = ['option1Name', 'option1Value', 'option2Name', 'option2Value', 'option3Name', 'option3Value'];
const ROW_KEYS = ['sku', 'price', 'mrp', 'stockQty', 'minOrderQty', 'bulkPrices', 'deliveryCharge', 'optionActive', 'optionImage'];

/** "Product Name", "product_name", "NAME " → "productname". */
export function normHeader(h) {
  return String(h ?? '').replace(/^﻿/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Header spellings (after normHeader) → column key. Includes Shopify export headers. */
const ALIASES = {
  handle: 'handle', urlhandle: 'handle', slug: 'handle', url: 'handle', productgroup: 'handle', group: 'handle', parent: 'handle',
  name: 'name', productname: 'name', product: 'name', title: 'name', itemname: 'name', item: 'name', productitle: 'name', producttitle: 'name', description1: 'name',
  category: 'category', categories: 'category', productcategory: 'category', cat: 'category', type: 'category', producttype: 'category',
  unit: 'unitLabel', unitlabel: 'unitLabel', uom: 'unitLabel', soldper: 'unitLabel', unitofmeasure: 'unitLabel', units: 'unitLabel', per: 'unitLabel',
  gstrate: 'gstRate', gst: 'gstRate', gstpercent: 'gstRate', gstpercentage: 'gstRate', tax: 'gstRate', taxrate: 'gstRate', gstslab: 'gstRate', igst: 'gstRate',
  hsn: 'hsnCode', hsncode: 'hsnCode', sac: 'hsnCode', saccode: 'hsnCode', hsnsac: 'hsnCode', hsnsaccode: 'hsnCode',
  option1name: 'option1Name', option1value: 'option1Value', option2name: 'option2Name', option2value: 'option2Value',
  option3name: 'option3Name', option3value: 'option3Value',
  sku: 'sku', skucode: 'sku', itemcode: 'sku', productcode: 'sku', partnumber: 'sku', partno: 'sku', variantsku: 'sku', optionsku: 'sku', code: 'sku',
  price: 'price', sellingprice: 'price', saleprice: 'price', rate: 'price', unitprice: 'price', variantprice: 'price', optionprice: 'price',
  priceinclgst: 'price', pricewithgst: 'price', priceincgst: 'price', priceinr: 'price', pricers: 'price', ourprice: 'price', offerprice: 'price',
  mrp: 'mrp', listprice: 'mrp', maximumretailprice: 'mrp', compareatprice: 'mrp', variantcompareatprice: 'mrp', optionmrp: 'mrp', mrpinr: 'mrp',
  stock: 'stockQty', stockqty: 'stockQty', quantity: 'stockQty', qty: 'stockQty', inventory: 'stockQty', inventoryqty: 'stockQty',
  variantinventoryqty: 'stockQty', optionstock: 'stockQty', stockquantity: 'stockQty', instock: 'stockQty', available: 'stockQty',
  minorder: 'minOrderQty', minorderqty: 'minOrderQty', moq: 'minOrderQty', minimumorder: 'minOrderQty',
  minimumorderquantity: 'minOrderQty', optionminorder: 'minOrderQty', minqty: 'minOrderQty',
  bulkprices: 'bulkPrices', bulkprice: 'bulkPrices', tierprices: 'bulkPrices', pricetiers: 'bulkPrices', quantityprices: 'bulkPrices',
  volumeprices: 'bulkPrices', optionbulkprices: 'bulkPrices', bulkpricing: 'bulkPrices', quantitydiscount: 'bulkPrices',
  deliverycharge: 'deliveryCharge', shipping: 'deliveryCharge', shippingcharge: 'deliveryCharge', deliveryfee: 'deliveryCharge', freight: 'deliveryCharge',
  optionactive: 'optionActive', variantactive: 'optionActive', optionenabled: 'optionActive', optionon: 'optionActive',
  optionimage: 'optionImage', variantimage: 'optionImage',
  sharedbulkdiscount: 'sharedBulkPrices', sharedbulkprices: 'sharedBulkPrices', productbulkdiscount: 'sharedBulkPrices',
  productsku: 'productSku', parentsku: 'productSku', basesku: 'productSku',
  published: 'active', active: 'active', isactive: 'active', status: 'active', live: 'active', visible: 'active',
  featured: 'featured', isfeatured: 'featured',
  badge: 'badge', label: 'badge', tag: 'badge', ribbon: 'badge',
  imageurl: 'imageUrl', image: 'imageUrl', photo: 'imageUrl', picture: 'imageUrl', img: 'imageUrl', imagesrc: 'imageUrl',
  mainimage: 'imageUrl', imagelink: 'imageUrl', photourl: 'imageUrl',
  imageurls: 'imageUrls', images: 'imageUrls', gallery: 'imageUrls', galleryimages: 'imageUrls', moreimages: 'imageUrls',
  additionalimages: 'imageUrls', photos: 'imageUrls',
  tagline: 'tagline', summary: 'summary', shortdescription: 'summary',
  description: 'description', desc: 'description', details: 'description', bodyhtml: 'description', body: 'description',
  longdescription: 'description', productdescription: 'description',
  warranty: 'warranty', guarantee: 'warranty',
  features: 'features', keyfeatures: 'features', benefits: 'benefits', applications: 'applications', uses: 'applications',
  specifications: 'specifications', specs: 'specifications', technicalspecifications: 'specifications', techspecs: 'specifications',
  deliveryrestricted: 'deliveryRestricted', limiteddelivery: 'deliveryRestricted', restricted: 'deliveryRestricted',
  allowedpincodes: 'allowedPincodes', pincodes: 'allowedPincodes', deliverypincodes: 'allowedPincodes', servicepincodes: 'allowedPincodes',
  deliveryareanote: 'deliveryAreaNote', deliveryarea: 'deliveryAreaNote', areanote: 'deliveryAreaNote',
};

/**
 * Plain columns read as options when the sheet has no OptionN columns — so a
 * price list like "Name | Brand | Grade | Price | Stock" just works.
 */
const OPTION_LIKE = new Set([
  'brand', 'make', 'manufacturer', 'grade', 'size', 'packsize', 'pack', 'packing', 'packaging', 'colour', 'color',
  'diameter', 'dia', 'thickness', 'length', 'width', 'height', 'weight', 'capacity', 'model', 'material', 'finish',
  'quality', 'variant', 'volume', 'gauge', 'shade', 'strength', 'variety', 'style', 'mesh', 'voltage', 'wattage',
]);

/** Column key for a header cell, or null. */
export function columnFor(header) {
  const h = normHeader(header);
  if (ALIASES[h]) return ALIASES[h];
  // "Option 1 Name", "Variant-2 value", "Attribute 3 value(s)" (WooCommerce)…
  const m = h.match(/^(?:option|attribute|variant|property)([123])(name|value|values)$/);
  if (m) return `option${m[1]}${m[2] === 'name' ? 'Name' : 'Value'}`;
  return null;
}

/* ─── Cell values ───────────────────────────────────────────────────────── */

const clean = (v) => String(v ?? '').replace(/ /g, ' ').trim();
const lower = (s) => clean(s).toLowerCase().replace(/\s+/g, ' ');
/** "none" / "-" in a cell clears that value. */
const isClear = (s) => /^(none|-|–|—)$/i.test(clean(s));
const up = (s) => String(s ?? '').trim().toUpperCase();

/** "₹4,200.50", "Rs. 420", "420/-", "1,00,000" → number; '' → undefined; anything else → NaN. */
export function parseNumber(v) {
  const s = clean(v).replace(/^(rs\.?|inr|₹)\s*/i, '').replace(/\/-$/, '').replace(/[₹,\s]/g, '');
  if (s === '') return undefined;
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return NaN;
  return Number(s);
}

/** yes/no, true/false, 1/0, y/n, active/draft…; '' → undefined; anything else → null. */
export function parseBool(v) {
  const s = lower(v);
  if (s === '') return undefined;
  if (['yes', 'y', 'true', '1', 'on', 'active', 'published', 'live', 'visible', 'enabled', 'show'].includes(s)) return true;
  if (['no', 'n', 'false', '0', 'off', 'draft', 'hidden', 'inactive', 'archived', 'disabled', 'unpublished', 'hide'].includes(s)) return false;
  return null;
}

/** Multi-line text: real line breaks or a literal "\n"; blank lines inside are kept (paragraphs). */
const textCell = (v) => clean(String(v ?? '').replace(/\r\n?/g, '\n').replace(/\\n/g, '\n'));
/** Shopify / WooCommerce descriptions are HTML: keep the words, paragraphs and list items. */
const HTML_TAG = /<\/?(p|br|div|li|ul|ol|strong|b|em|i|u|span|h[1-6]|table|tr|td|th)\b[^>]*>/i;
export function htmlToText(s) {
  return String(s ?? '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/\s*(p|div|h[1-6]|tr|ul|ol|table)\s*>/gi, '\n\n')
    .replace(/<\s*li\b[^>]*>/gi, '\n- ')
    .replace(/<\s*\/\s*(td|th)\s*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** A list: one item per line; blank lines dropped. */
const listCell = (v) => textCell(v).split('\n').map(x => x.trim()).filter(Boolean).join('\n');

/** Same rules as the server's SlugUtil, so a Handle becomes exactly the product's address. */
export function slugify(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '').replace(/[\s-]+/g, '-').replace(/^-+|-+$/g, '');
}

/** GST cell → '18' etc. Accepts 18, 18%, "Nil", and Excel percent cells (0.18). */
function gstValue(v) {
  const s = lower(v);
  if (['nil', 'exempt', 'exempted', 'zero'].includes(s)) return '0';
  const direct = normalizeGstRate(s);
  if (direct != null) return direct;
  const n = parseNumber(s.replace('%', ''));
  if (Number.isFinite(n) && n > 0 && n < 1) return normalizeGstRate(String(Math.round(n * 10000) / 100));
  return null;
}

const looksLikeUrl = (s) => /^(https?:\/\/|\/)/i.test(clean(s));
const quote = (s) => `“${s}”`;
const listOf = (a) => (a.length <= 2 ? a.join(' and ') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const rowsLabel = (nums) => (nums.length === 1 ? `Row ${nums[0]}` : `Rows ${nums.length > 6 ? `${nums.slice(0, 5).join(', ')}…` : nums.join(', ')}`);

/* ─── Sheet → product drafts ────────────────────────────────────────────── */

function findHeaderRow(rows) {
  let seen = 0;
  for (let i = 0; i < rows.length && seen < 10; i++) {
    if (isBlankRow(rows[i])) continue;
    seen++;
    const keys = rows[i].map(columnFor);
    if (['name', 'handle', 'sku', 'productSku'].some(k => keys.includes(k))) return i;
  }
  return -1;
}

/**
 * Spreadsheet rows (with a header row) → product drafts.
 * Returns { drafts, warnings, notices }. Throws when the sheet itself is unusable.
 *
 * A draft: { key, firstRow, rowNumbers, name, handle, productSku, fields,
 *   optionNames[], options[{ rowNumber, values[], sku, price, mrp, stockQty,
 *   minOrderQty, bulkPrices, deliveryCharge, image, active }], simple, attrs,
 *   errors[], warnings[] }.
 * Cell values: undefined = blank (keep), null = "none" (clear), else the value.
 */
export function parseProductSheet(rows, { maxRows = MAX_SHEET_ROWS } = {}) {
  if (!Array.isArray(rows) || rows.every(isBlankRow)) throw new Error('The sheet is empty.');
  const h = findHeaderRow(rows);
  if (h < 0) {
    const first = (rows.find(r => !isBlankRow(r)) || []).map(clean).filter(Boolean);
    throw new Error(`No “Name” or “SKU” column found. The first row has: ${first.slice(0, 12).map(x => quote(x)).join(', ')}. `
      + 'Put the column names (Name, Category, Price…) in the first row — or start from “Download template”.');
  }
  const header = rows[h].map(clean);
  const idx = {};
  const unknown = [];
  const repeated = [];
  header.forEach((text, i) => {
    if (!text) return;
    const key = columnFor(text);
    if (!key) unknown.push({ text, i });
    else if (key in idx) repeated.push(`${quote(text)} is skipped — ${quote(header[idx[key]])} already gives ${COLUMN[key].label}.`);
    else idx[key] = i;
  });
  const hasOptionColumns = OPTION_KEYS.some(k => k in idx);
  const attrCols = hasOptionColumns ? []
    : unknown.filter(u => OPTION_LIKE.has(normHeader(u.text))).map(u => ({ name: u.text.replace(/\s+/g, ' ').slice(0, 40), i: u.i }));
  const unused = unknown.filter(u => !attrCols.some(a => a.i === u.i)).map(u => u.text);

  const warnings = [];
  const notices = [];
  if (attrCols.length) {
    notices.push(`${listOf(attrCols.map(a => quote(a.name)))} ${attrCols.length === 1 ? 'is' : 'are'} read as options — rows with the same Name are one product sold in those options.`);
  }
  if (unused.length) {
    const optionish = unused.filter(u => OPTION_LIKE.has(normHeader(u)));
    warnings.push(`Not used: ${unused.slice(0, 12).map(quote).join(', ')}${unused.length > 12 ? '…' : ''}.`
      + (optionish.length ? ` To sell a product in several ${optionish.map(x => x.toLowerCase()).join(' / ')}s, put e.g. “${optionish[0]}” in Option1 Name and the choice in Option1 Value.` : ''));
  }
  warnings.push(...repeated);

  const data = [];
  for (let i = h + 1; i < rows.length; i++) if (!isBlankRow(rows[i])) data.push({ rowNumber: i + 1, r: rows[i] });
  if (!data.length) throw new Error('No product rows under the header row.');
  if (data.length > maxRows) throw new Error(`${data.length.toLocaleString('en-IN')} rows — upload at most ${maxRows.toLocaleString('en-IN')} at a time (split the sheet).`);

  const raw = (r, key) => (idx[key] != null ? clean(r[idx[key]]) : '');
  const ctx = { idx, raw, attrCols, hasOptionColumns };

  // Group rows into products: the same Handle, else the same Name. A row with
  // neither belongs to the product above it (Shopify-style option rows). A
  // sheet with neither column (a stock / price list by SKU): one row each.
  const bySkuOnly = !('name' in idx) && !('handle' in idx);
  const groups = [];
  const byKey = new Map();
  const nameToHandle = new Map();
  const orphans = [];
  let last = null;
  for (const row of data) {
    const handle = slugify(raw(row.r, 'handle'));
    const name = raw(row.r, 'name');
    let key = handle ? `h:${handle}` : name ? `n:${lower(name)}` : null;
    if (bySkuOnly) {
      const sku = up(raw(row.r, 'sku')) || up(raw(row.r, 'productSku'));
      if (!sku) { orphans.push(row.rowNumber); continue; }
      key = `s:${sku}:${row.rowNumber}`;
    }
    if (key?.startsWith('n:') && nameToHandle.has(key)) key = nameToHandle.get(key);
    if (handle && name && !nameToHandle.has(`n:${lower(name)}`)) nameToHandle.set(`n:${lower(name)}`, key);
    if (!key) {
      if (last) key = last.key;
      else { orphans.push(row.rowNumber); continue; }
    }
    let g = byKey.get(key);
    if (!g) { g = { key, rows: [] }; byKey.set(key, g); groups.push(g); }
    g.rows.push(row);
    last = g;
  }
  if (orphans.length) warnings.push(`${rowsLabel(orphans)} skipped — no ${bySkuOnly ? 'SKU' : 'Name or Handle'}.`);

  const drafts = groups.map(g => buildDraft(g, ctx));

  // SKUs must be unique across the file.
  const seen = new Map();
  for (const d of drafts) {
    const own = [];
    if (d.productSku) own.push([d.productSku, d.firstRow]);
    if (d.simple?.sku && d.simple.sku !== d.productSku) own.push([d.simple.sku, d.simple.rowNumber]);
    for (const o of d.options) if (o.sku) own.push([o.sku, o.rowNumber]);
    for (const [sku, row] of own) {
      const prev = seen.get(sku);
      if (!prev) seen.set(sku, { d, row });
      else if (prev.row !== row) d.errors.push(`Row ${row}: SKU ${sku} is also on row ${prev.row}${prev.d !== d ? ` (${prev.d.name || 'another product'})` : ''} — every SKU must be different.`);
    }
  }
  return { drafts, warnings, notices };
}

function buildDraft(g, ctx) {
  const { raw, idx } = ctx;
  const errors = [];
  const warnings = [];
  const firstRow = g.rows[0].rowNumber;
  const at = `Row ${firstRow}:`;

  // A product-level value: the first row that has it. A later row that
  // disagrees is pointed out (the first one is used).
  const firstValue = (key) => {
    let v = '', from = 0;
    for (const { rowNumber, r } of g.rows) {
      const x = raw(r, key);
      if (x === '') continue;
      if (v === '') { v = x; from = rowNumber; } else if (key !== 'imageUrl' && lower(x) !== lower(v)) {
        warnings.push(`Row ${rowNumber}: ${COLUMN[key].label} ${quote(x.length > 40 ? `${x.slice(0, 40)}…` : x)} differs from row ${from} — row ${from}'s is used.`);
      }
    }
    return v;
  };

  const CLEARABLE = new Set(['unitLabel', 'badge', 'deliveryAreaNote', 'description', 'summary', 'tagline', 'warranty', 'features',
    'benefits', 'applications', 'specifications', 'imageUrls', 'imageUrl', 'allowedPincodes', 'sharedBulkPrices']);
  const MULTILINE = ['description', 'summary', 'tagline', 'warranty'];
  const LISTS = ['features', 'benefits', 'applications', 'specifications', 'imageUrls', 'allowedPincodes'];
  const f = {};
  for (const col of COLUMNS) {
    if (col.level !== 'product' || !(col.key in idx)) continue;
    const v = firstValue(col.key);
    if (v === '') continue;
    if (isClear(v)) {
      if (CLEARABLE.has(col.key)) f[col.key] = null;
      else errors.push(`${at} ${quote(v)} isn't a valid ${col.label}.`);
      continue;
    }
    if (MULTILINE.includes(col.key)) f[col.key] = textCell(HTML_TAG.test(v) ? htmlToText(v) : v);
    else f[col.key] = LISTS.includes(col.key) ? listCell(v) : v.replace(/\s+/g, ' ');
  }

  if (f.handle !== undefined) {
    const s = slugify(f.handle);
    if (s) f.handle = s.slice(0, 200).replace(/-+$/, '');
    else { warnings.push(`${at} Handle ${quote(f.handle)} has no letters or digits — ignored.`); delete f.handle; }
  }
  const maxLen = (key, n) => {
    if (typeof f[key] === 'string' && f[key].length > n) errors.push(`${at} ${COLUMN[key].label} is ${f[key].length} characters — at most ${n}.`);
  };
  maxLen('name', 500); maxLen('category', 100); maxLen('badge', 100); maxLen('unitLabel', 24); maxLen('deliveryAreaNote', 255);
  maxLen('option1Name', 40); maxLen('option2Name', 40); maxLen('option3Name', 40);

  if (f.gstRate !== undefined && f.gstRate !== null) {
    const rate = gstValue(f.gstRate);
    if (rate == null) errors.push(`${at} GST Rate ${quote(f.gstRate)} isn't a GST rate — use 0, 5, 18 or 40 (or 3, 0.25).`);
    else {
      f.gstRate = rate;
      if (OLD_GST_RATES.includes(rate)) warnings.push(`${at} ${rate}% was a GST slab before 22 Sep 2025 — most such goods are now 5% or 18% (cement: 18%). Please check.`);
    }
  }
  if (f.hsnCode !== undefined) {
    const code = f.hsnCode.replace(/[\s.]/g, '');
    if (!/^\d{4,8}$/.test(code)) errors.push(`${at} HSN Code ${quote(f.hsnCode)} should be 4 to 8 digits (e.g. 2523).`);
    else f.hsnCode = code;
  }
  for (const k of ['active', 'featured', 'deliveryRestricted']) {
    if (f[k] === undefined) continue;
    const b = parseBool(f[k]);
    if (b === null || b === undefined) { errors.push(`${at} ${COLUMN[k].label} ${quote(f[k])} — use yes or no.`); delete f[k]; } else f[k] = b;
  }
  if (f.productSku !== undefined) {
    const s = f.productSku.toUpperCase();
    if (!SKU_RE.test(s)) errors.push(`${at} Product SKU ${quote(f.productSku)} may use only letters, digits, - _ / . (at most 64).`);
    f.productSku = s;
  }
  if (typeof f.sharedBulkPrices === 'string') {
    try {
      const tiers = parseTiers(f.sharedBulkPrices);
      if (tiers.some(t => !t.percent)) errors.push(`${at} Shared Bulk Discount must be percentages, e.g. 100:2%, 500:4% — fixed bulk prices go on each option's row.`);
      else f.sharedBulkPrices = normalizeTiers(f.sharedBulkPrices, null) || null;
    } catch (e) { errors.push(`${at} Shared Bulk Discount — ${e.message}`); }
  }
  if (typeof f.allowedPincodes === 'string') {
    const pr = parseRules(f.allowedPincodes);
    if (pr.invalid.length) errors.push(`${at} Allowed Pincodes: ${pr.invalid.slice(0, 5).map(quote).join(', ')} ${pr.invalid.length === 1 ? "isn't" : "aren't"} valid — use 734001, 734* or 734001-734015.`);
    else f.allowedPincodes = pr.normalized || null;
  }
  // Photos: a sheet may list one per row (Shopify does) — the first is the main photo, the rest join the gallery.
  const photos = [...new Set(g.rows.map(({ r }) => raw(r, 'imageUrl')).filter(x => x && !isClear(x)))];
  if (photos.length > 1) {
    f.imageUrl = photos[0];
    const gallery = typeof f.imageUrls === 'string' ? f.imageUrls.split('\n') : [];
    f.imageUrls = [...new Set([...gallery, ...photos.slice(1)])].join('\n');
  }
  for (const k of ['imageUrl']) {
    if (typeof f[k] === 'string' && !looksLikeUrl(f[k])) warnings.push(`${at} ${COLUMN[k].label} ${quote(f[k])} isn't a web link (https://…) — the photo won't show.`);
  }

  const draft = {
    key: g.key, firstRow, rowNumbers: g.rows.map(x => x.rowNumber),
    name: f.name || '', handle: f.handle || '', productSku: f.productSku || '', fields: f,
    optionNames: [], options: [], simple: null, attrs: null, errors, warnings,
  };

  // Option values of a row: OptionN Value columns, or the option-like columns.
  const optionNamesFromSheet = [1, 2, 3].map(i => f[`option${i}Name`] || '');
  const valuesOf = (r) => (ctx.attrCols.length
    ? ctx.attrCols.map(a => clean(r[a.i]))
    : [1, 2, 3].map(i => { const v = raw(r, `option${i}Value`); return /^default title$/i.test(v) ? '' : v; }));
  const optionRows = g.rows.filter(({ r }) => valuesOf(r).some(Boolean));
  const hasRowData = (r) => ROW_KEYS.some(k => raw(r, k) !== '');

  const readRow = ({ rowNumber, r }) => {
    const where = `Row ${rowNumber}:`;
    const o = { rowNumber };
    const num = (key, { int = false, min = 0, clearable = false } = {}) => {
      const cell = raw(r, key);
      if (cell === '') return undefined;
      if (isClear(cell)) {
        if (clearable) return null;
        errors.push(`${where} ${COLUMN[key].label} ${quote(cell)} — enter a number.`);
        return undefined;
      }
      const n = parseNumber(cell);
      if (!Number.isFinite(n) || n < min || (int && !Number.isInteger(n)) || n >= 1e10) {
        errors.push(`${where} ${COLUMN[key].label} ${quote(cell)} — enter ${int ? 'a whole number' : 'a number'}${min > 0 ? ` of at least ${min}` : ''}.`);
        return undefined;
      }
      return int ? n : Math.round(n * 100) / 100;
    };
    o.price = num('price');
    if (o.price === 0) { errors.push(`${where} Price must be more than ₹0.`); o.price = undefined; }
    o.mrp = num('mrp', { clearable: true });
    if (o.mrp === 0) o.mrp = null;
    o.stockQty = num('stockQty', { int: true });
    o.minOrderQty = num('minOrderQty', { int: true, min: 1, clearable: true });
    o.deliveryCharge = num('deliveryCharge', { clearable: true });
    const sku = raw(r, 'sku').toUpperCase();
    if (sku && !SKU_RE.test(sku)) errors.push(`${where} SKU ${quote(sku)} may use only letters, digits, - _ / . (at most 64).`);
    o.sku = sku;
    const tiers = raw(r, 'bulkPrices');
    if (tiers === '') o.bulkPrices = undefined;
    else if (isClear(tiers) || tiers === '0') o.bulkPrices = null;
    else {
      o.bulkPrices = tiers;
      try { parseTiers(tiers); } catch (e) { errors.push(`${where} Bulk Prices — ${e.message}`); o.bulkPrices = undefined; }
    }
    const img = raw(r, 'optionImage');
    o.image = img === '' ? undefined : isClear(img) ? null : img;
    if (o.image && !looksLikeUrl(o.image)) warnings.push(`${where} Option Image ${quote(o.image)} isn't a web link (https://…).`);
    const act = raw(r, 'optionActive');
    o.active = act === '' ? undefined : parseBool(act);
    if (o.active === null) { errors.push(`${where} Option Active ${quote(act)} — use yes or no.`); o.active = undefined; }
    if (o.price !== undefined && o.mrp != null && o.mrp < o.price) {
      errors.push(`${where} MRP (${rupees(o.mrp)}) can't be lower than the price (${rupees(o.price)}).`);
    }
    return o;
  };

  const attrMode = ctx.attrCols.length > 0;
  const singleAttrRow = attrMode && optionRows.length === 1;
  if (optionRows.length && !singleAttrRow) {
    let names, pick;
    if (attrMode) {
      const used = ctx.attrCols.map((a, i) => i).filter(i => optionRows.some(({ r }) => valuesOf(r)[i]));
      if (used.length > 3) errors.push(`${at} ${listOf(used.map(i => quote(ctx.attrCols[i].name)))} — a product can have at most 3 options. Combine some (e.g. "Grade" and "Pack size" into one) or leave the extra ones blank.`);
      const keep = used.slice(0, 3);
      names = keep.map(i => ctx.attrCols[i].name);
      pick = (r) => { const v = valuesOf(r); return keep.map(i => v[i]); };
    } else {
      let axes = 0;
      for (let i = 1; i <= 3; i++) {
        if (optionNamesFromSheet[i - 1] || optionRows.some(({ r }) => valuesOf(r)[i - 1])) axes = i;
      }
      names = optionNamesFromSheet.slice(0, axes);
      pick = (r) => valuesOf(r).slice(0, axes);
    }
    draft.optionNames = names;
    const lowerNames = names.filter(Boolean).map(n => n.toLowerCase());
    if (new Set(lowerNames).size !== lowerNames.length) errors.push(`${at} two options have the same name (${names.join(', ')}).`);
    if (optionRows.length > MAX_OPTIONS) errors.push(`${at} ${optionRows.length} options — a product can have at most ${MAX_OPTIONS}.`);

    const combos = new Map();
    for (const row of optionRows) {
      const o = readRow(row);
      o.values = pick(row.r);
      o.values.forEach((v, i) => {
        if (!v) errors.push(`Row ${row.rowNumber}: fill ${attrMode ? quote(names[i]) : `Option${i + 1} Value`}${!attrMode && names[i] ? ` (${names[i]})` : ''}.`);
        else if (v.length > 80) errors.push(`Row ${row.rowNumber}: ${quote(`${v.slice(0, 30)}…`)} — an option value can be at most 80 characters.`);
      });
      const ck = o.values.map(v => lower(v)).join('\u0001');
      if (combos.has(ck)) errors.push(`Row ${row.rowNumber}: ${o.values.filter(Boolean).join(' · ')} is already on row ${combos.get(ck)}.`);
      else combos.set(ck, row.rowNumber);
      draft.options.push(o);
    }
    const stray = g.rows.filter(row => !optionRows.includes(row) && hasRowData(row.r)).map(row => row.rowNumber);
    if (stray.length) warnings.push(`${rowsLabel(stray)}: price/stock ignored — this product is sold in options, so those go on each option's row.`);
  } else {
    const content = g.rows.filter(({ r }) => hasRowData(r));
    if (content.length > 1) {
      errors.push(`${rowsLabel(draft.rowNumbers)} all describe ${quote(draft.name || draft.handle || 'the same product')}. `
        + (ctx.attrCols.length || !ctx.hasOptionColumns
          ? 'For a product sold in options, add Option1 Name / Option1 Value columns (see the template); otherwise give each product its own name.'
          : 'For a product sold in options, fill Option1 Value on each row; otherwise give each product its own name.'));
    }
    draft.simple = readRow(content[0] || g.rows[0]);
    if (singleAttrRow) {
      const v = valuesOf(optionRows[0].r);
      draft.attrs = ctx.attrCols.map((a, i) => ({ name: a.name, value: v[i] })).filter(x => x.value);
    }
    if (f.sharedBulkPrices) warnings.push(`${at} Shared Bulk Discount is only for products sold in options — use Bulk Prices.`);
    const named = optionNamesFromSheet.filter(n => n && lower(n) !== 'title');
    if (named.length) warnings.push(`${at} ${listOf(named.map(quote))} given but no option values — saved as a single product.`);
  }
  return draft;
}

/* ─── Existing products ─────────────────────────────────────────────────── */

/**
 * Finds the existing product each draft refers to, decides what happens to it,
 * and plans the save (a dry run) so the preview shows every problem and change.
 *   mode 'upsert' — add new products and update existing ones (default)
 *        'create' — only add new products; existing ones are skipped
 *        'update' — only update existing products; new ones are skipped
 * Sets on each draft: existing, matchedBy, action ('create'|'update'|'skip'),
 * skipReason, matchErrors[], matchNotes[], plan { request, errors, notes, changes }.
 * Rows of a stock list by SKU that are options of one product are combined
 * into one draft — the array is updated in place and returned.
 */
export function matchDrafts(drafts, catalogue, { mode = 'upsert' } = {}) {
  const list = (Array.isArray(catalogue) ? catalogue : []).filter(p => p && p.id);
  const bySku = new Map(), bySlug = new Map(), byName = new Map(), byOptionSku = new Map();
  for (const p of list) {
    if (p.sku) bySku.set(up(p.sku), p);
    if (p.slug) bySlug.set(String(p.slug).toLowerCase(), p);
    const nk = lower(p.name);
    if (nk) byName.set(nk, [...(byName.get(nk) || []), p]);
    for (const v of p.variants || []) if (v?.sku) byOptionSku.set(up(v.sku), p);
  }
  // A stock / price list by SKU: a row whose SKU is an option's updates that
  // option; rows for options of the same product are combined into one.
  const combined = [];
  const viaOption = new Map();
  for (const d of drafts) {
    const sku = d.simple?.sku;
    const owner = !d.name && !d.handle && sku && !bySku.get(sku) ? byOptionSku.get(sku) : null;
    if (!owner) { combined.push(d); continue; }
    const names = [owner.option1Name, owner.option2Name, owner.option3Name].filter(Boolean);
    const v = owner.variants.find(x => x && up(x.sku) === sku);
    const option = { ...d.simple, values: names.map((_, i) => v[`option${i + 1}`] || '') };
    const target = viaOption.get(owner.id);
    if (target) {
      target.options.push(option);
      target.rowNumbers.push(...d.rowNumbers);
      target.errors.push(...d.errors);
      target.warnings.push(...d.warnings);
    } else {
      Object.assign(d, { options: [option], optionNames: names, simple: null });
      viaOption.set(owner.id, d);
      combined.push(d);
    }
  }
  drafts.splice(0, drafts.length, ...combined);

  const claimed = new Map();
  for (const d of drafts) {
    d.matchErrors = [];
    d.matchNotes = [];
    let p = null;
    if (d.productSku && bySku.get(d.productSku)) { p = bySku.get(d.productSku); d.matchedBy = 'Product SKU'; }
    if (!p && d.simple?.sku && bySku.get(d.simple.sku)) { p = bySku.get(d.simple.sku); d.matchedBy = 'SKU'; }
    if (!p && d.handle && bySlug.get(d.handle)) { p = bySlug.get(d.handle); d.matchedBy = 'Handle'; }
    // A Handle is the product's identity: one that no product has means a new
    // product, even if its name or an option's SKU looks like an existing one.
    if (!p && !d.handle) {
      const owners = [...new Set(d.options.map(o => o.sku && byOptionSku.get(o.sku)).filter(Boolean))];
      if (owners.length > 1) d.matchErrors.push(`The option SKUs belong to different products (${listOf(owners.map(o => quote(o.name)))}).`);
      else if (owners.length === 1) { p = owners[0]; d.matchedBy = 'option SKU'; }
    }
    if (!p && !d.handle && d.name) {
      const same = byName.get(lower(d.name)) || [];
      if (same.length === 1) { p = same[0]; d.matchedBy = 'Name'; } else if (same.length > 1) {
        d.matchErrors.push(`${same.length} products are called ${quote(d.name)} — add the Handle or SKU column so the right one is updated.`);
      }
    }
    if (p && d.handle && String(p.slug || '').toLowerCase() !== d.handle) {
      d.matchErrors.push(`Row ${d.firstRow}: the ${d.matchedBy} belongs to ${quote(p.name)}, whose Handle is ${p.slug} — not ${d.handle}. Use ${p.slug} (a product's web address can't be changed here), or fix the ${d.matchedBy}.`);
    }
    if (p) {
      const other = claimed.get(p.id);
      if (other) d.matchErrors.push(`${rowsLabel(d.rowNumbers)} and ${rowsLabel(other.rowNumbers).toLowerCase()} both update ${quote(p.name)} — keep a product's rows together (same Handle or Name).`);
      else claimed.set(p.id, d);
      if (d.name && lower(d.name) !== lower(p.name)) d.matchNotes.push(`Found ${quote(p.name)} by ${d.matchedBy} — it will be renamed ${quote(d.name)}.`);
    }
    d.existing = p;
    d.action = p ? (mode === 'create' ? 'skip' : 'update') : (mode === 'update' ? 'skip' : 'create');
    d.skipReason = d.action !== 'skip' ? ''
      : p ? 'Already in your catalogue — only new products are being added.'
        : 'Not in your catalogue — only existing products are being updated.';

    resolveAttributes(d, p);

    // SKUs already used by OTHER products would be refused by the server.
    const clash = (sku, where) => {
      const prod = bySku.get(sku);
      if (prod && prod.id !== p?.id) d.matchErrors.push(`${where} SKU ${sku} is already used by ${quote(prod.name)}.`);
      const owner = byOptionSku.get(sku);
      if (owner && owner.id !== p?.id) d.matchErrors.push(`${where} SKU ${sku} is already used by an option of ${quote(owner.name)}.`);
    };
    if (d.productSku) clash(d.productSku, `Row ${d.firstRow}: Product`);
    if (d.simple?.sku && d.simple.sku !== d.productSku) clash(d.simple.sku, `Row ${d.simple.rowNumber}:`);
    const ownSku = d.productSku || up(p?.sku);
    for (const o of d.options) {
      if (!o.sku) continue;
      if (ownSku && o.sku === ownSku) d.matchErrors.push(`Row ${o.rowNumber}: SKU ${o.sku} is the product's own SKU — give each option its own (or leave it blank to make one).`);
      else clash(o.sku, `Row ${o.rowNumber}:`);
    }

    if (d.action === 'create' && !d.name && !d.handle) {
      // A row known only by its SKU, and no product has that SKU.
      d.matchErrors.push(`Row ${d.firstRow}: no product or option has SKU ${d.productSku || d.simple?.sku || '—'}. To add it as a new product, add Name and Category columns.`);
      d.plan = null;
      continue;
    }
    d.plan = d.action === 'create' ? planCreate(d) : d.action === 'update' ? planUpdate(d, p) : null;
  }
  return drafts;
}

/**
 * A single row with Brand / Grade… values: one option of an existing product
 * sold in options — otherwise a single product, the values added to its
 * Specifications ("Brand: UltraTech").
 */
function resolveAttributes(d, p) {
  if (!d.attrs || !d.attrs.length || !d.simple) return;
  const current = [p?.option1Name, p?.option2Name, p?.option3Name].filter(Boolean);
  if (p && Array.isArray(p.variants) && p.variants.length && current.length) {
    const byName = new Map(d.attrs.map(a => [a.name.toLowerCase(), a.value]));
    const values = current.map(n => byName.get(n.toLowerCase()) || '');
    const missing = current.filter((n, i) => !values[i]);
    const extra = d.attrs.filter(a => !current.some(n => n.toLowerCase() === a.name.toLowerCase()));
    if (missing.length || extra.length) {
      d.matchErrors.push(`Row ${d.simple.rowNumber}: ${quote(p.name)} is sold by ${listOf(current)} — fill ${listOf(current.map(quote))}${extra.length ? ` (not ${listOf(extra.map(a => quote(a.name)))})` : ''}.`);
      return;
    }
    d.options = [{ ...d.simple, values }];
    d.optionNames = current;
    d.simple = null;
    return;
  }
  const base = d.fields.specifications !== undefined ? (d.fields.specifications || '') : (p?.specifications || '');
  const lines = base ? base.split('\n') : [];
  for (const a of d.attrs) {
    const i = lines.findIndex(l => l.toLowerCase().startsWith(`${a.name.toLowerCase()}:`));
    const line = `${a.name}: ${a.value}`;
    if (i >= 0) lines[i] = line; else lines.push(line);
  }
  d.fields.specifications = lines.join('\n');
  d.matchNotes.push(`${listOf(d.attrs.map(a => `${a.name}: ${a.value}`))} added to Specifications.`);
}

/** Everything that stops a draft from being saved. */
export const draftProblems = (d) => [...(d.errors || []), ...(d.matchErrors || []), ...(d.plan?.errors || [])];
/** Warnings and notes to show (nothing that blocks). */
export const draftNotes = (d) => [...(d.warnings || []), ...(d.matchNotes || []), ...(d.plan?.notes || [])];
export const isImportable = (d) => (d.action === 'create' || d.action === 'update') && draftProblems(d).length === 0;

/* ─── Planning the save requests ────────────────────────────────────────── */

/** The current product as the complete save request the edit form would send. */
export function productToRequest(p) {
  return {
    name: p.name,
    sku: p.sku || undefined,
    category: p.category,
    description: p.description || '',
    price: Number(p.price),
    mrp: p.mrp != null && Number(p.mrp) > 0 ? Number(p.mrp) : null,
    gstRate: p.gstRate != null && p.gstRate !== '' ? Number(p.gstRate) : undefined,
    hsnCode: p.hsnCode || undefined,
    stockQty: Number(p.stockQty) || 0,
    // The stock this request was read at: the server applies only the change,
    // so units sold during the import stay sold.
    stockQtyBase: Number(p.stockQty) || 0,
    minOrderQty: Number(p.minOrderQty) || 1,
    deliveryCharge: p.deliveryCharge != null && p.deliveryCharge !== '' ? Number(p.deliveryCharge) : null,
    deliveryRestricted: Boolean(p.deliveryRestricted),
    allowedPincodes: p.allowedPincodes || '',
    deliveryAreaNote: p.deliveryAreaNote || '',
    badge: p.badge || '',
    imageUrl: p.imageUrl || '',
    featured: Boolean(p.featured),
    active: p.active !== false,
    tagline: p.tagline || '',
    summary: p.summary || '',
    warranty: p.warranty || '',
    imageUrls: p.imageUrls || '',
    features: p.features || '',
    benefits: p.benefits || '',
    applications: p.applications || '',
    specifications: p.specifications || '',
    unitLabel: p.unitLabel || '',
    priceTiers: p.priceTiers || '',
  };
}

function variantToRequest(v) {
  return {
    id: v.id,
    sku: v.sku || undefined,
    option1: v.option1 || null,
    option2: v.option2 || null,
    option3: v.option3 || null,
    price: Number(v.price),
    mrp: v.mrp != null && Number(v.mrp) > 0 ? Number(v.mrp) : null,
    stockQty: Number(v.stockQty) || 0,
    stockQtyBase: Number(v.stockQty) || 0,
    minOrderQty: v.minOrderQty != null ? Number(v.minOrderQty) : null,
    priceTiers: v.priceTiers || '',
    deliveryCharge: v.deliveryCharge != null ? Number(v.deliveryCharge) : null,
    imageUrl: v.imageUrl || null,
    active: v.active !== false,
  };
}

/** Product-level cells applied onto a request (undefined = keep, null = clear). */
function applyFields(req, f) {
  const TEXT = ['name', 'category', 'description', 'summary', 'tagline', 'warranty', 'badge', 'imageUrl', 'imageUrls', 'features',
    'benefits', 'applications', 'specifications', 'deliveryAreaNote', 'unitLabel'];
  for (const k of TEXT) {
    if (f[k] === undefined) continue;
    if (f[k] === null) { if (k !== 'name' && k !== 'category') req[k] = ''; } else req[k] = f[k];
  }
  if (f.hsnCode) req.hsnCode = f.hsnCode;
  if (f.gstRate != null) req.gstRate = Number(f.gstRate);
  if (typeof f.active === 'boolean') req.active = f.active;
  if (typeof f.featured === 'boolean') req.featured = f.featured;
  if (f.allowedPincodes !== undefined) req.allowedPincodes = f.allowedPincodes || '';
  if (typeof f.deliveryRestricted === 'boolean') req.deliveryRestricted = f.deliveryRestricted;
  else if (f.allowedPincodes) req.deliveryRestricted = true;
  if (f.productSku) req.sku = f.productSku;
  return req;
}

/** Bulk prices checked against the unit price; returns the canonical text or null. */
function checkTiers(text, price, where, errors) {
  if (text == null || text === '') return null;
  try {
    return normalizeTiers(text, price == null || Number.isNaN(Number(price)) ? null : Number(price));
  } catch (e) {
    errors.push(`${where} Bulk Prices — ${e.message}`);
    return null;
  }
}
const percentOnly = (t) => { const ts = safeTiers(t); return ts.length > 0 && ts.every(x => x.percent); };
const lowestPrice = (rows) => {
  const live = rows.filter(r => r.active !== false && Number(r.price) > 0);
  const prices = (live.length ? live : rows).map(r => Number(r.price)).filter(n => n > 0);
  return prices.length ? Math.min(...prices) : null;
};

function pincodeCheck(req, at, errors) {
  if (!req.deliveryRestricted) return;
  if (!parseRules(req.allowedPincodes).valid.length) {
    errors.push(`${at} Limited Delivery is on but no Allowed Pincodes are listed — add them, or set Limited Delivery to no.`);
  }
}

/** The save request for a NEW product, with any problems. */
export function planCreate(d) {
  const f = d.fields;
  const errors = [];
  const notes = [];
  const at = `Row ${d.firstRow}:`;
  if (!d.name) errors.push(`${at} Name is required for a new product.`);
  if (!f.category) errors.push(`${at} Category is required for a new product.`);
  const req = {
    name: d.name,
    slug: d.handle || undefined,
    category: f.category || '',
    description: f.description || '',
    summary: f.summary || '',
    tagline: f.tagline || '',
    warranty: f.warranty || '',
    features: f.features || '',
    benefits: f.benefits || '',
    applications: f.applications || '',
    specifications: f.specifications || '',
    imageUrl: f.imageUrl || '',
    imageUrls: f.imageUrls || '',
    badge: f.badge || '',
    unitLabel: f.unitLabel || '',
    gstRate: f.gstRate != null ? Number(f.gstRate) : undefined,
    hsnCode: f.hsnCode || undefined,
    featured: f.featured === true,
    active: f.active !== false,
    deliveryRestricted: typeof f.deliveryRestricted === 'boolean' ? f.deliveryRestricted : Boolean(f.allowedPincodes),
    allowedPincodes: f.allowedPincodes || '',
    deliveryAreaNote: f.deliveryAreaNote || '',
    minOrderQty: 1,
    deliveryCharge: null,
    priceTiers: '',
  };
  pincodeCheck(req, at, errors);
  if (d.options.length) {
    const names = d.optionNames;
    names.forEach((n, i) => { if (!n) errors.push(`${at} give Option${i + 1} a name (e.g. ${EXAMPLE_OPTION_NAMES[i]}) in “Option${i + 1} Name”.`); });
    req.option1Name = names[0] || null;
    req.option2Name = names[1] || null;
    req.option3Name = names[2] || null;
    req.sku = d.productSku || undefined;
    req.priceTiers = f.sharedBulkPrices || '';
    req.variants = d.options.map(o => {
      const where = `Row ${o.rowNumber}:`;
      if (o.price === undefined) errors.push(`${where} Price is required for a new option (${o.values.filter(Boolean).join(' · ')}).`);
      return {
        sku: o.sku || undefined,
        option1: o.values[0] || null,
        option2: o.values[1] || null,
        option3: o.values[2] || null,
        price: o.price,
        mrp: o.mrp ?? null,
        stockQty: o.stockQty ?? 0,
        minOrderQty: o.minOrderQty ?? null,
        priceTiers: o.price !== undefined ? (checkTiers(o.bulkPrices, o.price, where, errors) || '') : '',
        deliveryCharge: o.deliveryCharge ?? null,
        imageUrl: o.image || null,
        active: o.active !== false,
      };
    });
    req.price = lowestPrice(req.variants) ?? 1;
    req.stockQty = 0;
  } else {
    const s = d.simple || {};
    if (s.price === undefined) errors.push(`${at} Price is required for a new product.`);
    req.sku = s.sku || d.productSku || undefined;
    req.price = s.price;
    req.mrp = s.mrp ?? null;
    req.stockQty = s.stockQty ?? 0;
    req.minOrderQty = s.minOrderQty ?? 1;
    req.deliveryCharge = s.deliveryCharge ?? null;
    req.priceTiers = s.price !== undefined ? (checkTiers(s.bulkPrices, s.price, at, errors) || '') : '';
  }
  return { request: req, errors, notes, changes: [] };
}

/**
 * The save request for an EXISTING product: what it has now, with the filled-in
 * cells applied. Options in the sheet are updated (found by SKU, else by their
 * values) or added; options not in the sheet are kept as they are.
 */
export function planUpdate(d, p) {
  const f = d.fields;
  const errors = [];
  const notes = [];
  const at = `Row ${d.firstRow}:`;
  const req = applyFields(productToRequest(p), f);
  pincodeCheck(req, at, errors);
  const existing = (Array.isArray(p.variants) ? p.variants : []).filter(Boolean);
  const current = [p.option1Name, p.option2Name, p.option3Name].map(n => String(n || '').trim()).filter(Boolean);

  if (d.options.length) {
    const axes = d.optionNames.length;
    const names = d.optionNames.map((n, i) => n || (existing.length ? current[i] || '' : ''));
    if (existing.length && current.length !== axes) {
      errors.push(`${at} ${quote(p.name)} is sold by ${listOf(current)} — fill ${current.length === 1 ? 'that option' : `all ${current.length} options`} on each row.`);
    } else if (existing.length && names.some((n, i) => n && n.toLowerCase() !== current[i].toLowerCase())) {
      errors.push(`${at} the option names (${names.join(', ')}) don't match ${quote(p.name)}'s (${current.join(', ')}) — use the same names in the same order, or change the options in the product form.`);
    }
    names.forEach((n, i) => { if (!n) errors.push(`${at} give Option${i + 1} a name (e.g. ${EXAMPLE_OPTION_NAMES[i]}) in “Option${i + 1} Name”.`); });
    req.option1Name = names[0] || null;
    req.option2Name = names[1] || null;
    req.option3Name = names[2] || null;

    const rows = existing.map(variantToRequest);
    const byId = new Map(rows.map(r => [r.id, r]));
    const used = new Set();
    for (const o of d.options) {
      const where = `Row ${o.rowNumber}:`;
      const match = findOption(existing, o, used);
      const row = match ? byId.get(match.id) : {
        sku: undefined, option1: null, option2: null, option3: null, price: undefined, mrp: null,
        stockQty: 0, minOrderQty: null, priceTiers: '', deliveryCharge: null, imageUrl: null, active: true,
      };
      if (match) used.add(match.id);
      [row.option1, row.option2, row.option3] = [o.values[0] || null, o.values[1] || null, o.values[2] || null];
      if (o.sku) row.sku = o.sku;
      if (o.price !== undefined) row.price = o.price;
      if (!match && o.price === undefined) errors.push(`${where} Price is required for a new option (${o.values.filter(Boolean).join(' · ')}).`);
      if (o.mrp !== undefined) row.mrp = o.mrp;
      if (o.stockQty !== undefined) row.stockQty = o.stockQty;
      if (o.minOrderQty !== undefined) row.minOrderQty = o.minOrderQty;
      if (o.deliveryCharge !== undefined) row.deliveryCharge = o.deliveryCharge;
      if (o.image !== undefined) row.imageUrl = o.image;
      if (o.active !== undefined) row.active = o.active;
      if (o.bulkPrices === null) row.priceTiers = '';
      else if (o.bulkPrices !== undefined) {
        if (row.price !== undefined) row.priceTiers = checkTiers(o.bulkPrices, row.price, where, errors) ?? row.priceTiers;
      } else if (row.priceTiers && row.price !== undefined) {
        try { normalizeTiers(row.priceTiers, row.price); } catch {
          notes.push(`${where} bulk prices ${row.priceTiers} removed — they're not below the new price ${rupees(row.price)}.`);
          row.priceTiers = '';
        }
      }
      if (row.mrp != null && row.price !== undefined && Number(row.mrp) < Number(row.price)) {
        errors.push(`${where} the MRP ${rupees(row.mrp)} is below the price ${rupees(row.price)} — put the new MRP in the MRP column (or none to remove it).`);
      }
      if (!match) rows.push(row);
    }
    const combos = new Map();
    for (const r of rows) {
      const k = [r.option1, r.option2, r.option3].map(v => lower(v)).join('\u0001');
      if (combos.has(k)) errors.push(`${at} two options would both be ${[r.option1, r.option2, r.option3].filter(Boolean).join(' · ')}.`);
      combos.set(k, true);
    }
    if (rows.length > MAX_OPTIONS) errors.push(`${at} ${rows.length} options — a product can have at most ${MAX_OPTIONS}.`);
    req.variants = rows;
    req.price = lowestPrice(rows.filter(r => r.price !== undefined)) ?? (Number(p.price) || 1);
    if (f.sharedBulkPrices !== undefined) req.priceTiers = f.sharedBulkPrices || '';
    else if (req.priceTiers && !percentOnly(req.priceTiers)) {
      notes.push(`Bulk prices ${req.priceTiers} removed — a product sold in options can only have a % discount for all options (set bulk prices on each option).`);
      req.priceTiers = '';
    }
    if (!existing.length) notes.push(`${quote(p.name)} will be sold in options: ${names.filter(Boolean).join(', ')}.`);
  } else if (existing.length) {
    const s = d.simple || {};
    if (['price', 'mrp', 'stockQty', 'minOrderQty', 'bulkPrices', 'deliveryCharge'].some(k => s[k] !== undefined) || (s.sku && s.sku !== up(p.sku))) {
      errors.push(`${at} ${quote(p.name)} is sold in options — put prices and stock on one row per option (with ${listOf(current)}).`);
    }
    if (f.sharedBulkPrices !== undefined) req.priceTiers = f.sharedBulkPrices || '';
    // No "variants" in the request → the server keeps the options as they are.
  } else {
    const s = d.simple || {};
    if (s.sku) req.sku = s.sku;
    if (s.price !== undefined) req.price = s.price;
    if (s.mrp !== undefined) req.mrp = s.mrp;
    if (s.stockQty !== undefined) req.stockQty = s.stockQty;
    if (s.minOrderQty !== undefined) req.minOrderQty = s.minOrderQty ?? 1;
    if (s.deliveryCharge !== undefined) req.deliveryCharge = s.deliveryCharge;
    if (s.bulkPrices === null) req.priceTiers = '';
    else if (s.bulkPrices !== undefined) req.priceTiers = checkTiers(s.bulkPrices, req.price, at, errors) ?? req.priceTiers;
    else if (req.priceTiers) {
      try { normalizeTiers(req.priceTiers, req.price); } catch {
        notes.push(`Bulk prices ${req.priceTiers} removed — they're not below the new price ${rupees(req.price)}.`);
        req.priceTiers = '';
      }
    }
    if (req.mrp != null && Number(req.mrp) < Number(req.price)) {
      errors.push(`${at} the MRP ${rupees(req.mrp)} is below the price ${rupees(req.price)} — put the new MRP in the MRP column (or none to remove it).`);
    }
  }
  return { request: req, errors, notes, changes: describeChanges(p, req) };
}

/** The option a row refers to: same SKU, else the same option values. */
function findOption(existing, o, used) {
  const free = existing.filter(v => v && !used.has(v.id));
  if (o.sku) {
    const bySku = free.find(v => v.sku && up(v.sku) === o.sku);
    if (bySku) return bySku;
  }
  const key = o.values.map(v => lower(v)).join('\u0001');
  return free.find(v => [v.option1, v.option2, v.option3].slice(0, o.values.length).map(x => lower(x)).join('\u0001') === key
    && [v.option1, v.option2, v.option3].slice(o.values.length).every(x => !x)) || null;
}

const same = (a, b) => String(a ?? '').trim() === String(b ?? '').trim();
const sameNum = (a, b) => {
  const x = a == null || a === '' ? null : Math.round(Number(a) * 100);
  const y = b == null || b === '' ? null : Math.round(Number(b) * 100);
  return x === y;
};
const canonTiers = (t) => safeTiers(t).map(x => `${x.minQty}:${x.value}${x.percent ? '%' : ''}`).join(', ');
const pins = (t) => parseRules(t || '').normalized;

/** What a save would change, in plain words (empty = nothing to save). */
export function describeChanges(p, req) {
  const out = [];
  if (!same(p.name, req.name)) out.push(`Name → ${quote(req.name)}`);
  if (!same(p.category, req.category)) out.push(`Category → ${req.category}`);
  if (req.sku && !same(up(p.sku), up(req.sku))) out.push(`SKU → ${req.sku}`);
  const hadOptions = Array.isArray(p.variants) && p.variants.length > 0;
  if (!req.variants && !hadOptions) {
    if (!sameNum(p.price, req.price)) out.push(`Price ${rupees(p.price)} → ${rupees(req.price)}`);
    if (!sameNum(p.mrp && Number(p.mrp) > 0 ? p.mrp : null, req.mrp)) out.push(req.mrp == null ? 'MRP removed' : `MRP → ${rupees(req.mrp)}`);
    if (!sameNum(p.stockQty ?? 0, req.stockQty)) out.push(`Stock ${Number(p.stockQty) || 0} → ${req.stockQty}`);
    if (!sameNum(p.deliveryCharge, req.deliveryCharge)) out.push(req.deliveryCharge == null ? 'Delivery charge → zone default' : `Delivery charge → ${rupees(req.deliveryCharge)}`);
  }
  if (!sameNum(p.minOrderQty || 1, req.minOrderQty)) out.push(`Min order → ${req.minOrderQty}`);
  if (req.gstRate != null && !sameNum(p.gstRate, req.gstRate)) out.push(`GST ${p.gstRate != null ? `${Number(p.gstRate)}%` : '—'} → ${req.gstRate}%`);
  if (req.hsnCode && !same(p.hsnCode, req.hsnCode)) out.push(`HSN → ${req.hsnCode}`);
  if (!same(p.unitLabel, req.unitLabel)) out.push(req.unitLabel ? `Unit → ${req.unitLabel}` : 'Unit removed');
  if ((p.active !== false) !== (req.active !== false)) out.push(req.active === false ? 'Unpublished (draft)' : 'Published');
  if (Boolean(p.featured) !== Boolean(req.featured)) out.push(req.featured ? 'Featured' : 'No longer featured');
  if (!same(p.badge, req.badge)) out.push(req.badge ? `Badge → ${req.badge}` : 'Badge removed');
  if (!same(p.imageUrl, req.imageUrl) || !same(p.imageUrls, req.imageUrls)) out.push('Photos');
  const texts = ['tagline', 'summary', 'description', 'warranty', 'features', 'benefits', 'applications', 'specifications']
    .filter(k => !same(p[k], req[k]));
  if (texts.length) out.push(`Text: ${texts.join(', ')}`);
  if (Boolean(p.deliveryRestricted) !== Boolean(req.deliveryRestricted) || pins(p.allowedPincodes) !== pins(req.allowedPincodes)
      || !same(p.deliveryAreaNote, req.deliveryAreaNote)) out.push('Delivery area');
  if (canonTiers(p.priceTiers) !== canonTiers(req.priceTiers)) {
    out.push(req.priceTiers ? `${req.variants || hadOptions ? 'Shared bulk discount' : 'Bulk prices'} → ${canonTiers(req.priceTiers)}` : `${req.variants || hadOptions ? 'Shared bulk discount' : 'Bulk prices'} removed`);
  }
  if (req.variants) {
    const before = new Map((p.variants || []).filter(Boolean).map(v => [v.id, v]));
    const names = [req.option1Name, req.option2Name, req.option3Name].filter(Boolean);
    const had = [p.option1Name, p.option2Name, p.option3Name].filter(Boolean);
    if (!hadOptions) out.push(`Now sold in options: ${names.join(', ')}`);
    else if (names.join('|') !== had.join('|')) out.push(`Option names → ${names.join(', ')}`);
    let added = 0;
    const detail = [];
    let changed = 0;
    for (const r of req.variants) {
      const label = [r.option1, r.option2, r.option3].filter(Boolean).join(' · ');
      const v = r.id ? before.get(r.id) : null;
      if (!v) { added++; continue; }
      const bits = [];
      if (!sameNum(v.price, r.price)) bits.push(`${rupees(v.price)} → ${rupees(r.price)}`);
      if (!sameNum(v.stockQty ?? 0, r.stockQty)) bits.push(`stock ${Number(v.stockQty) || 0} → ${r.stockQty}`);
      if (!sameNum(v.mrp && Number(v.mrp) > 0 ? v.mrp : null, r.mrp)) bits.push(r.mrp == null ? 'MRP removed' : `MRP ${rupees(r.mrp)}`);
      if (!sameNum(v.minOrderQty, r.minOrderQty)) bits.push(`min order ${r.minOrderQty ?? 'product\'s'}`);
      if (canonTiers(v.priceTiers) !== canonTiers(r.priceTiers)) bits.push(r.priceTiers ? `bulk ${canonTiers(r.priceTiers)}` : 'bulk prices removed');
      if (!sameNum(v.deliveryCharge, r.deliveryCharge)) bits.push('delivery charge');
      if (!same(v.imageUrl, r.imageUrl)) bits.push('photo');
      if ((v.active !== false) !== (r.active !== false)) bits.push(r.active === false ? 'switched off' : 'switched on');
      if (r.sku && !same(up(v.sku), up(r.sku))) bits.push(`SKU ${r.sku}`);
      if (![v.option1, v.option2, v.option3].every((x, i) => same(x, [r.option1, r.option2, r.option3][i]))) bits.push('renamed');
      if (bits.length) { changed++; if (detail.length < 4) detail.push(`${label}: ${bits.join(', ')}`); }
    }
    if (changed) out.push(...detail, ...(changed > detail.length ? [`…and ${plural(changed - detail.length, 'more option')} changed`] : []));
    if (added) out.push(plural(added, 'new option'));
  }
  return out;
}

/** A short summary of a draft for the preview: options, price range, stock. */
export function draftSummary(d) {
  const req = d.plan?.request;
  if (req?.variants) {
    const live = req.variants.filter(v => v.active !== false && Number(v.price) > 0);
    const prices = live.map(v => Number(v.price));
    return {
      options: req.variants.length,
      inFile: d.options.length,
      price: prices.length ? [Math.min(...prices), Math.max(...prices)] : null,
      stock: live.reduce((s, v) => s + (Number(v.stockQty) || 0), 0),
    };
  }
  if (req) return { options: 0, inFile: 0, price: Number(req.price) > 0 ? [Number(req.price), Number(req.price)] : null, stock: d.existing?.variants?.length ? d.existing.stockQty : req.stockQty };
  const s = d.simple || {};
  const prices = d.options.map(o => o.price).filter(n => n !== undefined);
  return {
    options: d.options.length,
    inFile: d.options.length,
    price: d.options.length ? (prices.length ? [Math.min(...prices), Math.max(...prices)] : null) : (s.price !== undefined ? [s.price, s.price] : null),
    stock: d.options.length ? d.options.reduce((t, o) => t + (o.stockQty || 0), 0) : s.stockQty,
  };
}

/* ─── Running the import ────────────────────────────────────────────────── */

/** A readable message from a failed API call. */
export function apiErrorMessage(e) {
  const data = e?.response?.data;
  if (data && typeof data === 'object') {
    const fields = data.fieldErrors && typeof data.fieldErrors === 'object'
      ? Object.entries(data.fieldErrors).map(([k, v]) => `${k}: ${v}`).join('; ') : '';
    const msg = data.message && data.message !== 'Validation failed' ? data.message : '';
    if (msg || fields) return [msg, fields].filter(Boolean).join(' — ');
  }
  const status = e?.response?.status;
  if (status === 401) return 'Your session has expired — sign in again and re-upload the sheet (saved products are updated, not duplicated).';
  if (status === 403) return "You don't have permission to change products.";
  if (status >= 500) return 'The server had a problem saving this product — try again.';
  if (e && !e.response && (e.request || e.code === 'ERR_NETWORK' || e.code === 'ECONNABORTED')) return 'Could not reach the server — check the connection.';
  return e?.message || 'Could not save.';
}

const isNetworkError = (e) => e && !e.response && (e.request || e.code === 'ERR_NETWORK' || e.code === 'ECONNABORTED');

/**
 * Saves the drafts one by one (so one bad product doesn't stop the rest).
 * api = { create(req), get(slug), update(id, req) } → Promise<{ data }>.
 * An update first re-reads the product, so stock and options are current.
 * Returns [{ draft, status: created|updated|unchanged|failed|skipped, message, product }].
 */
export async function runImport(drafts, { api, onProgress, shouldStop } = {}) {
  const todo = drafts.filter(isImportable);
  const results = [];
  let networkFailures = 0;
  for (let i = 0; i < todo.length; i++) {
    const d = todo[i];
    if (shouldStop?.()) {
      results.push({ draft: d, status: 'skipped', message: 'Stopped before this product was saved.' });
      continue;
    }
    if (networkFailures >= 3) {
      results.push({ draft: d, status: 'skipped', message: 'Not saved — the connection to the server was lost.' });
      continue;
    }
    onProgress?.({ done: i, total: todo.length, name: d.name || d.existing?.name || '' });
    try {
      if (d.action === 'create') {
        const plan = planCreate(d);
        if (plan.errors.length) throw new Error(plan.errors.join(' '));
        const { data } = await api.create(plan.request);
        results.push({ draft: d, status: 'created', product: data, message: d.options.length ? plural(d.options.length, 'option') : '' });
      } else {
        let fresh;
        try {
          fresh = (await api.get(d.existing.slug)).data;
        } catch (e) {
          if (e?.response?.status === 404) throw new Error('This product no longer exists.');
          throw e;
        }
        if (!fresh || fresh.id !== d.existing.id) throw new Error('This product was changed while importing — upload the sheet again.');
        const plan = planUpdate(d, fresh);
        if (plan.errors.length) throw new Error(plan.errors.join(' '));
        if (!plan.changes.length) {
          results.push({ draft: d, status: 'unchanged', product: fresh, message: 'Already up to date.' });
        } else {
          const { data } = await api.update(fresh.id, plan.request);
          results.push({ draft: d, status: 'updated', product: data, message: plan.changes.join(' · ') });
        }
      }
      networkFailures = 0;
    } catch (e) {
      networkFailures = isNetworkError(e) ? networkFailures + 1 : 0;
      results.push({ draft: d, status: 'failed', message: apiErrorMessage(e) });
    }
  }
  onProgress?.({ done: todo.length, total: todo.length, name: '' });
  return results;
}

/** All products from the paged admin list (page by page). */
export async function fetchAllProducts(manage, { pageSize = 200, maxPages = 100 } = {}) {
  const out = new Map();
  for (let page = 0; page < maxPages; page++) {
    const { data } = await manage({ page, size: pageSize });
    const content = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [];
    for (const p of content) if (p?.id) out.set(p.id, p);
    const totalPages = Number(data?.totalPages ?? 1);
    if (!content.length || page + 1 >= totalPages) break;
  }
  return [...out.values()];
}

/* ─── Export, template & report ─────────────────────────────────────────── */

const yesNo = (b) => (b ? 'yes' : 'no');
const n2 = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? '' : String(Math.round(Number(v) * 100) / 100));

/** Products → sheet rows (objects keyed by column key): one per product, or one per option. */
export function productsToRows(products) {
  const out = [];
  for (const p of products || []) {
    if (!p) continue;
    const base = {
      handle: p.slug || '', name: p.name || '', category: p.category || '', unitLabel: p.unitLabel || '',
      gstRate: n2(p.gstRate), hsnCode: p.hsnCode || '',
      active: yesNo(p.active !== false), featured: yesNo(Boolean(p.featured)), badge: p.badge || '',
      imageUrl: p.imageUrl || '', imageUrls: p.imageUrls || '', tagline: p.tagline || '', summary: p.summary || '',
      description: p.description || '', warranty: p.warranty || '', features: p.features || '', benefits: p.benefits || '',
      applications: p.applications || '', specifications: p.specifications || '',
      deliveryRestricted: yesNo(Boolean(p.deliveryRestricted)), allowedPincodes: p.allowedPincodes || '',
      deliveryAreaNote: p.deliveryAreaNote || '',
    };
    const variants = Array.isArray(p.variants) ? p.variants.filter(Boolean) : [];
    if (variants.length) {
      variants.forEach((v, i) => {
        const row = i === 0
          ? { ...base, option1Name: p.option1Name || '', option2Name: p.option2Name || '', option3Name: p.option3Name || '',
              sharedBulkPrices: p.priceTiers || '', productSku: p.sku || '' }
          : { handle: base.handle, name: base.name };
        Object.assign(row, {
          option1Value: v.option1 || '', option2Value: v.option2 || '', option3Value: v.option3 || '',
          sku: v.sku || '', price: n2(v.price), mrp: Number(v.mrp) > 0 ? n2(v.mrp) : '', stockQty: String(Number(v.stockQty) || 0),
          minOrderQty: v.minOrderQty != null ? String(v.minOrderQty) : '', bulkPrices: v.priceTiers || '',
          deliveryCharge: n2(v.deliveryCharge), optionImage: v.imageUrl || '', optionActive: yesNo(v.active !== false),
        });
        out.push(row);
      });
    } else {
      out.push({
        ...base, sku: p.sku || '', price: n2(p.price), mrp: Number(p.mrp) > 0 ? n2(p.mrp) : '',
        stockQty: String(Number(p.stockQty) || 0), minOrderQty: p.minOrderQty != null ? String(p.minOrderQty) : '',
        bulkPrices: p.priceTiers || '', deliveryCharge: n2(p.deliveryCharge),
      });
    }
  }
  return out;
}

const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Sheet rows → CSV text with a UTF-8 BOM (so Excel shows ₹ and — correctly). */
export function rowsToCsv(rows) {
  const head = COLUMNS.map(c => c.label).join(',');
  const body = (rows || []).map(r => COLUMNS.map(c => csvCell(r[c.key] ?? '')).join(','));
  return `﻿${[head, ...body].join('\r\n')}\r\n`;
}

/** Example rows: Cement in 2 brands × 2 grades, TMT bars by diameter, and a single product. */
export const TEMPLATE_ROWS = [
  { handle: 'opc-ppc-cement', name: 'Cement — OPC & PPC (50 kg bag)', category: 'Civil & Construction', unitLabel: 'bag',
    gstRate: '18', hsnCode: '2523', option1Name: 'Brand', option1Value: 'UltraTech', option2Name: 'Grade', option2Value: 'OPC 53',
    option3Name: 'Pack size', option3Value: '50 kg bag', sku: 'CEM-UT-OPC53', price: '450', mrp: '480', stockQty: '500',
    minOrderQty: '10', bulkPrices: '50:440, 200:430', optionActive: 'yes', active: 'yes', featured: 'yes', badge: 'Fresh stock',
    summary: 'Fresh cement from leading brands, delivered to your site.',
    description: 'OPC 53 for high-strength work such as slabs, beams and columns; PPC for plastering, masonry and general construction.\nEvery bag is within 30 days of its manufacturing date.',
    features: 'Fresh stock — within 30 days of manufacture\nGST invoice with HSN 2523\nSite delivery available',
    specifications: 'Pack: 50 kg bag\nStandard: IS 269 (OPC) / IS 1489 (PPC)' },
  { handle: 'opc-ppc-cement', name: 'Cement — OPC & PPC (50 kg bag)', option1Value: 'UltraTech', option2Value: 'PPC',
    option3Value: '50 kg bag', sku: 'CEM-UT-PPC', price: '420', mrp: '440', stockQty: '300', minOrderQty: '10',
    bulkPrices: '50:410, 200:400', optionActive: 'yes' },
  { handle: 'opc-ppc-cement', name: 'Cement — OPC & PPC (50 kg bag)', option1Value: 'ACC', option2Value: 'OPC 53',
    option3Value: '50 kg bag', sku: 'CEM-ACC-OPC53', price: '440', mrp: '470', stockQty: '200', minOrderQty: '10',
    bulkPrices: '50:2%, 200:4%', optionActive: 'yes' },
  { handle: 'opc-ppc-cement', name: 'Cement — OPC & PPC (50 kg bag)', option1Value: 'ACC', option2Value: 'PPC',
    option3Value: '50 kg bag', sku: 'CEM-ACC-PPC', price: '410', mrp: '430', stockQty: '0', minOrderQty: '10', optionActive: 'yes' },
  { handle: 'tmt-bars-fe500d', name: 'TMT Steel Bars Fe 500D', category: 'Civil & Construction', unitLabel: 'tonne', gstRate: '18',
    hsnCode: '7214', option1Name: 'Diameter', option1Value: '8 mm', sku: 'TMT-FE500D-8', price: '62500', stockQty: '12', minOrderQty: '1',
    bulkPrices: '5:61500, 10:60500', active: 'yes', summary: 'BIS-certified Fe 500D TMT bars, sold by the tonne.' },
  { handle: 'tmt-bars-fe500d', name: 'TMT Steel Bars Fe 500D', option1Value: '12 mm', sku: 'TMT-FE500D-12', price: '61000',
    stockQty: '20', minOrderQty: '1', bulkPrices: '5:60000' },
  { handle: 'tmt-bars-fe500d', name: 'TMT Steel Bars Fe 500D', option1Value: '16 mm', sku: 'TMT-FE500D-16', price: '60500',
    stockQty: '8', minOrderQty: '1' },
  { handle: 'industrial-safety-helmet-isi', name: 'Industrial Safety Helmet (ISI)', category: 'Safety Equipment', unitLabel: 'piece',
    gstRate: '18', hsnCode: '6506', sku: 'NGP-SAF-HELMET', price: '480', mrp: '650', stockQty: '120', minOrderQty: '1',
    bulkPrices: '10:450, 50:430', active: 'yes', summary: 'IS 2925 helmet for railway and construction sites.',
    features: 'IS 2925 certified\n6-point harness\nRain gutter' },
];

/** The "How to fill" sheet. */
export const HOW_TO = [
  'One row per product. A product sold in options (e.g. Cement in different brands and grades) takes one row per option — give its rows the same Handle (or the same Name).',
  "Put what the buyer chooses in Option1 Name / Option2 Name… (e.g. Brand, Grade) on the product's first row, and each row's choices in Option1 Value / Option2 Value….",
  "Each option row has its own SKU, Price, MRP, Stock, Min Order and Bulk Prices. Product details (category, description, photos, GST, HSN…) only need the first row.",
  'Upload it in Admin › Products › Bulk upload. You see a preview — what will be added and what will change — before anything is saved.',
  'Updating: products already in the shop are found by SKU, Handle or Name. Blank cells keep what is saved; write none to remove a value (MRP, bulk prices, badge…). Options not in the sheet stay as they are.',
  'Tip: Export your products, change prices or stock in the export, and upload it again. Replace the example rows with your own products.',
];

const sheetColumns = () => COLUMNS.map(c => ({ width: c.width || 14, text: Boolean(c.text) || (!c.type && c.level !== 'row') }));

/** Sheet rows → arrays for the workbook (numbers as numbers). */
function toCells(rows) {
  return [COLUMNS.map(c => c.label), ...rows.map(r => COLUMNS.map(c => {
    const v = r[c.key];
    if (v == null || v === '') return null;
    if (c.type === 'number' && /^-?\d+(\.\d+)?$/.test(String(v))) return Number(v);
    return String(v);
  }))];
}

function howToSheet() {
  const rows = [[{ v: 'Bulk upload — how to fill the Products sheet', style: 'title' }], []];
  HOW_TO.forEach((line, i) => rows.push([{ v: `${i + 1}.`, style: 'normal' }, { v: line, style: 'wrap' }]));
  rows.push([], [{ v: 'Column', style: 'header' }, { v: 'What to enter', style: 'header' }, { v: 'Example', style: 'header' }, { v: 'Needed', style: 'header' }]);
  for (const c of COLUMNS) {
    rows.push([
      { v: c.label, style: 'normal' },
      { v: `${c.help}${c.level === 'row' ? ' (Per option row.)' : ''}`, style: 'wrap' },
      c.example ? { v: c.example.replace(/\\n/g, ' / '), style: 'wrap' } : null,
      c.required === 'new' ? { v: 'For new products', style: 'normal' } : null,
    ]);
  }
  rows.push([], [{ v: 'Bulk Prices: "50:440, 200:430" = ₹440 each from 50 units, ₹430 each from 200. "50:2%, 200:4%" = 2% off from 50, 4% off from 200. At most 6 tiers.', style: 'note' }]);
  rows.push([{ v: 'GST (since 22 Sep 2025): 0%, 5%, 18% or 40% — cement 18% (HSN 2523), TMT bars 18% (HSN 7214).', style: 'note' }]);
  return { name: 'How to fill', rows, cols: [{ width: 22 }, { width: 90, wrap: true }, { width: 30, wrap: true }, { width: 18 }] };
}

/** An Excel workbook: the Products sheet + the How-to sheet. */
export function productsWorkbook(rows) {
  return buildXlsx([
    { name: 'Products', rows: toCells(rows), cols: sheetColumns(), header: true },
    howToSheet(),
  ]);
}

export const templateWorkbook = () => productsWorkbook(TEMPLATE_ROWS);
export const exportWorkbook = (products) => productsWorkbook(productsToRows([...(products || [])].filter(Boolean)
  .sort((a, b) => String(a.category || '').localeCompare(String(b.category || '')) || String(a.name || '').localeCompare(String(b.name || '')))));

const STATUS_LABEL = { created: 'Added', updated: 'Updated', unchanged: 'No changes', failed: 'Failed', skipped: 'Not saved' };

/** The import report as CSV (one line per product). */
export function resultsToCsv(results) {
  const lines = [['Rows', 'Product', 'Result', 'Details'].join(',')];
  for (const r of results || []) {
    lines.push([r.draft.rowNumbers.join(' '), r.draft.name || r.draft.existing?.name || '', STATUS_LABEL[r.status] || r.status, r.message || '']
      .map(csvCell).join(','));
  }
  return `﻿${lines.join('\r\n')}\r\n`;
}
