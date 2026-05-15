import React, { createContext, useContext, useReducer, useState, useEffect } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'navgrow_cart_v1';
const WISHLIST_KEY = 'navgrow_wishlist_v1';

// ── Load initial state from localStorage ─────────────────────────────────────
const loadCart = () => {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : []; }
  catch { return []; }
};
const loadWishlist = () => {
  try { const s = localStorage.getItem(WISHLIST_KEY); return s ? JSON.parse(s) : []; }
  catch { return []; }
};

// ── Cart reducer ──────────────────────────────────────────────────────────────
const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD': {
      const ex = state.find(i => i.id === action.item.id);
      return ex
        ? state.map(i => i.id === action.item.id ? { ...i, qty: i.qty + 1 } : i)
        : [...state, { ...action.item, qty: 1 }];
    }
    case 'REMOVE':     return state.filter(i => i.id !== action.id);
    case 'UPDATE_QTY': return action.qty < 1
      ? state.filter(i => i.id !== action.id)
      : state.map(i => i.id === action.id ? { ...i, qty: action.qty } : i);
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

  const addItem    = item  => dispatch({ type: 'ADD', item });
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

  const totalItems  = items.reduce((s, i) => s + i.qty, 0);
  const totalAmount = items.reduce((s, i) => s + i.price * i.qty, 0);

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
