/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 · navgrow.org · info@navgrow.org
 * Unauthorised reproduction, modification or distribution is strictly prohibited.
 */
import React, { createContext, useContext, useReducer, useState, useEffect } from 'react';
import { track } from '@/lib/analytics';

const CartContext = createContext(null);
const STORAGE_KEY = 'navgrow_cart_v1';
const WISHLIST_KEY = 'navgrow_wishlist_v1';

// ── Load initial state from localStorage ─────────────────────────────────────
const CART_VERSION = 'v1';
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
  try { const s = localStorage.getItem(WISHLIST_KEY); return s ? JSON.parse(s) : []; }
  catch { return []; }
};

// ── Cart reducer ──────────────────────────────────────────────────────────────
// Clamp a desired quantity to the item's available stock (when known) and a
// sensible floor of 1. Prevents adding more than can be fulfilled, so checkout
// won't fail late on the server.
const clampQty = (desired, item) => {
  let q = Math.max(1, desired);
  const stock = item?.stockQty;
  if (typeof stock === 'number' && stock > 0) q = Math.min(q, stock);
  return q;
};

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD': {
      const requestedQty = action.item.qty && action.item.qty > 1 ? action.item.qty : 1;
      const ex = state.find(i => i.id === action.item.id);
      if (ex) {
        // If explicit qty provided (e.g. from product detail page), use that amount;
        // otherwise increment by 1. Either way, clamp to available stock.
        const target = action.item.qty && action.item.qty > 1
          ? action.item.qty
          : ex.qty + 1;
        return state.map(i => i.id === action.item.id
          ? { ...i, qty: clampQty(target, { ...i, ...action.item }) } : i);
      }
      return [...state, { ...action.item, qty: clampQty(requestedQty, action.item) }];
    }
    case 'REMOVE':     return state.filter(i => i.id !== action.id);
    case 'UPDATE_QTY': return action.qty < 1
      ? state.filter(i => i.id !== action.id)
      : state.map(i => i.id === action.id ? { ...i, qty: clampQty(action.qty, i) } : i);
    case 'CLEAR':      return [];
    default:           return state;
  }
};

// ── Provider ──────────────────────────────────────────────────────────────────
export const CartProvider = ({ children }) => {
  const [items,    dispatch]  = useReducer(cartReducer, [], loadCart);
  const [wishlist, setWishlist] = useState(loadWishlist);
  const [cartOpen, setCartOpen] = useState(false);

  // Persist cart
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  // Persist wishlist
  useEffect(() => {
    try { localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist)); } catch {}
  }, [wishlist]);

  const addItem    = item  => {
    dispatch({ type: 'ADD', item });
    try { track('add_to_cart', { label: item?.name || item?.slug, value: Number(item?.price) || undefined }); } catch {}
  };
  const removeItem = id    => dispatch({ type: 'REMOVE', id });
  const updateQty  = (id, qty) => dispatch({ type: 'UPDATE_QTY', id, qty });
  const clearCart  = ()   => dispatch({ type: 'CLEAR' });

  const toggleWishlist = (item) => {
    setWishlist(prev =>
      prev.some(i => i.id === item.id)
        ? prev.filter(i => i.id !== item.id)
        : [...prev, item]
    );
  };
  const inWishlist = id => wishlist.some(i => i.id === id);
  const moveToCart = (item) => { addItem(item); setWishlist(prev => prev.filter(i => i.id !== item.id)); };

  const totalItems  = items.reduce((s, i) => s + (i.qty  || 1), 0);
  const totalAmount = items.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQty, clearCart,
      totalItems, totalAmount, cartOpen, setCartOpen,
      wishlist, toggleWishlist, inWishlist, moveToCart,
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
