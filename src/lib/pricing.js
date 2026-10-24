/**
 * © 2024–2026 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 *
 * Quantity ("bulk") pricing — the more a buyer orders, the less each unit costs.
 * Mirrors com.navgrow.util.PriceTiers on the server; both share test cases
 * (src/__tests__/pricing.test.js ↔ PriceTiersTest.java). Keep them in step or
 * the cart would show a total the server won't charge.
 *
 *   "50:395, 200:385"   from 50 units ₹395 each, from 200 units ₹385 each
 *   "50:2%, 200:4%"     from 50 units 2% off,    from 200 units 4% off
 */

export const MAX_TIERS = 6;

const ENTRY = /^(\d{1,7})\s*\+?\s*(?:[a-z.]{1,10})?\s*[:=@]\s*(?:₹|rs\.?|inr)?\s*(\d{1,9}(?:\.\d{1,2})?)\s*(%)?$/i;

const plain = (n) => {
  const s = Number(n).toFixed(2);
  return s.replace(/\.?0+$/, '');
};

/** Parses tiers sorted by quantity. Throws Error(message) on bad input; blank → []. */
export function parseTiers(text) {
  const out = [];
  if (text == null || String(text).trim() === '') return out;
  for (const raw of String(text).split(/[,;\n\r]+/)) {
    const entry = raw.trim();
    if (!entry) continue;
    const m = ENTRY.exec(entry);
    if (!m) {
      throw new Error(`Bulk price "${entry}" isn't understood. Write it as quantity:price (e.g. 50:395) or quantity:percent (e.g. 50:2%).`);
    }
    const minQty = parseInt(m[1], 10);
    const value = Number(m[2]);
    const percent = !!m[3];
    if (minQty < 2) throw new Error(`Bulk prices start from 2 units or more ("${entry}").`);
    if (!(value > 0)) throw new Error(`Bulk price "${entry}" must be more than zero.`);
    if (percent) {
      if (value > 90) throw new Error(`A bulk discount can be at most 90% ("${entry}").`);
      if (Math.abs(Math.round(value * 10) - value * 10) > 1e-9) {
        throw new Error(`Use at most one decimal place for a percentage ("${entry}").`);
      }
    }
    out.push({ minQty, value, percent });
  }
  if (!out.length) return out;
  if (out.length > MAX_TIERS) throw new Error(`Use at most ${MAX_TIERS} bulk price tiers.`);
  if (out.some(t => t.percent !== out[0].percent)) {
    throw new Error('Use either fixed bulk prices or percentages off — not both in one list.');
  }
  out.sort((a, b) => a.minQty - b.minQty);
  for (let i = 1; i < out.length; i++) {
    if (out[i].minQty === out[i - 1].minQty) throw new Error(`Two bulk tiers start at ${out[i].minQty} units.`);
  }
  return out;
}

/** Same as parseTiers, but never throws (bad text → []). */
export function safeTiers(text) {
  try { return parseTiers(text); } catch { return []; }
}

/**
 * Validates against the normal unit price; returns the canonical text, or null
 * when blank. Throws Error(message) when the tiers don't make sense.
 */
export function normalizeTiers(text, basePrice) {
  const tiers = parseTiers(text);
  if (!tiers.length) return null;
  let prev = null;
  for (const t of tiers) {
    if (!t.percent) {
      if (basePrice != null && t.value >= Number(basePrice)) {
        throw new Error(`The bulk price for ${t.minQty}+ units (₹${plain(t.value)}) must be lower than the normal price (₹${plain(basePrice)}).`);
      }
      if (prev && t.value > prev.value) {
        throw new Error(`Bulk prices should fall as the quantity rises — ${t.minQty}+ units is ₹${plain(t.value)} but ${prev.minQty}+ units is ₹${plain(prev.value)}.`);
      }
    } else if (prev && t.value < prev.value) {
      throw new Error(`Bulk discounts should grow as the quantity rises — ${t.minQty}+ units is ${plain(t.value)}% but ${prev.minQty}+ units is ${plain(prev.value)}%.`);
    }
    prev = t;
  }
  return tiers.map(t => `${t.minQty}:${plain(t.value)}${t.percent ? '%' : ''}`).join(', ');
}

/** Tiers text → canonical text for tiers given as rows [{minQty, value, percent}]. */
export function tiersToText(rows) {
  return (rows || [])
    .filter(r => r && String(r.minQty ?? '').trim() !== '' && String(r.value ?? '').trim() !== '')
    .map(r => `${parseInt(r.minQty, 10)}:${r.value}${r.percent ? '%' : ''}`)
    .join(', ');
}

/**
 * Money as shoppers read it: "₹440", "₹411.60", "₹22,000.40" — whole rupees
 * without decimals, anything else to the paisa. (Plain toLocaleString printed
 * "₹411.6", and rounding to the rupee hid paise the payment would charge.)
 */
export function rupees(n) {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  return '₹' + v.toLocaleString('en-IN', Number.isInteger(v)
    ? { maximumFractionDigits: 0 }
    : { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Percentage price in whole paise, rounded half-up — integer maths, like the server. */
function percentPrice(basePrice, pct) {
  const basePaise = Math.round(Number(basePrice) * 100);
  const tenths = Math.round(Number(pct) * 10);
  const num = basePaise * (1000 - tenths);
  return Math.floor((num + 500) / 1000) / 100;
}

/** Price of one unit when buying `qty` units. Never throws. */
export function unitPriceFor(basePrice, tiersText, qty) {
  const base = Number(basePrice);
  if (!Number.isFinite(base)) return basePrice;
  const tiers = safeTiers(tiersText);
  let best = null;
  for (const t of tiers) if (qty >= t.minQty) best = t;
  if (!best) return base;
  const price = best.percent ? percentPrice(base, best.value) : best.value;
  return price < base ? Math.round(price * 100) / 100 : base;
}

/**
 * Table rows for showing the bulk prices: [{ minQty, maxQty|null, unitPrice, savePct }].
 * The first row starts at the minimum order, at the price that applies there.
 * (It used to start at the normal price even when a tier began at or below the
 * minimum order, giving impossible rows such as "50–49 bags ₹420".)
 * Empty when no quantity a buyer can order is cheaper than the normal price.
 */
export function tierTable(basePrice, tiersText, moq = 1) {
  const base = Number(basePrice);
  const tiers = safeTiers(tiersText);
  if (!tiers.length || !Number.isFinite(base) || base <= 0) return [];
  const save = (price) => Math.round((1 - price / base) * 1000) / 10;
  const start = Math.max(1, Math.floor(Number(moq)) || 1);
  const first = unitPriceFor(base, tiersText, start);
  const rows = [{ minQty: start, unitPrice: first, savePct: save(first) }];
  for (const t of tiers) {
    if (t.minQty <= start) continue;
    const unitPrice = unitPriceFor(base, tiersText, t.minQty);
    if (unitPrice >= rows[rows.length - 1].unitPrice) continue;
    rows.push({ minQty: t.minQty, unitPrice, savePct: save(unitPrice) });
  }
  if (rows.length === 1 && rows[0].unitPrice >= base) return [];
  return rows.map((r, i) => ({ ...r, maxQty: rows[i + 1] ? rows[i + 1].minQty - 1 : null }));
}

/** The next cheaper tier above `qty`, for "add N more to pay ₹X each" nudges. */
export function nextTier(basePrice, tiersText, qty) {
  const current = unitPriceFor(basePrice, tiersText, qty);
  for (const t of safeTiers(tiersText)) {
    if (t.minQty > qty) {
      const unitPrice = unitPriceFor(basePrice, tiersText, t.minQty);
      if (unitPrice < current) return { minQty: t.minQty, unitPrice, addQty: t.minQty - qty };
    }
  }
  return null;
}
