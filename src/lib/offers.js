/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 *
 * Offer rules, mirrored from the server.
 *
 * The server is always the authority: every coupon is re-validated in
 * POST /orders before a rupee is discounted, and "one use per customer" is
 * enforced there by a unique (coupon, user) row that this file cannot see.
 *
 * These local definitions exist so the cart and checkout can still explain an
 * offer — its terms, whether the basket qualifies, and how much is missing —
 * when the shop API is unreachable. Without them a shopper offline (or running
 * the site before the backend is up) simply sees "invalid coupon code", which
 * looks like the feature is broken rather than unavailable.
 *
 * Keep in step with V17__coupon_rules_and_redemptions.sql.
 */

export const LOCAL_OFFERS = [
  {
    code: 'NAVGROW10',
    description: '10% off your order',
    type: 'PERCENTAGE',
    value: 10,
    minOrderAmount: 3000,
    maxDiscount: 250,
    oncePerCustomer: true,
  },
];

/** Human-readable terms, e.g. "10% off · up to ₹250 · on orders above ₹3,000". */
export function offerTerms(offer) {
  const rupees = (n) => '₹' + Number(n).toLocaleString('en-IN');
  return [
    offer.type === 'PERCENTAGE' ? `${offer.value}% off` : `${rupees(offer.value)} off`,
    offer.maxDiscount > 0 ? `up to ${rupees(offer.maxDiscount)}` : null,
    offer.minOrderAmount > 0 ? `on orders above ${rupees(offer.minOrderAmount)}` : null,
    offer.oncePerCustomer ? 'one use per customer' : null,
  ].filter(Boolean).join(' · ');
}

/**
 * Evaluates a code against an order value using the mirrored rules.
 * Returns { ok: true, coupon } or { ok: false, message } — the message is
 * phrased for the shopper and says exactly what is missing.
 */
export function evaluateLocalCoupon(code, orderValue) {
  const wanted = String(code || '').trim().toUpperCase();
  const offer = LOCAL_OFFERS.find(o => o.code === wanted);
  if (!offer) return { ok: false, message: 'This coupon code was not recognised.' };

  const value = Number(orderValue) || 0;
  if (offer.minOrderAmount > 0 && value < offer.minOrderAmount) {
    const short = offer.minOrderAmount - value;
    return {
      ok: false,
      message: `${offer.code} applies to orders above ₹${offer.minOrderAmount.toLocaleString('en-IN')}. `
        + `Add ₹${Math.ceil(short).toLocaleString('en-IN')} more to use it.`,
    };
  }

  let discount = offer.type === 'PERCENTAGE'
    ? (value * offer.value) / 100
    : offer.value;
  if (offer.maxDiscount > 0) discount = Math.min(discount, offer.maxDiscount);
  discount = Math.min(Math.round(discount), value);

  return {
    ok: true,
    coupon: { code: offer.code, discount, description: offer.description },
  };
}

/**
 * True when an axios error means "couldn't reach the server" rather than
 * "the server considered this and said no". Only the former should fall back to
 * local rules — a genuine 400 from the server (expired, already used) must be
 * shown to the shopper as-is.
 */
export function isOffline(err) {
  return !err?.response;
}
