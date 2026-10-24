/**
 * © 2024–2026 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 *
 * Product options ("variants") — e.g. Cement sold by Brand × Grade × Pack size,
 * each option with its own price, stock, minimum order and bulk prices.
 * One set of helpers for every screen (shop cards, product page, cart,
 * checkout, quotes, re-order) so they can never disagree.
 *
 * Mirrors the server: com.navgrow.entity.ProductVariant / PriceTiers.effective.
 */
import { stockOf, moqOf } from '@/lib/stock';
import { unitPriceFor } from '@/lib/pricing';

export const LINE_SEP = '::';

/** The product id behind a cart / quote line (lines for an option use "productId::variantId"). */
export const productIdOf = (item) => String(item?.productId ?? String(item?.id ?? '').split(LINE_SEP)[0] ?? '');

/** Key of a cart / quote line: one per product, or per option of a product. */
export const lineKeyOf = (productId, variantId) =>
  (variantId ? `${productId}${LINE_SEP}${variantId}` : String(productId ?? ''));

export const variantsOf = (p) => (Array.isArray(p?.variants) ? p.variants.filter(Boolean) : []);
export const activeVariants = (p) => variantsOf(p).filter(v => v.active !== false);

/** Is this product sold through options? */
export const hasOptions = (p) => p?.hasVariants === true || variantsOf(p).length > 0;

/** Option names in use, e.g. ["Brand", "Grade", "Pack size"]. */
export function optionNamesOf(p) {
  if (Array.isArray(p?.optionNames) && p.optionNames.length) return p.optionNames.filter(Boolean);
  return [p?.option1Name, p?.option2Name, p?.option3Name].filter(n => n && String(n).trim());
}

/** The values of an option, aligned with optionNamesOf(product). */
export const valuesOf = (v, count = 3) => [v?.option1, v?.option2, v?.option3].slice(0, Math.max(1, count))
  .map(x => (x == null ? '' : String(x)));

/** "UltraTech · OPC 53 · 50 kg bag" */
export const variantLabel = (v) => (v?.label || [v?.option1, v?.option2, v?.option3].filter(x => x && String(x).trim()).join(' · '));

/** Minimum order for an option (its own, else the product's). */
export const variantMoq = (v, p) => moqOf({ minOrderQty: v?.minOrderQty ?? p?.minOrderQty });

/** Can this option be bought online right now? (unknown stock → server decides) */
export function variantBuyable(v, p) {
  if (!v || v.active === false || p?.active === false) return false;
  const s = stockOf(v);
  return s === null ? true : s >= variantMoq(v, p);
}

/**
 * Bulk prices that apply to an option: its own, else the product's percentage
 * discounts (fixed product-level bulk prices only apply without options).
 * Same rule as PriceTiers.effective on the server.
 */
export function effectiveTiers(p, v) {
  const isPercentOnly = (t) => !!t && String(t).split(/[,;\n]+/).filter(s => s.trim()).every(s => /%\s*$/.test(s.trim()));
  if (v) {
    if (v.priceTiers && String(v.priceTiers).trim()) return v.priceTiers;
    return p?.priceTiers && isPercentOnly(p.priceTiers) ? p.priceTiers : null;
  }
  return p?.priceTiers && String(p.priceTiers).trim() ? p.priceTiers : null;
}

/** Price range across a product's options: { min, max, count, mrpMax }. Falls back to the product price. */
export function priceRange(p) {
  const act = activeVariants(p);
  const basis = act.length ? act : variantsOf(p);
  if (!basis.length) {
    const n = Number(p?.price);
    return { min: n, max: n, count: 0, mrpMax: Number(p?.mrp) || n };
  }
  const prices = basis.map(v => Number(v.price)).filter(Number.isFinite);
  const mrps = basis.map(v => Number(v.mrp)).filter(n => Number.isFinite(n) && n > 0);
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
    count: act.length,
    mrpMax: mrps.length ? Math.max(...mrps) : Math.max(...prices),
  };
}

/** Best discount across options (for an "Up to 12% off" badge). */
export function bestDiscountPct(p) {
  let best = 0;
  for (const v of activeVariants(p)) {
    const price = Number(v.price), mrp = Number(v.mrp);
    if (mrp > price && price > 0) best = Math.max(best, Math.round((1 - price / mrp) * 100));
  }
  return best;
}

/** Any option buyable online right now? */
export const anyBuyable = (p) => activeVariants(p).some(v => variantBuyable(v, p));

/** Total stock across active options (null when unknown). */
export function totalOptionStock(p) {
  const act = activeVariants(p);
  if (!act.length) return 0;
  let sum = 0;
  for (const v of act) {
    const s = stockOf(v);
    if (s === null) return null;
    sum += s;
  }
  return sum;
}

/** The option that exactly matches the selected values (null when that combination isn't offered). */
export function findVariant(p, selection) {
  const n = Math.max(1, optionNamesOf(p).length);
  const want = valuesOf({ option1: selection?.[0], option2: selection?.[1], option3: selection?.[2] }, n)
    .map(s => s.trim().toLowerCase());
  return activeVariants(p).find(v => valuesOf(v, n).every((val, i) => val.trim().toLowerCase() === want[i])) || null;
}

/** Find an option by id or SKU (for ?variant= deep links). */
export function findVariantByRef(p, ref) {
  if (!ref) return null;
  const r = String(ref).trim().toLowerCase();
  return activeVariants(p).find(v => String(v.id).toLowerCase() === r || String(v.sku || '').toLowerCase() === r) || null;
}

/** The option to show first: the cheapest one that can be bought, else the cheapest. */
export function defaultVariant(p) {
  const act = activeVariants(p);
  if (!act.length) return null;
  const byPrice = [...act].sort((a, b) => Number(a.price) - Number(b.price));
  return byPrice.find(v => variantBuyable(v, p)) || byPrice[0];
}

/**
 * The values offered for one option, given what's selected on the others:
 * [{ value, offered, buyable }]. "offered" = this value combines with the other
 * selections into a real option; "buyable" = that option is in stock.
 */
export function valueStates(p, axis, selection) {
  const n = Math.max(1, optionNamesOf(p).length);
  const act = activeVariants(p);
  const seen = new Map();
  for (const v of act) {
    const vals = valuesOf(v, n);
    const value = vals[axis];
    if (!value) continue;
    const key = value.toLowerCase();
    if (!seen.has(key)) seen.set(key, { value, offered: false, buyable: false });
    const matchesOthers = vals.every((val, i) => i === axis || !selection?.[i]
      || val.toLowerCase() === String(selection[i]).toLowerCase());
    if (matchesOthers) {
      const st = seen.get(key);
      st.offered = true;
      if (variantBuyable(v, p)) st.buyable = true;
    }
  }
  return [...seen.values()];
}

/**
 * The buyer picked `value` for option `axis`. Returns the option to select:
 * the exact combination when it exists, else the best option with that value
 * (in stock first, then matching the most other choices, then cheapest).
 */
export function pickValue(p, selection, axis, value) {
  const n = Math.max(1, optionNamesOf(p).length);
  const next = [...(selection || [])];
  next[axis] = value;
  const exact = findVariant(p, next);
  if (exact) return exact;
  const candidates = activeVariants(p).filter(v => valuesOf(v, n)[axis].toLowerCase() === String(value).toLowerCase());
  if (!candidates.length) return null;
  const score = (v) => valuesOf(v, n).reduce((s, val, i) => s + (i !== axis && next[i] && val.toLowerCase() === String(next[i]).toLowerCase() ? 1 : 0), 0);
  return [...candidates].sort((a, b) =>
    (variantBuyable(b, p) ? 1 : 0) - (variantBuyable(a, p) ? 1 : 0)
    || score(b) - score(a)
    || Number(a.price) - Number(b.price))[0];
}

/** Unit price of an option (or a product without options) for a quantity, bulk prices applied. */
export function unitPriceOf(p, v, qty) {
  const base = Number(v ? v.price : p?.price);
  return unitPriceFor(base, effectiveTiers(p, v), qty);
}

/* ── Price per kg / litre — compare a 50 kg bag with a 25 kg one at a glance ── */

const MEASURE = /(\d+(?:\.\d+)?)\s*(kg|kgs|kilo(?:gram)?s?|g|gm|gms|grams?|mt|tonnes?|tons?|l|ltr|ltrs|litres?|liters?|ml)\b/i;

/** Pack size from text such as "50 kg bag" → { qty: 50, unit: 'kg' }; litres for liquids. */
export function packMeasure(text) {
  const m = MEASURE.exec(String(text || ''));
  if (!m) return null;
  const n = Number(m[1]);
  if (!(n > 0)) return null;
  const u = m[2].toLowerCase();
  if (/^(kg|kgs|kilo)/.test(u)) return { qty: n, unit: 'kg' };
  if (/^(g|gm|gms|gram)/.test(u)) return { qty: n / 1000, unit: 'kg' };
  if (/^(mt|tonne|ton)/.test(u)) return { qty: n * 1000, unit: 'kg' };
  if (u === 'ml') return { qty: n / 1000, unit: 'litre' };
  return { qty: n, unit: 'litre' };
}

/**
 * "₹8.40/kg" for an option (or product) whose pack size is known from its
 * option values, its name or the selling unit ("tonne" → per 1000 kg).
 */
export function perMeasurePrice(price, p, v) {
  const n = Number(price);
  if (!(n > 0)) return null;
  let m = null;
  for (const val of [v?.option1, v?.option2, v?.option3]) { m = m || packMeasure(val); }
  m = m || packMeasure(p?.unitLabel) || packMeasure(p?.name);
  if (!m && /^(tonne|ton|mt)s?$/i.test(String(p?.unitLabel || '').trim())) m = { qty: 1000, unit: 'kg' };
  if (!m || !(m.qty > 0)) return null;
  const per = n / m.qty;
  if (!Number.isFinite(per) || per <= 0) return null;
  const digits = per < 10 ? 2 : per < 100 ? 1 : 0;
  return { value: per, unit: m.unit, text: `₹${per.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}/${m.unit}` };
}

/** " / bag" — what one unit is, for price labels. */
export const perUnit = (p) => (p?.unitLabel ? ` / ${p.unitLabel}` : '');

/** "Prices updated today" / "… 3 days ago" from the product's priceUpdatedAt. */
export function priceFreshness(iso, now = Date.now()) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  const days = Math.floor((now - t) / 86400000);
  if (days <= 0) return 'Prices updated today';
  if (days === 1) return 'Prices updated yesterday';
  if (days < 30) return `Prices updated ${days} days ago`;
  return null;   // older than a month: not worth shouting about
}

/** "bag" → "bags", "box" → "boxes"; weights and volumes stay as they are ("50 kg"). */
export function unitPlural(unit, n = 2) {
  const u = String(unit || '').trim();
  if (!u) return n === 1 ? 'unit' : 'units';
  if (n === 1 || /^(kg|g|gm|mt|t|l|ltr|ml|m|mm|cm|sqft|sq ft|cft|cum|rmt)$/i.test(u) || /s$/i.test(u)) return u;
  if (/(x|ch|sh)$/i.test(u)) return `${u}es`;
  return `${u}s`;
}
