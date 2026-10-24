/**
 * © 2024–2026 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 *
 * Pure logic behind the admin "Options & price range" editor: presets, the
 * price table built from option values, paste-from-spreadsheet, bulk fill,
 * validation and the request payload. Kept free of React so it is unit-tested.
 */
import { normalizeTiers } from '@/lib/pricing';

export const MAX_AXES = 3;
export const MAX_ROWS = 300;

export const UNIT_SUGGESTIONS = ['bag', 'tonne', 'kg', 'piece', 'litre', 'bucket', 'metre', 'box', 'set', 'pack', 'pair', 'roll', 'bundle'];

/**
 * Ready-made starting points. Values are suggestions — the admin edits them
 * to the brands and sizes actually stocked. Tax hints follow current GST
 * rates (cement 18% since 22 Sep 2025; HSN 2523 / 7214 / 3209).
 */
export const PRESETS = {
  cement: {
    label: 'Cement',
    unitLabel: 'bag',
    gstRate: '18', hsnCode: '2523',
    axes: [
      { name: 'Brand', values: 'UltraTech, ACC, Ambuja, Shree, Dalmia, JK Lakshmi' },
      { name: 'Grade', values: 'OPC 43, OPC 53, PPC, PSC' },
      { name: 'Pack size', values: '50 kg bag' },
    ],
  },
  tmt: {
    label: 'TMT steel bars',
    unitLabel: 'tonne',
    gstRate: '18', hsnCode: '7214',
    axes: [
      { name: 'Brand', values: 'Tata Tiscon, JSW Neosteel, SAIL, Jindal Panther' },
      { name: 'Grade', values: 'Fe 500, Fe 500D, Fe 550D' },
      { name: 'Diameter', values: '8 mm, 10 mm, 12 mm, 16 mm, 20 mm, 25 mm' },
    ],
  },
  paint: {
    label: 'Paint',
    unitLabel: 'bucket',
    gstRate: '18', hsnCode: '3209',
    axes: [
      { name: 'Brand', values: 'Asian Paints, Berger, Nerolac' },
      { name: 'Type', values: 'Interior emulsion, Exterior emulsion, Enamel, Primer' },
      { name: 'Pack size', values: '1 L, 4 L, 10 L, 20 L' },
    ],
  },
  apparel: {
    label: 'Size & colour',
    unitLabel: 'piece',
    axes: [
      { name: 'Size', values: 'S, M, L, XL, XXL' },
      { name: 'Colour', values: 'Orange, Yellow, Blue' },
    ],
  },
};

let seq = 0;
const rid = () => `row-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export const splitValues = (text) => {
  const out = [];
  const seen = new Set();
  for (const raw of String(text || '').split(/[,\n;|]+/)) {
    const v = raw.trim().replace(/\s+/g, ' ');
    if (!v || v.length > 80) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
};

export const comboKeyOf = (values) => values.map(v => String(v || '').trim().toLowerCase()).join('\u0001');
const rowValues = (r, n) => [r.option1, r.option2, r.option3].slice(0, n).map(v => String(v || ''));

export const emptyRow = (values = []) => ({
  key: rid(), id: null,
  option1: values[0] || '', option2: values[1] || '', option3: values[2] || '',
  sku: '', price: '', mrp: '', stockQty: '0', minOrderQty: '', priceTiers: '', deliveryCharge: '', imageUrl: '',
  active: true,
});

/** Axes that are actually filled in (name + at least one value). */
export const usedAxes = (axes) => (axes || []).filter(a => a && String(a.name || '').trim() && splitValues(a.values).length);

/** Every combination of the option values, in order. */
export function cartesian(axes) {
  const lists = usedAxes(axes).map(a => splitValues(a.values));
  if (!lists.length) return [];
  return lists.reduce((acc, list) => acc.flatMap(prefix => list.map(v => [...prefix, v])), [[]]);
}

/**
 * Rebuild the price table from the option values, keeping everything already
 * typed for combinations that still exist. Returns { rows, dropped }.
 */
export function rebuildRows(axes, rows) {
  const n = usedAxes(axes).length;
  const combos = cartesian(axes);
  const byKey = new Map((rows || []).map(r => [comboKeyOf(rowValues(r, n)), r]));
  const next = combos.slice(0, MAX_ROWS).map(values => {
    const existing = byKey.get(comboKeyOf(values));
    if (existing) {
      byKey.delete(comboKeyOf(values));
      return { ...existing, option1: values[0] || '', option2: values[1] || '', option3: values[2] || '' };
    }
    return emptyRow(values);
  });
  return { rows: next, dropped: [...byKey.values()], truncated: combos.length > MAX_ROWS };
}

/**
 * Paste rows from a spreadsheet: one option per line, tab- or comma-separated —
 * the option values (in order), then price, MRP, stock and SKU (optional).
 * Matching rows are updated, new combinations added (and their values added
 * to the options). Returns { rows, axes, updated, added, errors }.
 */
export function applyPaste(text, axes, rows) {
  const ax = usedAxes(axes).map(a => ({ ...a }));
  const n = ax.length;
  const errors = [];
  if (!n) return { rows, axes, updated: 0, added: 0, errors: ['Name your options first (e.g. Brand, Grade).'] };
  const next = [...(rows || [])];
  const index = new Map(next.map((r, i) => [comboKeyOf(rowValues(r, n)), i]));
  let updated = 0, added = 0;
  const num = (s) => {
    const t = String(s ?? '').replace(/[₹,\s]/g, '');
    return t === '' ? '' : (Number.isFinite(Number(t)) ? t : null);
  };
  String(text || '').split(/\r?\n/).forEach((line, li) => {
    if (!line.trim()) return;
    const cells = (line.includes('\t') ? line.split('\t') : line.split(',')).map(c => c.trim());
    const values = cells.slice(0, n);
    if (li === 0 && ax.some(a => String(a.name).trim().toLowerCase() === String(values[0] || '').toLowerCase())) return;   // header row
    if (values.length < n || values.some(v => !v)) { errors.push(`Line ${li + 1}: needs ${n} option value${n === 1 ? '' : 's'} first.`); return; }
    const [price, mrp, stock] = [num(cells[n]), num(cells[n + 1]), num(cells[n + 2])];
    if (price === null || mrp === null || stock === null) { errors.push(`Line ${li + 1}: price, MRP and stock must be numbers.`); return; }
    const sku = (cells[n + 3] || '').toUpperCase();
    const key = comboKeyOf(values);
    const patch = {};
    if (price !== '') patch.price = price;
    if (mrp !== '') patch.mrp = mrp;
    if (stock !== '') patch.stockQty = String(parseInt(stock, 10) || 0);
    if (sku) patch.sku = sku;
    if (index.has(key)) {
      next[index.get(key)] = { ...next[index.get(key)], ...patch };
      updated++;
    } else {
      if (next.length >= MAX_ROWS) { errors.push(`Line ${li + 1}: at most ${MAX_ROWS} options.`); return; }
      next.push({ ...emptyRow(values), ...patch });
      index.set(key, next.length - 1);
      values.forEach((v, i) => {
        const have = splitValues(ax[i].values);
        if (!have.some(h => h.toLowerCase() === v.toLowerCase())) ax[i].values = [...have, v].join(', ');
      });
      added++;
    }
  });
  return { rows: next, axes: ax, updated, added, errors };
}

/**
 * Set one field on many rows at once. scope = 'all' or { axis, value };
 * field = price | mrp | stockQty | minOrderQty | priceTiers | pricePct (±% on price).
 */
export function bulkFill(rows, scope, field, value) {
  const matches = (r) => scope === 'all' || !scope
    || String([r.option1, r.option2, r.option3][scope.axis] || '').toLowerCase() === String(scope.value || '').toLowerCase();
  return (rows || []).map(r => {
    if (!matches(r)) return r;
    if (field === 'pricePct') {
      const pct = Number(String(value).replace('%', ''));
      const p = Number(r.price);
      if (!Number.isFinite(pct) || !(p > 0)) return r;
      return { ...r, price: String(Math.round(p * (100 + pct)) / 100) };
    }
    return { ...r, [field]: String(value ?? '') };
  });
}

/** What the shop will show: { count, min, max, stock }. */
export function summarizeRows(rows) {
  const active = (rows || []).filter(r => r.active !== false);
  const prices = active.map(r => Number(r.price)).filter(n => n > 0);
  return {
    count: active.length,
    min: prices.length ? Math.min(...prices) : null,
    max: prices.length ? Math.max(...prices) : null,
    stock: active.reduce((s, r) => s + (parseInt(r.stockQty, 10) || 0), 0),
  };
}

/** Everything wrong with the options, as messages an admin can act on ([] when fine). */
export function validateOptions(form) {
  const errors = [];
  if (!form?.optionsEnabled) {
    if (form?.priceTiers && String(form.priceTiers).trim()) {
      try { normalizeTiers(form.priceTiers, Number(form.price)); } catch (e) { errors.push(`Bulk prices: ${e.message}`); }
    }
    return errors;
  }
  const axes = (form.optionAxes || []).filter(a => String(a.name || '').trim() || String(a.values || '').trim());
  const n = axes.length;
  if (!n) errors.push('Add at least one option, e.g. Brand.');
  const names = new Set();
  axes.forEach((a, i) => {
    const name = String(a.name || '').trim();
    if (!name) errors.push(`Option ${i + 1} needs a name (e.g. Brand, Grade, Pack size).`);
    else if (names.has(name.toLowerCase())) errors.push(`Two options are both called "${name}".`);
    names.add(name.toLowerCase());
  });
  const rows = form.optionRows || [];
  if (!rows.length) errors.push('Build the price table — click "Build price table".');
  if (rows.length > MAX_ROWS) errors.push(`At most ${MAX_ROWS} options per product.`);
  const seen = new Set();
  const skus = new Set();
  rows.forEach((r, i) => {
    const values = rowValues(r, n);
    const label = values.filter(Boolean).join(' · ') || `Row ${i + 1}`;
    if (values.some(v => !v.trim())) errors.push(`${label}: fill every option value.`);
    const key = comboKeyOf(values);
    if (seen.has(key)) errors.push(`${label} is listed twice.`);
    seen.add(key);
    const price = Number(r.price);
    if (!(price > 0)) errors.push(`${label}: set a price.`);
    if (r.mrp !== '' && r.mrp != null && Number(r.mrp) > 0 && Number(r.mrp) < price) errors.push(`${label}: MRP can't be lower than the price.`);
    if (r.stockQty !== '' && (!Number.isInteger(Number(r.stockQty)) || Number(r.stockQty) < 0)) errors.push(`${label}: stock must be a whole number, 0 or more.`);
    if (r.minOrderQty !== '' && r.minOrderQty != null && (!Number.isInteger(Number(r.minOrderQty)) || Number(r.minOrderQty) < 1)) errors.push(`${label}: minimum order must be 1 or more.`);
    if (r.priceTiers && String(r.priceTiers).trim() && price > 0) {
      try { normalizeTiers(r.priceTiers, price); } catch (e) { errors.push(`${label}: ${e.message}`); }
    }
    const sku = String(r.sku || '').trim().toUpperCase();
    if (sku) {
      if (!/^[A-Z0-9][A-Z0-9._/-]{0,63}$/.test(sku)) errors.push(`${label}: SKU may use only letters, digits, - _ / . (max 64).`);
      if (skus.has(sku)) errors.push(`SKU ${sku} is used by two options.`);
      skus.add(sku);
    }
  });
  if (form.priceTiers && String(form.priceTiers).trim()) {
    try {
      normalizeTiers(form.priceTiers, null);
      if (!String(form.priceTiers).split(/[,;\n]+/).filter(s => s.trim()).every(s => /%\s*$/.test(s.trim()))) {
        errors.push('The shared bulk discount must be a percentage (e.g. 50:2%) — set fixed bulk prices per option instead.');
      }
    } catch (e) { errors.push(`Shared bulk discount: ${e.message}`); }
  }
  return [...new Set(errors)];
}

/** Editor state for a product loaded from the API. */
export function initOptionsState(p) {
  const variants = Array.isArray(p?.variants) ? p.variants.filter(Boolean) : [];
  const names = [p?.option1Name, p?.option2Name, p?.option3Name].filter(x => x && String(x).trim());
  const rows = variants.map(v => ({
    key: v.id || rid(),
    id: v.id || null,
    option1: v.option1 || '', option2: v.option2 || '', option3: v.option3 || '',
    sku: v.sku || '',
    price: v.price != null ? String(v.price) : '',
    mrp: v.mrp != null ? String(v.mrp) : '',
    stockQty: String(v.stockQty ?? 0),
    // What the stock was when the editor opened: the server applies only the
    // change, so bags sold while the form is open aren't put back on sale.
    stockQtyBase: v.id ? Number(v.stockQty ?? 0) : null,
    minOrderQty: v.minOrderQty != null ? String(v.minOrderQty) : '',
    priceTiers: v.priceTiers || '',
    deliveryCharge: v.deliveryCharge != null ? String(v.deliveryCharge) : '',
    imageUrl: v.imageUrl || '',
    active: v.active !== false,
  }));
  const axes = names.map((name, i) => ({
    name,
    values: splitValues(rows.map(r => r[`option${i + 1}`]).join(',')).join(', '),
  }));
  return {
    optionsEnabled: variants.length > 0,
    optionAxes: axes.length ? axes : [{ name: '', values: '' }],
    optionRows: rows,
    unitLabel: p?.unitLabel || '',
    priceTiers: p?.priceTiers || '',
  };
}

/** The options part of the save request. */
export function optionsPayload(form) {
  const base = {
    unitLabel: String(form.unitLabel || '').trim(),
    priceTiers: String(form.priceTiers || '').trim(),
  };
  if (!form.optionsEnabled) return { ...base, variants: [] };
  const axes = (form.optionAxes || []).filter(a => String(a.name || '').trim());
  const n = axes.length;
  const intOrNull = (v) => (v === '' || v == null ? null : parseInt(v, 10));
  const numOrNull = (v) => (v === '' || v == null ? null : Number(v));
  return {
    ...base,
    option1Name: axes[0]?.name.trim() || null,
    option2Name: axes[1]?.name.trim() || null,
    option3Name: axes[2]?.name.trim() || null,
    variants: (form.optionRows || []).map(r => {
      const vals = rowValues(r, n).map(v => v.trim());
      return {
        id: r.id || undefined,
        sku: String(r.sku || '').trim().toUpperCase() || undefined,
        option1: vals[0] || null, option2: vals[1] || null, option3: vals[2] || null,
        price: Number(r.price),
        mrp: numOrNull(r.mrp),
        stockQty: intOrNull(r.stockQty) ?? 0,
        stockQtyBase: r.id && r.stockQtyBase != null ? r.stockQtyBase : undefined,
        minOrderQty: intOrNull(r.minOrderQty),
        priceTiers: String(r.priceTiers || '').trim(),
        deliveryCharge: numOrNull(r.deliveryCharge),
        imageUrl: String(r.imageUrl || '').trim() || null,
        active: r.active !== false,
      };
    }),
  };
}
