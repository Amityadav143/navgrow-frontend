/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 · navgrow.org · info@navgrow.org
 * Unauthorised reproduction, modification or distribution is strictly prohibited.
 */
import { productsApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { ProductCardSkeleton } from '@/components/Skeleton';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ShoppingCart, Star, CheckCircle, X, Package,
  Tag, Zap, Shield, Truck, RotateCcw, Headphones, Filter, Heart, Clock, FileText } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useRfq } from '@/context/RfqContext';
import CheckoutModal from '@/components/CheckoutModal';
import { ALL_PRODUCTS as PRODUCTS } from '@/lib/productData';
import { debounce } from '@/lib/api';
import CtaSection from '@/components/CtaSection';
import { useCompare } from '@/components/CompareDrawer';
import useSeo from '@/hooks/useSeo';

const CATS    = ['All', ...Array.from(new Set(PRODUCTS.map(p => p.cat)))];
const SORTS   = ['Featured', 'Price: Low to High', 'Price: High to Low', 'Top Rated', 'Most Reviewed'];
const BADGES  = ['All', 'Bestseller', 'Top Rated', 'Professional', 'Heavy Duty', 'Precision'];

const disc = (p) => Math.round((1 - p.price / p.mrp) * 100);

// Module-level trackView — safe to reference from ProductCard
const trackView = (product) => {
  try {
    const key = 'ng_recently_viewed';
    const prev = JSON.parse(localStorage.getItem(key) || '[]');
    const updated = [
      { id: product.id, name: product.name, price: product.price,
        image: product.image, slug: product.slug || product.id, cat: product.cat },
      ...prev.filter(p => p.id !== product.id)
    ].slice(0, 6);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {}
};

/* ── Product card ─────────────────────────────────────────────────────────── */
const ProductCard = ({ product, onBuyNow }) => {
  const { addItem, items, toggleWishlist, inWishlist } = useCart();
  const { addToRfq, inRfq } = useRfq();
  const { addToCompare, removeFromCompare, inCompare } = useCompare();
  const inCart    = items.some(i => i.id === product.id);
  const wished    = inWishlist(product.id);
  const comparing = inCompare(product.id);
  const d = disc(product);

  return (
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col">

      {/* Image */}
      <Link to={`/shop/${product.slug || product.id}`} onClick={() => trackView(product)} className="relative overflow-hidden aspect-[4/3] bg-gray-50 cursor-pointer block">
        <img src={product.image} alt={product.name} loading="lazy" decoding="async"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            e.target.onerror = null;
            const n = encodeURIComponent(product.name.substring(0,24));
            e.target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23eff6ff'/%3E%3Crect x='1' y='1' width='398' height='298' fill='none' stroke='%23bfdbfe' stroke-width='2'/%3E%3Ctext x='200' y='135' font-family='sans-serif' font-size='40' fill='%2393c5fd' text-anchor='middle'%3E%F0%9F%9B%A1%3C/text%3E%3Ctext x='200' y='170' font-family='sans-serif' font-size='12' fill='%232563eb' text-anchor='middle'%3E${n}%3C/text%3E%3Ctext x='200' y='192' font-family='sans-serif' font-size='11' fill='%2393c5fd' text-anchor='middle'%3ENavgrow Engineering%3C/text%3E%3C/svg%3E`;
          }} />
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          {product.badge && <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-600 text-white shadow">{product.badge}</span>}
          {d > 0 && <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500 text-white shadow">{d}% OFF</span>}
          {product.stockQty > 0 && product.stockQty <= 10 && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500 text-white shadow animate-pulse">
              Only {product.stockQty} left!
            </span>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); toggleWishlist({ id: product.id, name: product.name, price: product.price, image: product.image }); }}
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-sm transition-colors hover:bg-red-50"
          aria-label="Wishlist"
        >
          <Heart className={`h-4 w-4 transition-colors ${wished ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
        </button>
      </Link>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wide mb-1">{product.cat}</span>
        <Link to={`/shop/${product.slug || product.id}`}
          className="font-bold text-gray-900 text-sm leading-snug mb-2 flex-1 hover:text-blue-600 transition-colors line-clamp-2 block">
          {product.name}
        </Link>

        <div className="flex items-center gap-1 mb-3">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className={`h-3.5 w-3.5 ${i < Math.floor(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
          ))}
          <span className="text-[11px] text-gray-500 ml-1">{product.rating} ({product.reviews})</span>
        </div>

        {/* Price */}
        <div className="mb-3">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-gray-900">₹{product.price.toLocaleString('en-IN')}</span>
            {product.mrp > product.price && (
              <span className="text-xs text-gray-400 line-through">₹{product.mrp.toLocaleString('en-IN')}</span>
            )}
          </div>
          {product.mrp > product.price && (
            <span className="text-[11px] font-bold text-green-600">
              You save ₹{(product.mrp - product.price).toLocaleString('en-IN')}
            </span>
          )}
          <span className="block text-[10px] text-gray-400 mt-0.5">+ GST · GST invoice available</span>
        </div>

        {/* Compare */}
        <button
          onClick={() => comparing ? removeFromCompare(product.id) : addToCompare(product)}
          className={`w-full mb-2 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
            comparing
              ? 'border-amber-400 bg-amber-50 text-amber-700'
              : 'border-gray-200 text-gray-400 hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50'
          }`}>
          {comparing ? '⚖ In Compare ✓' : '⚖ Add to Compare'}
        </button>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => addItem({ id: product.id, name: product.name, price: product.price, image: product.image, stockQty: product.stockQty, gstRate: product.gstRate })}
            className={`flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
              inCart
                ? 'border-green-400 bg-green-50 text-green-700'
                : 'border-blue-200 text-blue-600 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            {inCart ? <CheckCircle className="h-3.5 w-3.5" /> : <ShoppingCart className="h-3.5 w-3.5" />}
            {inCart ? 'In Cart' : 'Add'}
          </button>
          <button
            onClick={() => onBuyNow(product)}
            className="flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold brand-gradient text-white shadow hover:opacity-90 transition-opacity"
          >
            <Zap className="h-3.5 w-3.5" />
            Buy Now
          </button>
        </div>

        {/* B2B — Request for Quote */}
        <button
          onClick={() => addToRfq(product)}
          className={`w-full mt-2 py-2 rounded-xl text-xs font-bold border-2 transition-all flex items-center justify-center gap-1.5 ${
            inRfq(product.id)
              ? 'border-green-400 bg-green-50 text-green-700'
              : 'border-blue-100 text-blue-600 hover:border-blue-400 hover:bg-blue-50'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          {inRfq(product.id) ? 'In Quote List ✓' : 'Request Quote (B2B)'}
        </button>
      </div>
    </motion.div>
  );
};

/* ── Product detail modal ─────────────────────────────────────────────────── */
const ProductDetail = ({ product, onClose, onBuyNow }) => {
  const { addItem, items } = useCart();
  const inCart = items.some(i => i.id === product.id);
  const [qty, setQty] = useState(1);
  const d = disc(product);

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="absolute inset-0 bg-gray-900/75 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}>

          <button onClick={onClose} className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow-md">
            <X className="h-4 w-4 text-gray-600" />
          </button>

          <div className="aspect-video overflow-hidden rounded-t-3xl bg-gray-100 relative">
            <img loading="lazy" decoding="async" src={product.image} alt={product.name} className="w-full h-full object-cover"
              onError={(e) => { e.target.onerror = null; e.target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23dbeafe'/%3E%3Ctext x='200' y='155' font-family='sans-serif' font-size='13' fill='%232563eb' text-anchor='middle'%3EProduct Image%3C/text%3E%3C/svg%3E`; }} />
            <div className="absolute top-4 left-4 flex gap-2">
              {product.badge && <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-600 text-white">{product.badge}</span>}
              {d > 0 && <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500 text-white">{d}% OFF</span>}
            </div>
          </div>

          <div className="p-7">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">{product.cat}</span>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-1 mb-2">{product.name}</h3>

            <div className="flex items-center gap-2 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`h-4 w-4 ${i < Math.floor(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
              ))}
              <span className="text-sm text-gray-500">{product.rating} · {product.reviews} verified reviews</span>
            </div>

            <p className="text-gray-600 leading-relaxed mb-5">{product.desc}</p>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-5">
              <span className="text-3xl font-extrabold text-gray-900">₹{product.price.toLocaleString('en-IN')}</span>
              {product.mrp > product.price && (
                <>
                  <span className="text-lg text-gray-400 line-through">₹{product.mrp.toLocaleString('en-IN')}</span>
                  <span className="text-sm font-bold text-green-600">Save ₹{(product.mrp - product.price).toLocaleString('en-IN')} ({d}%)</span>
                </>
              )}
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { icon: Truck,      label: '3–5 Day Delivery' },
                { icon: RotateCcw,  label: '7-Day Returns' },
                { icon: Shield,     label: 'Quality Certified' },
                { icon: Headphones, label: '24/7 Support' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1 p-3 bg-gray-50 rounded-xl text-center">
                  <Icon className="h-4 w-4 text-blue-600" />
                  <span className="text-[11px] text-gray-600 font-medium leading-tight">{label}</span>
                </div>
              ))}
            </div>

            {/* Qty + actions */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} className="text-gray-600 hover:text-blue-600 font-bold text-lg w-5 text-center">−</button>
                <span className="font-bold w-8 text-center text-gray-900">{qty}</span>
                <button onClick={() => setQty(q => q + 1)} className="text-gray-600 hover:text-blue-600 font-bold text-lg w-5 text-center">+</button>
              </div>

              <button
                onClick={() => { addItem({ id: product.id, name: product.name, price: product.price, image: product.image, stockQty: product.stockQty, gstRate: product.gstRate, qty }); onClose(); }}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all border-2 ${
                  inCart ? 'border-green-400 bg-green-50 text-green-700' : 'border-blue-200 text-blue-600 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                <ShoppingCart className="h-4 w-4" />
                {inCart ? 'Added to Cart' : 'Add to Cart'}
              </button>

              <button
                onClick={() => { addItem({ id: product.id, name: product.name, price: product.price, image: product.image, stockQty: product.stockQty, gstRate: product.gstRate }); onClose(); onBuyNow(product); }}
                className="flex items-center gap-2 px-6 py-3 rounded-xl brand-gradient text-white font-bold shadow-md hover:opacity-90 text-sm"
              >
                <Zap className="h-4 w-4" />
                Buy Now
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};


/* ── Recently Viewed ──────────────────────────────────────────────────────── */
const RecentlyViewed = () => {
  const { addItem, items: cartItems } = useCart();
  const [viewed, setViewed] = React.useState([]);
  React.useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ng_recently_viewed') || '[]');
      setViewed(saved);
    } catch {}
  }, []);
  if (viewed.length === 0) return null;
  return (
    <section className="py-10 bg-white border-t border-gray-100">
      <div className="container mx-auto px-4">
        <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" /> Recently Viewed
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide">
          {viewed.map(p => {
            const inCart = cartItems.some(c => c.id === p.id);
            return (
              <div key={p.id} className="flex-shrink-0 w-48 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <Link to={`/shop/${p.slug}`} className="block aspect-square overflow-hidden bg-gray-50">
                  <img src={p.image} alt={p.name} loading="lazy"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    onError={e => { e.target.onerror=null; e.target.style.display='none'; }}/>
                </Link>
                <div className="p-3">
                  <p className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-0.5">{p.cat}</p>
                  <Link to={`/shop/${p.slug}`} className="text-xs font-bold text-gray-900 line-clamp-2 hover:text-blue-600 block mb-2">{p.name}</Link>
                  <p className="text-sm font-extrabold text-gray-900 mb-2">₹{p.price?.toLocaleString('en-IN')}</p>
                  <button onClick={() => addItem({ id: p.id, name: p.name, price: p.price, image: p.image })}
                    className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all ${
                      inCart ? 'bg-green-100 text-green-700 border border-green-200' : 'brand-gradient text-white hover:opacity-90'
                    }`}>
                    {inCart ? 'In Cart ✓' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/* ── Page ─────────────────────────────────────────────────────────────────── */
const ShopPage = () => {
  useSeo({
    title: 'B2B Engineering Shop | Safety Equipment, Railway Tools & PPE – Buy Online',
    description: 'Buy ISI-certified safety equipment, railway tools, maintenance supplies, and PPE online. Industrial helmets, torque wrenches, rail gauges, FR coveralls. Free shipping ₹5K+. GST invoice. Pan-India delivery.',
    path: '/shop',
    keywords: 'buy safety equipment India, railway tools online, ISI certified safety helmet, torque wrench India, rail flaw detector, FR coverall buy, PPE supplier India, B2B engineering products, safety equipment Siliguri',
  });

  // Live products from DB; fallback to static catalogue if API unavailable
  const { data: apiData } = useApi(() => productsApi.list({ size: 100, active: true }), [], { immediate: true });
  const liveProducts = React.useMemo(() => {
    const list = apiData?.content || (Array.isArray(apiData) ? apiData : null);
    if (list && list.length > 0) return list.map(p => ({
      id: p.id, slug: p.slug || String(p.id), cat: p.category,
      name: p.name, price: p.price, mrp: p.mrp || p.price,
      rating: (p.rating && Number(p.rating) > 0) ? Number(p.rating) : 4.5, reviews: p.reviewCount || 0,
      badge: p.badge || '', image: p.imageUrl || '', desc: p.description || '',
      inStock: (p.stockQty || 0) > 0, stockQty: p.stockQty ?? null,
      featured: p.featured || false, sku: p.sku || '', gstRate: p.gstRate || 18,
      tagline: p.tagline || '',
    }));
    return null;
  }, [apiData]);
  // Memoize to give useMemo dep a stable reference
  const ACTIVE_PRODUCTS = React.useMemo(() => liveProducts || PRODUCTS, [liveProducts]);
  const ACTIVE_CATS     = React.useMemo(() => ['All', ...Array.from(new Set(ACTIVE_PRODUCTS.map(p => p.cat)))], [ACTIVE_PRODUCTS]);

  const [search, setSearch]       = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debouncedSetSearch = React.useMemo(() => debounce(setDebouncedSearch, 280), []);
  const [cat, setCat]             = useState('All');
  const [sort, setSort]           = useState('Featured');
  const [priceMin, setPriceMin]     = useState('');
  const [priceMax, setPriceMax]     = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const { totalItems, setCartOpen, addItem, clearCart } = useCart();

  // Scroll to products grid when filter/sort changes (skip initial mount)
  const gridRef     = useRef(null);
  const mountedRef2 = useRef(false);
  useEffect(() => {
    if (!mountedRef2.current) { mountedRef2.current = true; return; }
    if (gridRef.current) {
      gridRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [cat, debouncedSearch, sort, priceMin, priceMax]);


  const handleBuyNow = (product) => {
    // Don't clear cart — just ensure this product is in it
    addItem({ id: product.id, name: product.name, price: product.price, image: product.image });
    setCheckoutOpen(true);
  };

  const filtered = useMemo(() => {
    let list = [...ACTIVE_PRODUCTS];
    if (cat !== 'All') list = list.filter(p => p.cat === cat);
    // FIX: use debouncedSearch (not raw search) to avoid re-filtering on every keystroke
    const sq = debouncedSearch.trim();
    if (sq) {
      const q = sq.toLowerCase();
      list = list.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.cat  || '').toLowerCase().includes(q) ||
        (p.desc || '').toLowerCase().includes(q)
      );
    }
    // Price range filter
    if (priceMin !== '') list = list.filter(p => p.price >= Number(priceMin));
    if (priceMax !== '') list = list.filter(p => p.price <= Number(priceMax));

    if (sort === 'Price: Low to High')  list.sort((a, b) => a.price - b.price);
    if (sort === 'Price: High to Low')  list.sort((a, b) => b.price - a.price);
    if (sort === 'Top Rated')           list.sort((a, b) => b.rating - a.rating);
    if (sort === 'Most Reviewed')       list.sort((a, b) => (b.reviews||0) - (a.reviews||0));
    if (sort === 'Featured')             list.sort((a, b) => (b.featured?1:0) - (a.featured?1:0) || (b.rating||0) - (a.rating||0));
    return list;
  }, [cat, debouncedSearch, sort, priceMin, priceMax, ACTIVE_PRODUCTS]);

  return (
    <>
      {/* Hero */}
      <section className="pt-10 pb-14 bg-gradient-to-br from-blue-950 to-indigo-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div className="max-w-3xl mx-auto text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-5 border border-blue-400/30 text-blue-200">
              <Package className="h-4 w-4" /> Industrial & Railway Supply Store
            </div>
            <h1 className="mb-3 text-white">Engineering <span className="gradient-text">Shop</span></h1>
            <p className="text-blue-200 text-lg mb-7">
              Quality safety equipment, railway tools, maintenance supplies & PPE.
              <br className="hidden sm:block" />
              Buy Now for instant Razorpay payment · "Request Quote" for bulk B2B orders with GST invoice & volume pricing.
            </p>

            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-4 mb-7 text-sm">
              {[
                { icon: Truck,       text: 'Pan-India Shipping' },
                { icon: Shield,      text: 'Quality Certified' },
                { icon: RotateCcw,   text: '7-Day Returns' },
                { icon: Headphones,  text: '24/7 Support' },
              ].map(({ icon: Icon, text }) => (
                <span key={text} className="flex items-center gap-1.5 text-blue-200">
                  <Icon className="h-4 w-4 text-blue-400" /> {text}
                </span>
              ))}
            </div>

            {/* Search */}
            <div className="relative max-w-lg mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text" value={search} onChange={e => { setSearch(e.target.value); debouncedSetSearch(e.target.value); }}
                placeholder="Search products, categories…"
                className="w-full pl-12 pr-10 py-4 rounded-2xl text-gray-900 bg-white shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              />
              {search && (
                <button onClick={() => { setSearch(''); setDebouncedSearch(''); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-10 bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4">

          {/* Filter bar */}
          <div ref={gridRef} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
            <div className="flex flex-wrap gap-2">
              {ACTIVE_CATS.map(c => (
                <button key={c} onClick={() => setCat(c)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    cat === c ? 'brand-gradient text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'
                  }`}>{c}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-sm text-gray-500 hidden sm:block">{filtered.length} products</span>
              <select value={sort} onChange={e => setSort(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-400 cursor-pointer">
                {SORTS.map(o => <option key={o}>{o}</option>)}
              </select>
              <div className="flex items-center gap-1.5">
                <input type="number" value={priceMin} onChange={e => setPriceMin(e.target.value)}
                  placeholder="Min ₹" className="w-20 px-2 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:border-blue-400 text-center"/>
                <span className="text-gray-400 text-xs">–</span>
                <input type="number" value={priceMax} onChange={e => setPriceMax(e.target.value)}
                  placeholder="Max ₹" className="w-20 px-2 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:border-blue-400 text-center"/>
                {(priceMin || priceMax) && (
                  <button onClick={() => { setPriceMin(''); setPriceMax(''); }}
                    className="text-gray-400 hover:text-red-500 transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {totalItems > 0 && (
                <button onClick={() => setCartOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 brand-gradient text-white rounded-xl text-sm font-bold shadow-md hover:opacity-90">
                  <ShoppingCart className="h-4 w-4" /> ({totalItems})
                </button>
              )}
            </div>
          </div>

          {/* Product grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-24">
              <Package className="h-16 w-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-400 font-medium text-lg">No products match your search.</p>
              <button onClick={() => { setSearch(''); setDebouncedSearch(''); setCat('All'); setPriceMin(''); setPriceMax(''); }} className="mt-4 text-blue-600 text-sm underline">Clear filters</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence mode="popLayout">
                {filtered.map(p => (
                  <ProductCard key={p.id} product={p} onBuyNow={handleBuyNow} />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Payment methods banner */}
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="mt-14 p-7 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-1">Secure Payments via Razorpay</h3>
                <p className="text-gray-500 text-sm">Pay with UPI, Credit/Debit card, Net Banking or EMI. All transactions are 256-bit SSL encrypted and PCI-DSS compliant.</p>
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                {['UPI', 'GPay', 'PhonePe', 'Visa', 'Mastercard', 'Rupay', 'Net Banking'].map(m => (
                  <span key={m} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-600">{m}</span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* B2B bulk note */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="mt-6 p-7 bg-blue-950 rounded-3xl text-center">
            <Tag className="h-7 w-7 text-blue-400 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">Bulk & Custom Orders</h3>
            <p className="text-blue-300 text-sm mb-4 max-w-lg mx-auto">For orders of 10+ units or custom specifications, click "Request Quote" on any product. Our team sends a formal, GST-compliant quotation with volume discounts within 1 business day.</p>
            <a
              href="mailto:info@navgrow.org?subject=Bulk%20Order%20Enquiry%20%E2%80%94%20Navgrow%20Engineering%20B2B&body=Dear%20Navgrow%20Engineering%20Team%2C%0A%0AI%20would%20like%20to%20enquire%20about%20bulk%20pricing%20and%20volume%20discounts%20for%20engineering%20products%20from%20your%20catalogue.%0A%0APRODUCTS%20OF%20INTEREST%0A%28Please%20list%20the%20products%20and%20approximate%20quantities%29%0A1.%20Product%20Name%20%20%20%3A%20%5Be.g.%20Industrial%20Safety%20Helmet%20ISI%5D%0A%20%20%20Qty%20Required%20%20%3A%20%5Be.g.%2050%20units%5D%0A%20%20%20Specification%20%3A%20%5Bany%20specific%20requirement%5D%0A%0A2.%20Product%20Name%20%20%20%3A%0A%20%20%20Qty%20Required%20%20%3A%0A%20%20%20Specification%20%3A%0A%0ABUYER%20INFORMATION%0ACompany%20/%20Org%20%20%3A%20%5BYour%20Company%20/%20Department%5D%0AContact%20Person%20%3A%20%5BYour%20Name%20%26%20Designation%5D%0APhone%20%20%20%20%20%20%20%20%20%20%3A%20%5BYour%20Mobile%20Number%5D%0ADelivery%20To%20%20%20%20%3A%20%5BCity%2C%20State%2C%20PIN%20Code%5D%0AGST%20Number%20%20%20%20%20%3A%20%5BYour%20GSTIN%20%E2%80%94%20for%20B2B%20GST%20invoice%5D%0A%0AREQUIREMENTS%0A%20%20Please%20provide%3A%0A%20%20-%20Bulk%20discount%20pricing%20for%20above%20quantities%0A%20%20-%20GST%20invoice%20and%20delivery%20challan%0A%20%20-%20Estimated%20delivery%20timeline%20to%20our%20location%0A%20%20-%20Whether%20customisation%20/%20logo%20branding%20is%20available%0A%20%20-%20Payment%20terms%20for%20large%20orders%0A%0AAdditional%20Notes%3A%0A%5BAny%20other%20requirements%2C%20certifications%2C%20packaging%20instructions%5D%0A%0AThank%20you%2C%0A%5BYour%20Name%5D%0A%5BDesignation%2C%20Company%5D%0A%5BPhone%5D%20%7C%20%5BEmail%5D"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-700 rounded-xl font-bold shadow-md hover:bg-blue-50 transition-colors text-sm">
              Contact for Bulk Pricing →
            </a>
          </motion.div>
        </div>
      </section>

      {/* Recently Viewed */}
      <RecentlyViewed />

      <CtaSection />

      {/* Modals */}
      <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
    </>
  );
};

export default ShopPage;