/**
 * © 2024–2026 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 *
 * useLiveAvailability(list) — live stock / price / active state for products we
 * only hold a saved copy of (wishlist, past orders, recently viewed).
 *
 * Returns { live, loading, refresh }, where live[id] is the API's availability
 * entry ({ found, active, inStock, stockQty, minOrderQty, price, … }) or
 * undefined while unknown. Only live-shop ids are asked about.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { productsApi } from '@/lib/api';
import { isLiveId } from '@/lib/stock';

export default function useLiveAvailability(list) {
  const ids = useMemo(
    () => Array.from(new Set((Array.isArray(list) ? list : [])
      .map(p => String(p?.id ?? p?.productId ?? '')).filter(isLiveId))),
    [list],
  );
  const key = ids.join(',');
  const [live, setLive] = useState({});
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    if (!key) { setLive({}); return Promise.resolve({}); }
    setLoading(true);
    return productsApi.availability(key.split(','))
      .then(({ data }) => {
        const map = {};
        (Array.isArray(data) ? data : []).forEach(a => {
          if (!a) return;
          if (a.ref) map[a.ref] = a;
          if (a.id) map[String(a.id)] = a;
        });
        setLive(map);
        return map;
      })
      .catch(() => ({}))
      .finally(() => setLoading(false));
  }, [key]);

  useEffect(() => { refresh(); }, [refresh]);

  return { live, loading, refresh };
}

/** A saved product merged with its live entry (price, stock, MOQ, active). */
export function withLive(item, a) {
  if (!a) return item;
  if (a.found === false) return { ...item, active: false, unavailable: true };
  return {
    ...item,
    name: a.name || item.name,
    slug: a.slug || item.slug,
    price: a.price != null ? Number(a.price) : item.price,
    mrp: a.mrp != null ? Number(a.mrp) : item.mrp,
    gstRate: a.gstRate != null ? Number(a.gstRate) : item.gstRate,
    image: item.image || a.imageUrl || '',
    stockQty: Number(a.stockQty ?? 0),
    minOrderQty: Number(a.minOrderQty ?? 1),
    active: a.active !== false,
    unavailable: a.active === false,
    // Sold in options (brand / grade / size…): the buyer picks one on the product page.
    hasVariants: !!a.hasVariants,
    variants: Array.isArray(a.variants) ? a.variants : undefined,
    optionNames: a.optionNames || undefined,
    unitLabel: a.unitLabel || item.unitLabel,
    priceMax: a.priceMax != null ? Number(a.priceMax) : undefined,
  };
}
