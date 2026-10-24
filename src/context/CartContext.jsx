/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 · navgrow.org · info@navgrow.org
 * Unauthorised reproduction, modification or distribution is strictly prohibited.
 *
 * CartContext — the cart and wishlist.
 *
 * Stock rules live HERE, not in each button: every "Add to cart" in the app
 * (shop, product page, recently viewed, wishlist, compare, re-order…) goes
 * through addItem(), which refuses items that are out of stock and checks a
 * saved copy (no stock figure) with the live shop first. The cart also
 * re-checks every line against live stock and prices whenever it is opened,
 * on checkout and when the tab regains focus, and flags lines that can no
 * longer be bought so checkout is blocked until they're fixed. The server
 * still has the final word when the order is placed.
 */
import React, {
  createContext, useContext, useReducer, useState, useEffect, useCallback, useRef, useMemo,
} from 'react';
import { track } from '@/lib/analytics';
import { productsApi } from '@/lib/api';
import RfqContext from '@/context/RfqContext';
import { toast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { stockOf, moqOf, isOutOfStock, clampToStock, isLiveId } from '@/lib/stock';
import { unitPriceFor } from '@/lib/pricing';
import { productIdOf, optionNamesOf } from '@/lib/variants';

const CartContext = createContext(null);
const STORAGE_KEY = 'navgrow_cart_v1';
const WISHLIST_KEY = 'navgrow_wishlist_v1';
const RESYNC_MS = 15000;

// ── Load initial state from localStorage ─────────────────────────────────────
const loadCart = () => {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (!s) return [];
    const parsed = JSON.parse(s);
    // Validate structure — must be array of objects with id/price/qty
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(i => i && typeof i.id !== 'undefined' && typeof i.price === 'number');
  } catch { return []; }
};
const loadWishlist = () => {
  try { const s = localStorage.getItem(WISHLIST_KEY); const v = s ? JSON.parse(s) : []; return Array.isArray(v) ? v : []; }
  catch { return []; }
};

/**
 * A line's unit price for its quantity — the normal price, or the bulk price
 * the quantity qualifies for (same rule as the server, see lib/pricing.js).
 * Lines saved before bulk pricing existed simply keep their price.
 */
export const linePrice = (line, qty = line?.qty) => {
  const base = Number(line?.basePrice);
  if (!Number.isFinite(base) || base <= 0) return line?.price;
  return unitPriceFor(base, line.priceTiers, Number(qty) || 1);
};

/**
 * Copy live facts (stock, price, bulk prices, tax, delivery area) onto a saved
 * line. A line for one option of a product takes that option's figures; if
 * the option is gone, or the product now needs an option chosen, the line is
 * flagged so checkout waits until it's fixed.
 */
export const mergeLive = (item, a) => {
  const shared = {
    ...item,
    slug:     a.slug || item.slug,
    gstRate:  a.gstRate != null ? Number(a.gstRate) : item.gstRate,
    hsn:      a.hsnCode || item.hsn,
    image:    item.image || a.imageUrl || '',
    active:   a.active !== false,
    unitLabel: a.unitLabel || item.unitLabel,
    deliveryRestricted: !!a.deliveryRestricted,
    allowedPincodes:    a.allowedPincodes || undefined,
    deliveryAreaNote:   a.deliveryAreaNote || undefined,
    checkedAt: Date.now(),
  };
  if (item.variantId) {
    const v = (Array.isArray(a.variants) ? a.variants : []).find(x => String(x.id) === String(item.variantId));
    if (!v) return { ...shared, unavailable: true };
    const label = v.label || item.variantLabel || '';
    const baseName = a.name || item.productName || String(item.name || '').split(' — ')[0];
    const price = v.price != null ? Number(v.price) : item.basePrice ?? item.price;
    return {
      ...shared,
      productName:  baseName,
      variantLabel: label,
      name:         label ? `${baseName} — ${label}` : baseName,
      price,
      basePrice:    price,
      priceTiers:   v.priceTiers || undefined,
      mrp:          v.mrp != null ? Number(v.mrp) : undefined,
      stockQty:     Number(v.stockQty ?? 0),
      minOrderQty:  Number(v.minOrderQty ?? 1),
      sku:          v.sku || item.sku,
      deliveryCharge: v.deliveryCharge ?? item.deliveryCharge ?? null,
      active:       a.active !== false && v.active !== false,
      unavailable:  a.found === false || a.active === false || v.active === false,
    };
  }
  // A plain line for a product that is now sold in options: one must be chosen.
  if (a.hasVariants) return { ...shared, needsOption: true, unavailable: true };
  const price = a.price != null ? Number(a.price) : item.price;
  return {
    ...shared,
    name:     a.name || item.name,
    price,
    basePrice: price,
    priceTiers: a.priceTiers || undefined,
    mrp:      a.mrp != null ? Number(a.mrp) : item.mrp,
    stockQty: Number(a.stockQty ?? 0),
    minOrderQty: Number(a.minOrderQty ?? 1),
    deliveryCharge: a.deliveryCharge ?? item.deliveryCharge ?? null,
    needsOption: undefined,
    unavailable: a.found === false || a.active === false,
  };
};

/** Why a cart line can't be bought right now (null when it can). */
export const lineIssue = (i) => {
  if (!i) return null;
  // Not a live-shop product (an old sample-catalogue line): it can't be ordered.
  if (!isLiveId(productIdOf(i))) return 'unavailable';
  if (i.needsOption && !i.variantId) return 'unavailable';
  if (i.unavailable || i.active === false) return 'unavailable';
  if (isOutOfStock(i)) return 'out_of_stock';
  const s = stockOf(i);
  if (s !== null && i.qty > s) return 'exceeds';
  return null;
};

/** A line that can't be bought at all (as opposed to one whose quantity just needs lowering). */
export const isBlockedLine = (i) => {
  const x = lineIssue(i);
  return x === 'out_of_stock' || x === 'unavailable';
};

// ── Cart reducer (exported for tests) ─────────────────────────────────────────
export const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD': {
      const { item, mode } = action;
      const wantQty = item.qty && item.qty > 0 ? item.qty : null;
      const ex = state.find(i => i.id === item.id);
      if (ex) {
        const merged = { ...ex, ...item, unavailable: false };
        // 'set' (Buy now): the line becomes exactly what was chosen;
        // otherwise add on top of what's already in the cart.
        const target = mode === 'set' ? (wantQty ?? ex.qty) : ex.qty + (wantQty ?? 1);
        const qty = clampToStock(target, merged);
        return state.map(i => i.id === item.id ? { ...merged, qty, price: linePrice(merged, qty) } : i);
      }
      const qty = clampToStock(wantQty ?? moqOf(item), item);
      return [...state, { ...item, qty, price: linePrice(item, qty) }];
    }
    case 'SYNC': {
      const { live } = action;
      return state.map(i => {
        const a = live[productIdOf(i)] || (i.slug ? live[i.slug] : null);
        if (!a) return i;
        if (a.found === false) return { ...i, unavailable: true, checkedAt: Date.now() };
        const m = mergeLive(i, a);
        const s = stockOf(m);
        const moq = moqOf(m);
        if (!m.unavailable && s !== null && s >= moq) {
          const q = clampToStock(i.qty, m);
          m.qtyNote = q < i.qty ? `Only ${s} available — quantity updated`
                    : q > i.qty ? `Minimum order is ${moq} — quantity updated` : undefined;
          m.qty = q;
        } else {
          m.qtyNote = undefined;
        }
        m.price = linePrice(m, m.qty);
        return m;
      });
    }
    case 'REMOVE':     return state.filter(i => i.id !== action.id);
    case 'UPDATE_QTY': return action.qty < 1
      ? state.filter(i => i.id !== action.id)
      : state.map(i => {
          if (i.id !== action.id) return i;
          const qty = clampToStock(action.qty, i);
          return { ...i, qty, price: linePrice(i, qty), qtyNote: undefined };
        });
    case 'CLEAR':      return [];
    default:           return state;
  }
};

// ── Provider ──────────────────────────────────────────────────────────────────
export const CartProvider = ({ children }) => {
  const [items,    dispatch]  = useReducer(cartReducer, [], loadCart);
  const [wishlist, setWishlist] = useState(loadWishlist);
  const [cartOpen, setCartOpen] = useState(false);
  const [syncing,  setSyncing]  = useState(false);
  const rfq = useContext(RfqContext);            // optional: may be absent in tests

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const lastSyncAt = useRef(0);
  const inflight = useRef(null);

  // Persist cart
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  // Persist wishlist
  useEffect(() => {
    try { localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist)); } catch {}
  }, [wishlist]);

  // ── Messages ──────────────────────────────────────────────────────────────
  const quoteAction = useCallback((item, qty) => (rfq ? (
    <ToastAction altText="Request a quote instead" onClick={() => rfq.addToRfq(item, qty || moqOf(item))}>
      Request quote
    </ToastAction>
  ) : undefined), [rfq]);

  const notifyNotBuyable = useCallback((item, qty) => {
    const s = stockOf(item);
    const moq = moqOf(item);
    const gone = item?.unavailable || item?.active === false;
    toast({
      title: gone ? `${item?.name || 'This product'} is no longer available`
           : s !== null && s > 0 && s < moq ? `Only ${s} left — minimum order is ${moq}`
           : `${item?.name || 'This product'} is out of stock`,
      description: gone
        ? 'It has been removed from the shop.'
        : "It can't be bought online right now. Request a quote and we'll source it and confirm the lead time.",
      action: gone ? undefined : quoteAction(item, qty),
    });
  }, [quoteAction]);

  // ── Live re-check of every line (stock, price, availability) ─────────────────
  const syncAvailability = useCallback(({ force = false, announce = true } = {}) => {
    const lines = itemsRef.current;
    // One lookup per product (several options of one product share it).
    const ids = Array.from(new Set(lines.map(productIdOf).filter(isLiveId)));
    if (!ids.length) return Promise.resolve({ ok: true, issues: [], changed: [] });
    if (!force && Date.now() - lastSyncAt.current < RESYNC_MS) return Promise.resolve({ ok: true, cached: true, issues: [], changed: [] });
    if (inflight.current) return inflight.current;
    setSyncing(true);
    inflight.current = productsApi.availability(ids)
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        const live = {};
        list.forEach(a => {
          if (!a) return;
          if (a.ref) live[a.ref] = a;
          if (a.id) live[String(a.id)] = a;
          if (a.slug) live[a.slug] = a;
        });
        // What the cart looks like after this check (same pure reducer as the
        // dispatch below), so the shopper is told once and callers like checkout
        // can act on it immediately.
        const next = cartReducer(lines, { type: 'SYNC', live });
        dispatch({ type: 'SYNC', live });
        lastSyncAt.current = Date.now();

        const nowBlocked = [];   // could be bought before, can't now
        const repriced = [];     // still buyable, price moved
        const changed = [];      // still buyable, price or quantity moved
        next.forEach((after, idx) => {
          const before = lines[idx];
          if (!before || isBlockedLine(after)) {
            if (before && !isBlockedLine(before) && isBlockedLine(after)) nowBlocked.push(before.name);
            return;
          }
          const priceMoved = Math.abs(Number(after.price) - Number(before.price)) >= 0.01;
          if (priceMoved) repriced.push(before.name);
          if (priceMoved || after.qty !== before.qty) changed.push({ item: after, before });
        });
        const issues = next
          .map(i => ({ item: i, issue: lineIssue(i) }))
          .filter(x => x.issue === 'out_of_stock' || x.issue === 'unavailable');

        if (announce && (nowBlocked.length || repriced.length)) {
          const one = nowBlocked.length === 1;
          toast({
            title: nowBlocked.length
              ? (one ? 'An item in your cart is out of stock' : 'Some items in your cart are out of stock')
              : 'Cart prices updated',
            description: [
              nowBlocked.length ? `${nowBlocked.slice(0, 3).join(', ')}${nowBlocked.length > 3 ? '…' : ''} can't be bought right now — move ${one ? 'it' : 'them'} to a quote or remove ${one ? 'it' : 'them'}.` : '',
              repriced.length ? `Latest price applied to ${repriced.slice(0, 3).join(', ')}${repriced.length > 3 ? '…' : ''}.` : '',
            ].filter(Boolean).join(' '),
          });
        }
        return { ok: true, issues, changed };
      })
      .catch(() => ({ ok: false, issues: [], changed: [] }))   // offline: the server re-checks stock when the order is placed
      .finally(() => { inflight.current = null; setSyncing(false); });
    return inflight.current;
  }, []);

  // Re-check on load (a saved cart may be days old) and when the tab regains focus.
  useEffect(() => {
    if (itemsRef.current.length) syncAvailability({ force: true, announce: true });
    const onFocus = () => { if (itemsRef.current.length) syncAvailability({ announce: true }); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [syncAvailability]);

  // …and every time the cart drawer opens.
  useEffect(() => { if (cartOpen) syncAvailability({ announce: true }); }, [cartOpen, syncAvailability]);

  // ── Add to cart (the single gate for every "Add" / "Buy now" button) ─────────
  const addItem = useCallback((item, opts = {}) => {
    if (!item || item.id == null) return Promise.resolve({ ok: false });
    const doAdd = (it) => {
      dispatch({ type: 'ADD', item: it, mode: opts.mode });
      try { track('add_to_cart', { label: it?.name || it?.slug, value: Number(it?.price) || undefined }); } catch {}
      return { ok: true, item: it };
    };
    // Only products from the live shop can be ordered. The built-in sample
    // catalogue (shown when the shop can't be reached) is for browsing — the
    // server would reject it at checkout, after the buyer has filled everything in.
    const pid = productIdOf(item);
    if (!isLiveId(pid)) {
      toast({
        title: `${item?.name || 'This product'} can't be bought online right now`,
        description: "We couldn't confirm it with the live shop. Request a quote and our team will confirm price and availability.",
        action: quoteAction(item, item.qty),
      });
      return Promise.resolve({ ok: false, reason: 'not_live' });
    }
    // A product sold in options (brand / grade / size…) needs one chosen first.
    if (item.needsOption && !item.variantId) {
      const names = optionNamesOf(item);
      toast({
        title: `Choose ${names.length ? names.join(' / ').toLowerCase() : 'an option'} first`,
        description: `${item.name || 'This product'} comes in several options with different prices — pick one on the product page.`,
      });
      return Promise.resolve({ ok: false, reason: 'needs_option' });
    }
    if (isOutOfStock(item)) {
      notifyNotBuyable(item, item.qty);
      return Promise.resolve({ ok: false, reason: 'out_of_stock' });
    }
    // A saved copy with no stock figure (recently viewed, wishlist, re-order):
    // ask the live shop first instead of trusting an old snapshot.
    if (stockOf(item) === null) {
      return productsApi.availability([pid])
        .then(({ data }) => {
          const a = (Array.isArray(data) ? data : []).find(x => String(x?.id) === pid || x?.ref === pid);
          if (!a) return doAdd(item);
          if (a.hasVariants && !item.variantId) {
            toast({
              title: 'Choose an option first',
              description: `${a.name || item.name || 'This product'} comes in several options with different prices — pick one on the product page.`,
            });
            return { ok: false, reason: 'needs_option' };
          }
          if (a.found === false || a.active === false) {
            notifyNotBuyable({ ...item, unavailable: true });
            return { ok: false, reason: 'unavailable' };
          }
          const live = mergeLive(item, a);
          if (live.unavailable) {
            notifyNotBuyable({ ...live, unavailable: true });
            return { ok: false, reason: 'unavailable' };
          }
          if (isOutOfStock(live)) {
            notifyNotBuyable(live, item.qty);
            return { ok: false, reason: 'out_of_stock' };
          }
          return doAdd(live);
        })
        .catch(() => doAdd(item));     // offline — the cart/checkout re-check before payment
    }
    return Promise.resolve(doAdd(item));
  }, [notifyNotBuyable, quoteAction]);

  const removeItem = useCallback(id => dispatch({ type: 'REMOVE', id }), []);
  const updateQty  = useCallback((id, qty) => dispatch({ type: 'UPDATE_QTY', id, qty }), []);
  const clearCart  = useCallback(() => dispatch({ type: 'CLEAR' }), []);

  /** Out-of-stock line → quote list (we'll source it), then out of the cart. */
  const moveToQuote = useCallback((id) => {
    const line = itemsRef.current.find(i => i.id === id);
    if (!line) return;
    if (rfq) rfq.addToRfq(line, line.qty || moqOf(line));
    dispatch({ type: 'REMOVE', id });
  }, [rfq]);

  const toggleWishlist = (item) => {
    setWishlist(prev =>
      prev.some(i => i.id === item.id)
        ? prev.filter(i => i.id !== item.id)
        : [...prev, item]
    );
  };
  const inWishlist = id => wishlist.some(i => i.id === id);
  // Only leaves the wishlist when it really made it into the cart.
  const moveToCart = (item) => addItem(item).then(r => {
    if (r?.ok) setWishlist(prev => prev.filter(i => i.id !== item.id));
    return r;
  });

  const totalItems  = items.reduce((s, i) => s + (i.qty  || 1), 0);
  const totalAmount = items.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);

  // Lines that block checkout, for the cart and checkout screens.
  const cartIssues = useMemo(
    () => items.map(i => ({ item: i, issue: lineIssue(i) })).filter(x => x.issue),
    [items],
  );
  // What can actually be paid for right now — totals are shown for these only,
  // so a sold-out line never inflates the amount on screen.
  const payableItems = useMemo(() => items.filter(i => !isBlockedLine(i)), [items]);

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQty, clearCart,
      totalItems, totalAmount, cartOpen, setCartOpen,
      wishlist, toggleWishlist, inWishlist, moveToCart,
      syncAvailability, syncing, cartIssues, hasCartIssues: cartIssues.length > 0, moveToQuote,
      payableItems,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be inside CartProvider');
  return ctx;
};
