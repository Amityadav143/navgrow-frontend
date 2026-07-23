/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 | navgrow.org | info@navgrow.org
 *
 * PROPRIETARY & CONFIDENTIAL
 * This file is part of the Navgrow Engineering Platform.
 * Unauthorised copying, modification, distribution, or use is prohibited
 * without prior written consent of Navgrow Engineering Service Pvt. Ltd.
 *
 * Licensed for: navgrow.org (Production Deployment Only)
 */
/**
 * CompareDrawer — Side-by-side product comparison panel
 * Supports 2–3 products simultaneously
 * B2B-focused: shows specifications, certifications, bulk pricing
 */
import React, { useState, createContext, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Scale, ChevronDown, ChevronUp, Star, ShoppingCart, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { toCartItem } from '@/lib/cartItem';

const CompareContext = createContext(null);

export const CompareProvider = ({ children }) => {
  const [compareList, setCompareList] = useState([]);
  const [drawerOpen,  setDrawerOpen]  = useState(false);

  const addToCompare = useCallback((product) => {
    setCompareList(prev => {
      if (prev.some(p => p.id === product.id)) return prev;
      if (prev.length >= 3) return prev; // max 3
      const next = [...prev, product];
      if (next.length >= 2) setDrawerOpen(true);
      return next;
    });
  }, []);

  const removeFromCompare = useCallback((id) => {
    setCompareList(prev => {
      const next = prev.filter(p => p.id !== id);
      if (next.length < 1) setDrawerOpen(false);
      return next;
    });
  }, []);

  const clearCompare = useCallback(() => {
    setCompareList([]); setDrawerOpen(false);
  }, []);

  const inCompare = useCallback((id) => compareList.some(p => p.id === id), [compareList]);

  return (
    <CompareContext.Provider value={{ compareList, addToCompare, removeFromCompare, clearCompare, inCompare, drawerOpen, setDrawerOpen }}>
      {children}
      <CompareDrawer />
    </CompareContext.Provider>
  );
};

export const useCompare = () => {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error('useCompare must be inside CompareProvider');
  return ctx;
};

const COMPARE_ROWS = [
  { key: 'price',    label: 'Price',          fmt: v => v ? `₹${Number(v).toLocaleString('en-IN')}` : '—' },
  { key: 'mrp',      label: 'MRP',            fmt: v => v ? `₹${Number(v).toLocaleString('en-IN')}` : '—' },
  { key: 'rating',   label: 'Rating',         fmt: v => v ? `${v} / 5 ★` : '—' },
  { key: 'reviews',  label: 'Reviews',        fmt: v => v || '—' },
  { key: 'gstRate',  label: 'GST Rate',       fmt: v => v ? `${v}%` : '18%' },
  { key: 'inStock',  label: 'Availability',   fmt: v => v !== false ? '✅ In Stock' : '❌ Out of Stock' },
  { key: 'cat',      label: 'Category',       fmt: v => v || '—' },
  { key: 'sku',      label: 'SKU',            fmt: v => v || '—' },
];

const CompareDrawer = () => {
  const { compareList, removeFromCompare, clearCompare, drawerOpen, setDrawerOpen } = useCompare();
  const { addItem, items: cartItems } = useCart();
  const [expanded, setExpanded] = useState(true);

  if (compareList.length < 1) return null;

  return (
    <AnimatePresence>
      {drawerOpen && (
        <motion.div
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 34 }}
          className="fixed bottom-0 left-0 right-0 z-[95] bg-white border-t-2 border-blue-200 shadow-2xl"
          style={{ maxHeight: expanded ? '75vh' : '72px' }}>

          {/* Handle */}
          <div className="flex items-center justify-between px-5 py-3 bg-blue-950 cursor-pointer"
            onClick={() => setExpanded(e => !e)}>
            <div className="flex items-center gap-3">
              <Scale className="h-5 w-5 text-blue-300"/>
              <span className="font-bold text-white text-sm">
                Comparing {compareList.length} product{compareList.length > 1 ? 's' : ''}
              </span>
              <div className="flex gap-1.5">
                {compareList.map(p => (
                  <span key={p.id} className="px-2.5 py-0.5 bg-blue-800 text-blue-200 rounded-full text-xs font-medium truncate max-w-[120px]">
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={e => { e.stopPropagation(); clearCompare(); }}
                className="text-blue-400 hover:text-red-400 text-xs font-semibold transition-colors">
                Clear
              </button>
              {expanded ? <ChevronDown className="h-5 w-5 text-blue-300"/> : <ChevronUp className="h-5 w-5 text-blue-300"/>}
            </div>
          </div>

          {/* Content */}
          {expanded && (
            <div className="overflow-auto" style={{ maxHeight: 'calc(75vh - 56px)' }}>
              <table className="w-full text-sm border-collapse">
                {/* Product header row */}
                <thead>
                  <tr className="border-b border-gray-200">
                    <td className="w-32 px-4 py-3 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wide">Attribute</td>
                    {compareList.map(p => (
                      <td key={p.id} className="px-4 py-3 bg-gray-50 min-w-[200px]">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            {p.image && (
                              <img src={p.image} alt={p.name} loading="lazy"
                                className="w-16 h-16 object-cover rounded-xl mb-2 border border-gray-200"
                                onError={e => { e.target.style.display='none'; }}/>
                            )}
                            <p className="font-bold text-gray-900 text-xs leading-snug line-clamp-2">{p.name}</p>
                            <p className="text-[10px] text-blue-600 font-bold mt-0.5">{p.cat}</p>
                          </div>
                          <button onClick={() => removeFromCompare(p.id)}
                            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors shrink-0">
                            <X className="h-3.5 w-3.5"/>
                          </button>
                        </div>
                      </td>
                    ))}
                  </tr>
                </thead>

                {/* Comparison rows */}
                <tbody>
                  {COMPARE_ROWS.map((row, ri) => {
                    const values = compareList.map(p => p[row.key]);
                    const allSame = values.every(v => String(v) === String(values[0]));
                    return (
                      <tr key={row.key} className={`border-b border-gray-100 ${ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <td className="px-4 py-3 text-xs font-semibold text-gray-500">{row.label}</td>
                        {compareList.map(p => {
                          const rawVal = p[row.key];
                          const formatted = row.fmt(rawVal);
                          const isBest = row.key === 'price' && Number(p.price) === Math.min(...compareList.map(c => Number(c.price)));
                          const isTopRated = row.key === 'rating' && Number(p.rating) === Math.max(...compareList.map(c => Number(c.rating)));
                          return (
                            <td key={p.id} className={`px-4 py-3 text-sm ${isBest || isTopRated ? 'font-bold text-green-700 bg-green-50' : 'text-gray-700'}`}>
                              {formatted}
                              {isBest && row.key === 'price' && <span className="ml-1.5 text-[10px] bg-green-600 text-white px-1.5 py-0.5 rounded-full">Best Price</span>}
                              {isTopRated && row.key === 'rating' && <span className="ml-1.5 text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full">Top Rated</span>}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {/* CTA row */}
                  <tr className="bg-white border-t-2 border-blue-100">
                    <td className="px-4 py-4"/>
                    {compareList.map(p => {
                      const inCart = cartItems.some(c => c.id === p.id);
                      return (
                        <td key={p.id} className="px-4 py-4">
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => addItem(toCartItem(p))}
                              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                                inCart ? 'border-green-400 bg-green-50 text-green-700' : 'border-blue-300 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600'
                              }`}>
                              <ShoppingCart className="h-3.5 w-3.5"/>
                              {inCart ? '✓ In Cart' : 'Add to Cart'}
                            </button>
                            <Link to={`/shop/${p.slug || p.id}`} onClick={() => setDrawerOpen(false)}
                              className="flex items-center justify-center gap-1 text-xs text-blue-600 hover:text-amber-600 font-semibold transition-colors">
                              View Details <ArrowRight className="h-3 w-3"/>
                            </Link>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CompareDrawer;
