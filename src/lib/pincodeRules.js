/**
 * © 2024–2026 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 | navgrow.org | info@navgrow.org
 *
 * Limited-delivery-area rules for a product — the client-side mirror of
 * com.navgrow.util.PincodeRules (the server is the authority; this powers the
 * admin form's instant validation/preview and quick cart hints).
 *
 * A rule list is free text separated by commas, semicolons, spaces or new lines.
 * Each entry is one of:
 *   734001          exact 6-digit pincode
 *   734* or 734     prefix (1–5 digits, '*' optional)
 *   734001-734015   inclusive range
 */

const SPLIT      = /[,;\s]+/;
const EXACT      = /^[1-9]\d{5}$/;
const EXACT_STAR = /^[1-9]\d{5}\*$/;
const PREFIX     = /^[1-9]\d{0,4}\*?$/;
const RANGE      = /^([1-9]\d{5})-([1-9]\d{5})$/;
export const PIN_RE = /^[1-9]\d{5}$/;
export const MAX_ENTRIES = 2000;

/** Raw, non-empty entries in the order written. */
export function entries(rules) {
  if (!rules || !String(rules).trim()) return [];
  return String(rules).trim().split(SPLIT).map(s => s.trim()).filter(Boolean);
}

/** Canonical form of one entry, or null when invalid. */
export function canonical(entry) {
  if (entry == null) return null;
  const t = String(entry).trim().replace(/[–—]/g, '-').replace(/ /g, '');
  if (EXACT.test(t)) return t;
  if (EXACT_STAR.test(t)) return t.slice(0, 6);
  if (PREFIX.test(t)) return t.endsWith('*') ? t : `${t}*`;
  const m = t.match(RANGE);
  if (m) {
    let a = Number(m[1]); let b = Number(m[2]);
    if (a > b) [a, b] = [b, a];
    return a === b ? String(a) : `${a}-${b}`;
  }
  return null;
}

/**
 * Parse + validate a rule list.
 * @returns {{ valid: string[], invalid: string[], exact: number, prefixes: number, ranges: number, normalized: string }}
 */
export function parseRules(rules) {
  const valid = []; const invalid = []; const seen = new Set();
  let exact = 0; let prefixes = 0; let ranges = 0;
  entries(rules).forEach((e) => {
    const c = canonical(e);
    if (c == null) { invalid.push(e); return; }
    if (seen.has(c)) return;
    seen.add(c); valid.push(c);
    if (c.endsWith('*')) prefixes += 1;
    else if (c.includes('-')) ranges += 1;
    else exact += 1;
  });
  return { valid, invalid, exact, prefixes, ranges, normalized: valid.join(', ') };
}

/** Is `pincode` covered by at least one entry of `rules`? */
export function matchesPincode(rules, pincode) {
  const pin = String(pincode ?? '').trim();
  if (!PIN_RE.test(pin)) return false;
  const n = Number(pin);
  return entries(rules).some((e) => {
    const c = canonical(e);
    if (c == null) return false;
    if (c.endsWith('*')) return pin.startsWith(c.slice(0, -1));
    if (c.includes('-')) { const [a, b] = c.split('-').map(Number); return n >= a && n <= b; }
    return c === pin;
  });
}

/** Can a product be delivered to `pincode`? (Unrestricted products: always.) */
export function productDeliversTo(product, pincode) {
  if (!product?.deliveryRestricted) return true;
  return matchesPincode(product.allowedPincodes, pincode);
}

/** Short human label: the admin's note, else "pincodes 734001, 7340* (+3 more)". */
export function areaLabel(product, maxShown = 4) {
  if (product?.deliveryAreaNote && String(product.deliveryAreaNote).trim()) return String(product.deliveryAreaNote).trim();
  const { valid } = parseRules(product?.allowedPincodes);
  if (!valid.length) return 'selected pincodes only';
  const head = valid.slice(0, maxShown).join(', ');
  return `pincodes ${head}${valid.length > maxShown ? ` (+${valid.length - maxShown} more)` : ''}`;
}
