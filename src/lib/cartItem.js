/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 | navgrow.org | info@navgrow.org
 *
 * PROPRIETARY & CONFIDENTIAL — Navgrow Engineering Platform v1.0
 * Unauthorised copying or distribution is strictly prohibited.
 */

/**
 * Builds the object we put in the cart from a product.
 *
 * Every "add to cart" button used to spell this shape out by hand, and they
 * drifted: some passed gstRate, some didn't, none passed the HSN code. A cart
 * line missing gstRate silently falls back to 18%, so a 12% item (protective
 * garments, gloves, respirators) displayed a tax the customer was never
 * charged — the cart disagreed with the invoice. Routing every call through
 * one mapper keeps the tax fields attached.
 *
 * Accepts products from either source: the static catalogue uses `hsn` and a
 * numeric `gstRate`, the API uses `hsnCode` and may return a string.
 */
export function toCartItem(product, extra = {}) {
  if (!product) return null;

  const rawRate = product.gstRate ?? product.gst_rate;
  const rate = rawRate === null || rawRate === undefined || rawRate === ''
    ? undefined
    : Number(rawRate);

  return {
    id:       product.id,
    name:     product.name,
    price:    Number(product.price ?? 0),
    mrp:      product.mrp != null ? Number(product.mrp) : undefined,
    image:    product.image || product.imageUrl,
    slug:     product.slug,
    stockQty: product.stockQty ?? product.stock_qty,
    // Tax — the two fields that must never be dropped.
    gstRate:  Number.isFinite(rate) && rate >= 0 ? rate : undefined,
    hsn:      product.hsn || product.hsnCode || product.hsn_code || undefined,
    ...extra,
  };
}

export default toCartItem;
