/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 · navgrow.org · info@navgrow.org
 * Unauthorised reproduction, modification or distribution is strictly prohibited.
 *
 * RfqContext — manages the B2B "Request for Quote" list, separate from the
 * instant-checkout cart. Buyers add products here, then submit one RFQ for a
 * formal, GST-compliant quotation (the way PSU / railway / industrial buyers
 * actually procure).
 */
import React, { createContext, useContext, useReducer, useEffect, useState, useCallback } from 'react';
import { track } from '@/lib/analytics';

const RfqContext = createContext(null);
const STORAGE_KEY = 'navgrow_rfq_v1';

const load = () => {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (!s) return [];
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed.filter(i => i && i.productName && i.quantity) : [];
  } catch { return []; }
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'ADD': {
      const ex = state.find(i => i.productId === action.item.productId);
      if (ex) {
        return state.map(i =>
          i.productId === action.item.productId
            ? {
                ...i,
                quantity: (i.quantity || 1) + (action.item.quantity || 1),
                // Refresh availability with the latest figures we were given.
                stockQty: action.item.stockQty ?? i.stockQty ?? null,
                outOfStock: action.item.outOfStock ?? i.outOfStock ?? false,
              }
            : i);
      }
      return [...state, { ...action.item, quantity: action.item.quantity || 1 }];
    }
    case 'UPDATE_QTY':
      return action.quantity < 1
        ? state.filter(i => i.productId !== action.productId)
        : state.map(i => i.productId === action.productId ? { ...i, quantity: action.quantity } : i);
    case 'UPDATE_SPEC':
      return state.map(i => i.productId === action.productId ? { ...i, specification: action.spec } : i);
    case 'REMOVE':
      return state.filter(i => i.productId !== action.productId);
    case 'CLEAR':
      return [];
    default:
      return state;
  }
};

export const RfqProvider = ({ children }) => {
  const [items, dispatch] = useReducer(reducer, [], load);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  const addToRfq = useCallback((product, quantity = 1) => {
    if (!product) return;
    // Availability travels with the line so the drawer can say "we'll source it"
    // for out-of-stock items. The server re-checks live stock on submit and flags
    // backorders for the team — this is only for the buyer's reassurance.
    const raw = product.stockQty ?? product.stock_qty;
    const stockNum = Number(raw);
    const knownStock = raw !== null && raw !== undefined && raw !== '' && Number.isFinite(stockNum);
    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    dispatch({
      type: 'ADD',
      item: {
        productId:   product.id,
        productName: product.name,
        slug:        product.slug || '',
        sku:         product.sku || '',
        gstRate:     product.gstRate ?? 18,
        image:       product.image || product.imageUrl,
        listPrice:   product.price || null,
        stockQty:    knownStock ? stockNum : null,
        outOfStock:  knownStock ? stockNum <= 0 : product.inStock === false,
        quantity:    qty,
      },
    });
    setDrawerOpen(true);
    track('rfq_add', { label: product.slug || String(product.id || ''), value: qty });
  }, []);

  const updateQty  = useCallback((productId, quantity) => dispatch({ type: 'UPDATE_QTY', productId, quantity }), []);
  const updateSpec = useCallback((productId, spec)     => dispatch({ type: 'UPDATE_SPEC', productId, spec }), []);
  const removeItem = useCallback((productId)           => dispatch({ type: 'REMOVE', productId }), []);
  const clearRfq   = useCallback(()                    => dispatch({ type: 'CLEAR' }), []);
  const inRfq      = useCallback((productId)           => items.some(i => i.productId === productId), [items]);

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
