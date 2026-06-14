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
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowRight, Briefcase, Package, FileText, Users, Phone, Info, Map, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { productsApi, newsApi, debounce } from '@/lib/api';

const STATIC_INDEX = [
  { label: 'Home',                    path: '/',                      icon: Info,      cat: 'Pages' },
  { label: 'About Us',                path: '/about',                 icon: Info,      cat: 'Pages' },
  { label: 'Services',                path: '/services',              icon: Briefcase, cat: 'Pages' },
  { label: 'Railway Infrastructure',  path: '/services#railway-infrastructure', icon: Briefcase, cat: 'Services' },
  { label: 'Government Contracts',    path: '/services#government-contracts',   icon: Briefcase, cat: 'Services' },
  { label: 'Maintenance Services',    path: '/services#maintenance',            icon: Briefcase, cat: 'Services' },
  { label: 'Consulting Services',     path: '/services#consulting',             icon: Briefcase, cat: 'Services' },
  { label: 'Safety & Compliance',     path: '/services#safety',                 icon: Briefcase, cat: 'Services' },
  { label: 'Technology Solutions',    path: '/services#technology',             icon: Briefcase, cat: 'Services' },
  { label: 'Projects',                path: '/projects',              icon: FileText,  cat: 'Pages' },
  { label: 'Shop',                    path: '/shop',                  icon: Package,   cat: 'Pages' },
  { label: 'Careers',                 path: '/careers',               icon: Users,     cat: 'Pages' },
  { label: 'News & Updates',          path: '/news',                  icon: FileText,  cat: 'Pages' },
  { label: 'Gallery',                 path: '/gallery',               icon: Map,       cat: 'Pages' },
  { label: 'Contact Us',              path: '/contact',               icon: Phone,     cat: 'Pages' },
  { label: 'Track Order',             path: '/track-order',           icon: Package,   cat: 'Pages' },
  { label: 'My Account',              path: '/account',               icon: Users,     cat: 'Pages' },
];

export const useSearchModal = () => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setOpen(o => !o); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  return { open, setOpen };
};

const SearchModal = ({ open, onClose }) => {
  const [q, setQ]               = useState('');
  const [products, setProducts] = useState([]);
  const [news,     setNews]     = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [activeIdx,setActiveIdx]= useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) { setQ(''); setProducts([]); setNews([]); setActiveIdx(0); setTimeout(() => inputRef.current?.focus(), 80); }
  }, [open]);

  // Live search with 300ms debounce
  const doSearch = useCallback(
    debounce(async (query) => {
      if (!query || query.length < 2) { setProducts([]); setNews([]); setLoading(false); return; }
      setLoading(true);
      try {
        const [pRes, nRes] = await Promise.allSettled([
          productsApi.list({ q: query, size: 5, active: true }),
          newsApi.list({ q: query, size: 3, status: 'PUBLISHED' }),
        ]);
        const pData = pRes.status === 'fulfilled' ? (pRes.value.data?.content || []) : [];
        const nData = nRes.status === 'fulfilled' ? (nRes.value.data?.content || Array.isArray(nRes.value.data) ? (nRes.value.data?.content || nRes.value.data) : []) : [];
        setProducts(pData);
        setNews(Array.isArray(nData) ? nData : []);
      } catch { setProducts([]); setNews([]); }
      finally { setLoading(false); }
    }, 300),
    []
  );

  useEffect(() => {
    if (q.trim().length >= 2) { setLoading(true); doSearch(q.trim()); }
    else { setProducts([]); setNews([]); setLoading(false); }
  }, [q]);

  // Static results for short queries
  const staticResults = q.trim().length >= 2
    ? STATIC_INDEX.filter(i => i.label.toLowerCase().includes(q.toLowerCase()) || i.cat.toLowerCase().includes(q.toLowerCase()))
    : STATIC_INDEX.filter(i => i.cat === 'Pages');

  // Combined flat results for keyboard navigation
  const allResults = [
    ...products.map(p => ({ label: p.name, path: `/shop/${p.slug || p.id}`, icon: Package, cat: 'Products', sub: `₹${Number(p.price).toLocaleString('en-IN')}`, img: p.imageUrl })),
    ...news.map(n => ({ label: n.title, path: `/news/${n.slug || n.id}`, icon: FileText, cat: 'News', sub: n.category })),
    ...staticResults,
  ];

  const go = useCallback((path) => { navigate(path); onClose(); }, [navigate, onClose]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, allResults.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && allResults[activeIdx]) go(allResults[activeIdx].path);
  };

  // Group results by category
  const grouped = allResults.reduce((acc, r, idx) => {
    if (!acc[r.cat]) acc[r.cat] = [];
    acc[r.cat].push({ ...r, _idx: idx });
    return acc;
  }, {});

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[150] flex items-start justify-center pt-16 sm:pt-24 px-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm" onClick={onClose}/>
          <motion.div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden"
            initial={{ scale: 0.95, y: -16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: -16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}>

            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
              {loading
                ? <Loader2 className="h-5 w-5 text-blue-500 shrink-0 animate-spin"/>
                : <Search className="h-5 w-5 text-gray-400 shrink-0"/>
              }
              <input
                ref={inputRef}
                value={q}
                onChange={e => { setQ(e.target.value); setActiveIdx(0); }}
                placeholder="Search products, news, services…"
                className="flex-1 text-gray-900 placeholder-gray-400 text-base focus:outline-none bg-transparent"
                onKeyDown={handleKeyDown}
              />
              {q
                ? <button onClick={() => { setQ(''); setProducts([]); setNews([]); }} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="h-4 w-4"/></button>
                : <kbd className="hidden sm:block px-2 py-1 bg-gray-100 text-gray-400 text-xs rounded-lg font-mono">⌘K</kbd>
              }
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto py-2">
              {q.trim().length >= 2 && !loading && allResults.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-30"/>
                  No results for "{q}"
                </div>
              ) : (
                Object.entries(grouped).map(([cat, catItems]) => (
                  <div key={cat}>
                    <p className="px-4 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{cat}</p>
                    {catItems.map((item) => (
                      <button key={item._idx} onClick={() => go(item.path)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left group ${
                          activeIdx === item._idx ? 'bg-blue-50' : 'hover:bg-blue-50'
                        }`}>
                        {item.img
                          ? <img loading="lazy" decoding="async" src={item.img} alt="" className="w-8 h-8 rounded-lg object-cover bg-gray-100 shrink-0"
                              onError={e => { e.target.onerror=null; e.target.style.display='none'; }}/>
                          : <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100">
                              <item.icon className="h-4 w-4 text-blue-600"/>
                            </div>
                        }
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-800 text-sm font-medium truncate">{item.label}</p>
                          {item.sub && <p className="text-gray-400 text-xs truncate">{item.sub}</p>}
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"/>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-400 flex items-center gap-4">
              <span><kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono">↑↓</kbd> navigate</span>
              <span><kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono">↵</kbd> open</span>
              <span><kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono">Esc</kbd> close</span>
              {q.trim().length >= 2 && (
                <span className="ml-auto text-blue-600 font-semibold">{allResults.length} result{allResults.length !== 1 ? 's' : ''}</span>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SearchModal;
