/**
 * © 2024–2026 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 *
 * The options / bulk-pricing part of a live API product, in the shape every
 * screen uses. Spread it into each screen's own product mapping so shop cards,
 * the product page, related products and the home preview all agree.
 */
import { liveStock } from '@/lib/stock';

export function liveOptionFields(p) {
  const raw = Array.isArray(p?.variants) ? p.variants.filter(Boolean) : [];
  const variants = raw.map(v => ({
    id: v.id,
    sku: v.sku || '',
    option1: v.option1 || '',
    option2: v.option2 || '',
    option3: v.option3 || '',
    label: v.label || [v.option1, v.option2, v.option3].filter(Boolean).join(' · '),
    price: Number(v.price),
    mrp: v.mrp != null ? Number(v.mrp) : null,
    // Live stock is never "unknown": an option whose stock was never set is 0.
    stockQty: liveStock(v.stockQty),
    minOrderQty: v.minOrderQty ?? null,
    priceTiers: v.priceTiers || null,
    deliveryCharge: v.deliveryCharge ?? null,
    imageUrl: v.imageUrl || '',
    active: v.active !== false,
  }));
  const optionNames = Array.isArray(p?.optionNames) && p.optionNames.length
    ? p.optionNames
    : [p?.option1Name, p?.option2Name, p?.option3Name].filter(Boolean);
  return {
    hasVariants: !!p?.hasVariants || variants.length > 0,
    variants,
    optionNames,
    unitLabel: p?.unitLabel || '',
    priceTiers: p?.priceTiers || null,
    priceMax: p?.priceMax != null ? Number(p.priceMax) : null,
    priceUpdatedAt: p?.priceUpdatedAt || null,
  };
}

export default liveOptionFields;
