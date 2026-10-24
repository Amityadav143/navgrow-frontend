/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 · navgrow.org · info@navgrow.org
 * Unauthorised reproduction, modification or distribution is strictly prohibited.
 *
 * RfqContext — manages the B2B "Request for Quote" list, separate from the
 * instant-checkout cart. Buyers add products here, then submit one RFQ for a
 * formal, GST-compliant quotation (the way PSU / railway / industrial buyers
 * actually procure).
 *
 * Each line is keyed by product — or by product AND option for products sold
 * in options (e.g. Cement: UltraTech · OPC 53 and ACC · PPC are separate lines).
 */
import React, { createContext, useContext, useReducer, useEffect, useState, useCallback } from 'react';
import { track } from '@/lib/analytics';
import { lineKeyOf, variantLabel } from '@/lib/variants';

const RfqContext = createContext(null);
const STORAGE_KEY = 'navgrow_rfq_v1';

/** A line's key (older saved lines only have productId). */
export const rfqKeyOf = (i) => i?.key || String(i?.productId ?? '');

const load = () => {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (!s) return [];
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed.filter(i => i && i.productName && i.quantity) : [];
  } catch { return []; }
};

export const rfqReducer = (state, action) => {
  switch (action.type) {
    case 'ADD': {
      const key = rfqKeyOf(action.item);
      const ex = state.find(i => rfqKeyOf(i) === key);
      if (ex) {
        return state.map(i =>
          rfqKeyOf(i) === key
            ? {
                ...i,
                quantity: (i.quantity || 1) + (action.item.quantity || 1),
                // Refresh availability with the latest figures we were given.
                stockQty: action.item.stockQty ?? i.stockQty ?? null,
                outOfStock: action.item.outOfStock ?? i.outOfStock ?? false,
              }
            : i);
      }
      return [...state, { ...action.item, key, quantity: action.item.quantity || 1 }];
    }
    case 'UPDATE_QTY':
      return action.quantity < 1
        ? state.filter(i => rfqKeyOf(i) !== action.key)
        : state.map(i => rfqKeyOf(i) === action.key ? { ...i, quantity: action.quantity } : i);
    case 'UPDATE_SPEC':
      return state.map(i => rfqKeyOf(i) === action.key ? { ...i, specification: action.spec } : i);
    case 'REMOVE':
      return state.filter(i => rfqKeyOf(i) !== action.key);
    case 'CLEAR':
      return [];
    default:
      return state;
  }
};

export const RfqProvider = ({ children }) => {
  const [items, dispatch] = useReducer(rfqReducer, [], load);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  /**
   * Add a product (optionally one of its options) to the quote list.
   * Accepts a product, a cart line (which already carries productId / variantId)
   * or a product plus the chosen option.
   */
  const addToRfq = useCallback((product, quantity = 1, variant = null) => {
    if (!product) return;
    const productId = product.productId ?? product.id;
    const variantId = variant?.id ?? product.variantId ?? null;
    const optionText = variant ? variantLabel(variant) : (product.variantLabel || '');
    const baseName = product.productName || product.name;
    const name = variant && optionText ? `${baseName} — ${optionText}` : product.name;
    // Availability travels with the line so the drawer can say "we'll source it"
    // for out-of-stock items. The server re-checks live stock on submit and flags
    // backorders for the team — this is only for the buyer's reassurance.
    const src = variant || product;
    const raw = src.stockQty ?? src.stock_qty;
    const stockNum = Number(raw);
    const knownStock = raw !== null && raw !== undefined && raw !== '' && Number.isFinite(stockNum);
    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    dispatch({
      type: 'ADD',
      item: {
        key:         lineKeyOf(productId, variantId),
        productId,
        variantId:   variantId || undefined,
        variantLabel: optionText || undefined,
        productName: name,
        slug:        product.slug || '',
        sku:         (variant?.sku) || product.sku || '',
        gstRate:     product.gstRate ?? 18,
        image:       variant?.imageUrl || product.image || product.imageUrl,
        listPrice:   Number(src.price) || null,
        unitLabel:   product.unitLabel || undefined,
        stockQty:    knownStock ? stockNum : null,
        outOfStock:  knownStock ? stockNum <= 0 : src.inStock === false,
        quantity:    qty,
      },
    });
    setDrawerOpen(true);
    track('rfq_add', { label: product.slug || String(productId || ''), value: qty });
  }, []);

  const updateQty  = useCallback((key, quantity) => dispatch({ type: 'UPDATE_QTY', key, quantity }), []);
  const updateSpec = useCallback((key, spec)     => dispatch({ type: 'UPDATE_SPEC', key, spec }), []);
  const removeItem = useCallback((key)           => dispatch({ type: 'REMOVE', key }), []);
  const clearRfq   = useCallback(()              => dispatch({ type: 'CLEAR' }), []);
  /** In the list? Pass a product id (any of its options counts) or a line key. */
  const inRfq      = useCallback((idOrKey) => items.some(i =>
    rfqKeyOf(i) === String(idOrKey) || String(i.productId) === String(idOrKey)), [items]);

  const totalItems = items.reduce((s, i) => s + (i.quantity || 1), 0);

  return (
    <RfqContext.Provider value={{
      items, totalItems, drawerOpen, setDrawerOpen,
      addToRfq, updateQty, updateSpec, removeItem, clearRfq, inRfq,
    }}>
      {children}
    </RfqContext.Provider>
  );
};

export const useRfq = () => {
  const ctx = useContext(RfqContext);
  if (!ctx) throw new Error('useRfq must be used within RfqProvider');
  return ctx;
};

export default RfqContext;
