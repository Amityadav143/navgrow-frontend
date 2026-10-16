/**
 * © 2024–2026 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 | navgrow.org | info@navgrow.org
 *
 * One definition of "can this be bought online right now?" for every screen —
 * shop cards, product page, recently viewed, wishlist, re-order, cart and
 * checkout. Before this, each screen had its own rule and the copies drifted:
 * a product could be "out of stock" on its page yet addable from Recently
 * Viewed or the wishlist (those keep an old copy without a stock figure).
 *
 * The server is the authority (it re-checks stock and takes it atomically when
 * the order is placed); these helpers keep the UI honest before that.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Is this a product from the live shop (as opposed to the static sample catalogue)? */
export const isLiveId = (id) => UUID_RE.test(String(id ?? ''));

/** Units in stock, or null when unknown (an old saved copy / API unreachable). */
export function stockOf(p) {
  const raw = p?.stockQty ?? p?.stock_qty;
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null;
}

/** Minimum order quantity (at least 1). */
export function moqOf(p) {
  const n = parseInt(p?.minOrderQty ?? p?.min_order_qty ?? 1, 10);
  return Number.isFinite(n) && n > 1 ? n : 1;
}

/**
 * Stock as the LIVE API reports it. A live product whose stock was never set is
 * treated as 0 — never as "unlimited" (that is how sold-out items stayed buyable).
 */
export const liveStock = (raw) => {
  const n = Number(raw);
  return raw === null || raw === undefined || raw === '' || !Number.isFinite(n) ? 0 : Math.max(0, Math.floor(n));
};

/** Known to be NOT buyable online (sold out, or fewer units than the minimum order). */
export function isOutOfStock(p) {
  if (p?.active === false) return true;
  const s = stockOf(p);
  return s !== null && s < moqOf(p);
}

/** Buyable online as far as we know (unknown stock → let the server decide). */
export const isPurchasable = (p) => !isOutOfStock(p);

/** Clamp a wanted quantity to [MOQ, stock] (stock only when known and sufficient). */
export function clampToStock(wanted, p) {
  const moq = moqOf(p);
  let q = Math.max(moq, parseInt(wanted, 10) || moq);
  const s = stockOf(p);
  if (s !== null && s >= moq) q = Math.min(q, s);
  return q;
}

/** Short customer-facing reason, e.g. for a toast or a cart line. */
export function stockReason(p) {
  if (p?.active === false) return 'no longer available';
  const s = stockOf(p);
  const moq = moqOf(p);
  if (s === null) return '';
  if (s <= 0) return 'out of stock';
  if (s < moq) return `only ${s} left (minimum order ${moq})`;
  return '';
}
