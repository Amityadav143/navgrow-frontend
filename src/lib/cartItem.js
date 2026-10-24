/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 | navgrow.org | info@navgrow.org
 *
 * PROPRIETARY & CONFIDENTIAL — Navgrow Engineering Platform v1.0
 * Unauthorised copying or distribution is strictly prohibited.
 */

import { effectiveTiers, hasOptions, lineKeyOf, optionNamesOf, variantLabel, variantMoq } from '@/lib/variants';

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
    productId: product.id,
    name:     product.name,
    price:    Number(product.price ?? 0),
    // Bulk prices: the line's unit price is worked out from these and the
    // quantity (same rule as the server), so the cart shows what is charged.
    basePrice: Number(product.price ?? 0),
    priceTiers: effectiveTiers(product, null) || undefined,
    unitLabel: product.unitLabel || undefined,
    // A product sold in options can't go in the cart until one is chosen.
    needsOption: hasOptions(product) || undefined,
    optionNames: hasOptions(product) ? optionNamesOf(product) : undefined,
    mrp:      product.mrp != null ? Number(product.mrp) : undefined,
    image:    product.image || product.imageUrl,
    slug:     product.slug,
    stockQty: product.stockQty ?? product.stock_qty,
    // Minimum order quantity (admin-set) — the cart never goes below it.
    minOrderQty: product.minOrderQty ?? product.min_order_qty ?? 1,
    sku:      product.sku || undefined,
    // Per-product delivery base (admin-set); null → zone default at checkout.
    deliveryCharge: product.deliveryCharge ?? product.delivery_charge ?? null,
    // Tax — the two fields that must never be dropped.
    gstRate:  Number.isFinite(rate) && rate >= 0 ? rate : undefined,
    hsn:      product.hsn || product.hsnCode || product.hsn_code || undefined,
    // Limited delivery area (admin-set) — lets the cart warn early. The server
    // re-checks at checkout and when the order is placed.
    deliveryRestricted: Boolean(product.deliveryRestricted),
    allowedPincodes:    product.allowedPincodes || undefined,
    deliveryAreaNote:   product.deliveryAreaNote || undefined,
    ...extra,
  };
}

/**
 * Cart line for one option of a product (e.g. Cement — UltraTech · OPC 53 ·
 * 50 kg bag). The line id is "productId::variantId", so each option is its own
 * line; productId / variantId go to the server with the order.
 */
export function toVariantCartItem(product, variant, extra = {}) {
  if (!product || !variant) return null;
  const base = toCartItem(product);
  const label = variantLabel(variant);
  const price = Number(variant.price ?? 0);
  return {
    ...base,
    id:           lineKeyOf(product.id, variant.id),
    productId:    product.id,
    variantId:    variant.id,
    variantLabel: label,
    productName:  product.name,
    name:         label ? `${product.name} — ${label}` : product.name,
    price,
    basePrice:    price,
    priceTiers:   effectiveTiers(product, variant) || undefined,
    mrp:          variant.mrp != null ? Number(variant.mrp) : undefined,
    image:        variant.imageUrl || base.image,
    stockQty:     variant.stockQty ?? null,
    minOrderQty:  variantMoq(variant, product),
    sku:          variant.sku || base.sku,
    deliveryCharge: variant.deliveryCharge ?? base.deliveryCharge ?? null,
    needsOption:  undefined,
    optionNames:  undefined,
    ...extra,
  };
}

export default toCartItem;
