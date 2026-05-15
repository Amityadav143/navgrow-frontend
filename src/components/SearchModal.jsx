import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowRight, Briefcase, Package, FileText, Users, Phone, Info, Map } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const INDEX = [
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
  { label: 'Terms & Conditions',      path: '/terms',                 icon: FileText,  cat: 'Legal' },
  { label: 'Privacy Policy',          path: '/privacy',               icon: FileText,  cat: 'Legal' },
  { label: 'Refund & Shipping Policy',path: '/refund-policy',         icon: FileText,  cat: 'Legal' },
  { label: 'Track Order',          path: '/track-order',          icon: Package,   cat: 'Pages' },
  { label: 'My Account',           path: '/account',              icon: Users,     cat: 'Pages' },
  { label: 'Sitemap',                 path: '/sitemap',               icon: Map,       cat: 'Legal' },
  { label: 'Safety Helmet',           path: '/shop/industrial-safety-helmet-isi', icon: Package, cat: 'Shop' },
  { label: 'Railway Tools',           path: '/shop?cat=Railway+Tools', icon: Package,  cat: 'Shop' },
  { label: 'Torque Wrench',           path: '/shop/digital-torque-wrench', icon: Package, cat: 'Shop' },
  { label: 'PPE & Workwear',          path: '/shop?cat=PPE+%26+Workwear', icon: Package, cat: 'Shop' },
  { label: 'Anti-Corrosion Spray',    path: '/shop/anti-corrosion-penetrant-spray', icon: Package, cat: 'Shop' },
  { label: 'PPE Workwear',            path: '/shop',                  icon: Package,   cat: 'Shop'  },
  { label: 'Loco Modification',       path: '/services#railway-infrastructure', icon: Briefcase, cat: 'Services' },
  { label: 'Shed Construction',       path: '/services#railway-infrastructure', icon: Briefcase, cat: 'Services' },
];

export const useSearchModal = () => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const handler = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setOpen(o => !o); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  return { open, setOpen };
};

const SearchModal = ({ open, onClose }) => {
  const [q, setQ]           = useState('');
  const inputRef            = useRef(null);
  const navigate            = useNavigate();

  useEffect(() => { if (open) { setQ(''); setTimeout(() => inputRef.current?.focus(), 80); } }, [open]);

  const results = q.trim().length > 1
    ? INDEX.filter(i => i.label.toLowerCase().includes(q.toLowerCase()) || i.cat.toLowerCase().includes(q.toLowerCase()))
    : INDEX.filter(i => i.cat === 'Pages');

  const go = (path) => { navigate(path); onClose(); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[150] flex items-start justify-center pt-20 px-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden"
            initial={{ scale: 0.95, y: -20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
              <Search className="h-5 w-5 text-gray-400 shrink-0" />
              <input
                ref={inputRef}
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search pages, services, products…"
                className="flex-1 text-gray-900 placeholder-gray-400 text-base focus:outline-none bg-transparent"
                onKeyDown={e => { if (e.key === 'Escape') onClose(); if (e.key === 'Enter' && results[0]) go(results[0].path); }}
              />
              {q && <button onClick={() => setQ('')} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>}
              <kbd className="hidden sm:block px-2 py-1 bg-gray-100 text-gray-400 text-xs rounded-lg font-mono">ESC</kbd>
            </div>

            {/* Results */}
            <div className="max-h-96 overflow-y-auto py-2">
              {results.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">No results for "{q}"</div>
              ) : (
                Object.entries(
                  results.reduce((acc, r) => { acc[r.cat] = acc[r.cat] || []; acc[r.cat].push(r); return acc; }, {})
                ).map(([cat, items]) => (
                  <div key={cat}>
                    <p className="px-4 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{cat}</p>
                    {items.map((item, i) => (
                      <button key={i} onClick={() => go(item.path)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors text-left group">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100">
                          <item.icon className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                        <span className="text-gray-800 text-sm font-medium flex-1">{item.label}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all" />
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
            <div className="px-4 py-2.5 border-t border-gray-100 text-xs text-gray-400 flex items-center gap-3">
              <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded font-mono">↑↓</kbd> navigate</span>
              <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded font-mono">↵</kbd> select</span>
              <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded font-mono">Ctrl K</kbd> open/close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SearchModal;
