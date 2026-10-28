/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 · navgrow.org · info@navgrow.org
 * Unauthorised reproduction, modification or distribution is strictly prohibited.
 */
import { productsApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { ProductCardSkeleton } from '@/components/Skeleton';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ShoppingCart, Star, CheckCircle, X, Package,
  Tag, Zap, Shield, Truck, RotateCcw, Headphones, Filter, Heart, Clock, FileText, BellRing, MapPin } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useRfq } from '@/context/RfqContext';
import { ALL_PRODUCTS as PRODUCTS } from '@/lib/productData';
import { debounce } from '@/lib/api';
import CtaSection from '@/components/CtaSection';
import { useCompare } from '@/components/CompareDrawer';
import useSeo from '@/hooks/useSeo';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { toCartItem } from '@/lib/cartItem';
import { areaLabel } from '@/lib/pincodeRules';
import { isOutOfStock, liveStock, moqOf, stockOf } from '@/lib/stock';
import { liveOptionFields } from '@/lib/productMap';
import { hasOptions, priceRange, bestDiscountPct, perUnit, optionNamesOf, activeVariants, variantLabel } from '@/lib/variants';
import { rupees } from '@/lib/pricing';

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
        image: product.image, slug: product.slug || product.id, cat: product.cat,
        stockQty: product.stockQty ?? null, minOrderQty: product.minOrderQty ?? 1,
        sku: product.sku || '', gstRate: product.gstRate,
        hasVariants: hasOptions(product) || undefined, unitLabel: product.unitLabel || undefined },
      ...(Array.isArray(prev) ? prev : []).filter(p => p.id !== product.id && p.slug !== (product.slug || product.id))
    ].slice(0, 6);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {}
};

/* ── Product card ─────────────────────────────────────────────────────────── */
const ProductCard = ({ product, onBuyNow }) => {
  const { addItem, items, toggleWishlist, inWishlist } = useCart();
  const settings = useSiteSettings();
  // Admin toggles (Settings → Shop). Default to on when settings unavailable.
  const showStock    = settings?.shopSettings?.showStockBadge !== false;
  const wishlistOn   = settings?.shopSettings?.enableWishlist !== false;
  const { addToRfq, inRfq } = useRfq();
  const { addToCompare, removeFromCompare, inCompare } = useCompare();
  const inCart    = items.some(i => i.id === product.id);
  const wished    = inWishlist(product.id);
  const comparing = inCompare(product.id);
  // Sold in options (e.g. cement by brand and grade): show the price range;
  // the product page does the choosing.
  const opts  = hasOptions(product);
  const range = opts ? priceRange(product) : null;
  const d = opts ? bestDiscountPct(product) : disc(product);

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
          {d > 0 && <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500 text-white shadow">{opts ? `Up to ${d}% OFF` : `${d}% OFF`}</span>}
          {opts && range?.count > 1 && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/95 text-blue-800 shadow border border-blue-100">{range.count} options</span>
          )}
          {showStock && !opts && !isOutOfStock(product) && product.stockQty > 0 && product.stockQty <= 10 && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500 text-white shadow animate-pulse">
              Only {product.stockQty} left!
            </span>
          )}
        </div>
        {product.deliveryRestricted && (
          <span title={`Delivered to ${areaLabel(product)}`}
            className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-white/95 text-indigo-700 shadow border border-indigo-100 max-w-[85%] truncate">
            <MapPin className="h-3 w-3 shrink-0" /> Limited delivery area
          </span>
        )}
        {wishlistOn && (
        <button
          onClick={(e) => { e.stopPropagation(); toggleWishlist({ id: product.id, name: product.name, price: product.price, image: product.image }); }}
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-sm transition-colors hover:bg-red-50"
          aria-label="Wishlist"
        >
          <Heart className={`h-4 w-4 transition-colors ${wished ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
        </button>
        )}
      </Link>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wide mb-1">{product.cat}</span>
        <Link to={`/shop/${product.slug || product.id}`}
          className="font-bold text-gray-900 text-sm leading-snug mb-2 flex-1 hover:text-blue-600 transition-colors line-clamp-2 block">
          {product.name}
        </Link>

        <div className="flex items-center gap-1 mb-3 min-h-[14px]">
          {product.reviews > 0 && product.rating > 0 ? (
            <>
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`h-3.5 w-3.5 ${i < Math.floor(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
              ))}
              <span className="text-[11px] text-gray-500 ml-1">{product.rating} ({product.reviews})</span>
            </>
          ) : (
            <span className="text-[11px] text-gray-400">No reviews yet</span>
          )}
        </div>

        {/* Price */}
        {opts && range ? (
        <div className="mb-3">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-xl font-extrabold text-gray-900">
              {rupees(range.min)}{range.max > range.min ? ` – ${rupees(range.max)}` : ''}
            </span>
            {product.unitLabel && <span className="text-xs font-semibold text-gray-400">{perUnit(product)}</span>}
          </div>
          <span className="block text-[11px] font-semibold text-blue-700 mt-0.5 line-clamp-1">
            {optionNamesOf(product).length ? `By ${optionNamesOf(product).join(', ').toLowerCase()}` : 'Several options'}
            {product.priceTiers || activeVariants(product).some(v => v.priceTiers) ? ' · bulk prices' : ''}
          </span>
          <span className="block text-[10px] text-gray-400 mt-0.5">Incl. GST · GST invoice with HSN</span>
        </div>
        ) : (
        <div className="mb-3">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-gray-900">{rupees(product.price)}</span>
            {product.mrp > product.price && (
              <span className="text-xs text-gray-400 line-through">{rupees(product.mrp)}</span>
            )}
          </div>
          {product.mrp > product.price && (
            <span className="text-[11px] font-bold text-green-600">
              You save {rupees(product.mrp - product.price)}
            </span>
          )}
          <span className="block text-[10px] text-gray-400 mt-0.5">Incl. GST · GST invoice with HSN{product.priceTiers ? ' · bulk prices' : ''}</span>
        </div>
        )}

        {/* Stock status — honest availability at a glance. Out-of-stock is always
            shown (it affects buying); positive counts follow the admin toggle. */}
        {product.stockQty != null && (isOutOfStock(product) || showStock) && (
          <div className="mb-2 text-[11px] font-semibold">
            {opts ? (
              isOutOfStock(product)
                ? <span className="text-red-500">● All options out of stock — quote &amp; backorder available</span>
                : <span className="text-emerald-600">● In stock{range?.count > 1 ? ' — choose brand & grade' : ''}</span>
            ) : isOutOfStock(product) ? (
              <span className="text-red-500">
                ● {product.stockQty > 0 ? `Only ${product.stockQty} left (min. order ${moqOf(product)})` : 'Out of stock'} — quote & backorder available
              </span>
            ) : product.stockQty <= 10 ? (
              <span className="text-amber-600">● Only {product.stockQty} left in stock</span>
            ) : (
              <span className="text-emerald-600">● In stock</span>
            )}
          </div>
        )}

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
        {product.sample ? (
          <Link to={`/shop/${product.slug || product.id}`}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border-2 border-blue-200 text-blue-700 hover:bg-blue-50">
            View details
          </Link>
        ) : (
        <>
        {moqOf(product) > 1 && !isOutOfStock(product) && (
          <p className="mb-2 text-[11px] font-semibold text-gray-500">Minimum order: {moqOf(product)} units</p>
        )}
        {opts && !isOutOfStock(product) ? (
          <Link to={`/shop/${product.slug || product.id}`} onClick={() => trackView(product)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold brand-gradient text-white shadow hover:opacity-90 transition-opacity">
            <Zap className="h-3.5 w-3.5" /> Choose options &amp; buy
          </Link>
        ) : isOutOfStock(product) ? (
          <div className="space-y-1.5">
            {/* Out of stock is not a dead end: the buyer can still get a quote —
                the team sources it and confirms lead time. */}
            <button
              onClick={() => addToRfq(product)}
              className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                inRfq(product.id)
                  ? 'border-2 border-green-400 bg-green-50 text-green-700'
                  : 'brand-gradient text-white shadow hover:opacity-90'
              }`}>
              <FileText className="h-3.5 w-3.5" />
              {inRfq(product.id) ? 'In Quote List ✓' : 'Request Quote · Backorder'}
            </button>
            <Link to={`/shop/${product.slug || product.id}#back-in-stock`} onClick={() => trackView(product)}
              className="w-full flex items-center justify-center gap-1 py-1.5 rounded-xl text-[11px] font-semibold text-blue-700 hover:bg-blue-50 transition-colors">
              <BellRing className="h-3 w-3" /> Notify me when it's back
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => addItem(toCartItem(product))}
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
        )}

        {/* B2B — Request for Quote (out-of-stock cards already lead with it) */}
        {!isOutOfStock(product) && (
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
        )}
        </>
        )}
      </div>
    </motion.div>
  );
};

/* ── Recently Viewed ──────────────────────────────────────────────────────── */
// Saved "recently viewed" entries are a snapshot taken when the page was seen —
// their stock/price can be days old. They are refreshed from the live catalogue
// before anything is offered for sale, and products since removed are hidden.
const RecentlyViewed = ({ liveProducts }) => {
  const { addItem, items: cartItems } = useCart();
  const { addToRfq, inRfq } = useRfq();
  const [saved, setSaved] = React.useState([]);
  React.useEffect(() => {
    try {
      const list = JSON.parse(localStorage.getItem('ng_recently_viewed') || '[]');
      setSaved(Array.isArray(list) ? list : []);
    } catch {}
  }, []);
  const viewed = React.useMemo(() => {
    if (!Array.isArray(liveProducts)) return saved;       // live shop unreachable — show the saved copy
    return saved
      .map(v => {
        const live = liveProducts.find(p => String(p.id) === String(v.id) || (v.slug && p.slug === v.slug));
        return live ? { ...v, ...live, image: live.image || v.image } : null;
      })
      .filter(Boolean);
  }, [saved, liveProducts]);
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
                <Link to={`/shop/${p.slug || p.id}`} className="block aspect-square overflow-hidden bg-gray-50">
                  <img src={p.image} alt={p.name} loading="lazy"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    onError={e => { e.target.onerror=null; e.target.style.display='none'; }}/>
                </Link>
                <div className="p-3">
                  <p className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-0.5">{p.cat}</p>
                  <Link to={`/shop/${p.slug || p.id}`} className="text-xs font-bold text-gray-900 line-clamp-2 hover:text-blue-600 block mb-2">{p.name}</Link>
                  <p className="text-sm font-extrabold text-gray-900 mb-2">
                    {hasOptions(p) && priceRange(p).max > priceRange(p).min
                      ? `₹${priceRange(p).min.toLocaleString('en-IN')} – ₹${priceRange(p).max.toLocaleString('en-IN')}`
                      : `₹${p.price?.toLocaleString('en-IN')}`}
                    {p.unitLabel && <span className="text-[10px] font-semibold text-gray-400">{perUnit(p)}</span>}
                  </p>
                  {!Array.isArray(liveProducts) ? (
                    // Live shop not confirmed (still loading / unreachable): an old
                    // snapshot is never offered for sale — open the product instead.
                    <Link to={`/shop/${p.slug || p.id}`}
                      className="block w-full py-1.5 rounded-lg text-xs font-bold text-center border-2 border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-700 transition-colors">
                      View
                    </Link>
                  ) : hasOptions(p) && !isOutOfStock(p) ? (
                    <Link to={`/shop/${p.slug || p.id}`}
                      className="block w-full py-1.5 rounded-lg text-xs font-bold text-center brand-gradient text-white hover:opacity-90">
                      Choose options
                    </Link>
                  ) : isOutOfStock(p) ? (
                    <button onClick={() => addToRfq(p)}
                      className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all ${
                        inRfq(p.id) ? 'bg-green-100 text-green-700 border border-green-200' : 'border-2 border-blue-200 text-blue-700 hover:bg-blue-50'
                      }`}>
                      {inRfq(p.id) ? 'In Quote List ✓' : 'Request Quote'}
                    </button>
                  ) : (
                  <button onClick={() => addItem(toCartItem(p))}
                    className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all ${
                      inCart ? 'bg-green-100 text-green-700 border border-green-200' : 'brand-gradient text-white hover:opacity-90'
                    }`}>
                    {inCart ? 'In Cart ✓' : 'Add to Cart'}
                  </button>
                  )}
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
    description: 'Buy ISI-certified safety equipment, railway tools, maintenance supplies, and PPE online. Industrial helmets, torque wrenches, rail gauges, FR coveralls. GST invoice. Bulk prices. Free delivery in Siliguri, pan-India shipping.',
    path: '/shop',
    keywords: 'buy safety equipment India, railway tools online, ISI certified safety helmet, torque wrench India, rail flaw detector, FR coverall buy, PPE supplier India, B2B engineering products, safety equipment Siliguri',
  });

  // Live products from DB; fallback to static catalogue if API unavailable
  const { data: apiData, error: apiErr, loading: apiLoading } =
    useApi(() => productsApi.list({ size: 300 }), [], { immediate: true });
  const liveProducts = React.useMemo(() => {
    const list = apiData?.content || (Array.isArray(apiData) ? apiData : null);
    // An empty answer is a real (empty) shop — never resurrect the built-in
    // sample products (that used to bring removed products back for sale).
    if (list) return list.map(p => ({
      id: p.id, slug: p.slug || String(p.id), cat: p.category,
      name: p.name, price: p.price, mrp: p.mrp || p.price,
      // Real ratings only — unreviewed products used to show a made-up 4.5 ★.
      rating: Number(p.rating) > 0 && Number(p.reviewCount) > 0 ? Number(p.rating) : 0, reviews: Number(p.reviewCount) > 0 ? Number(p.reviewCount) : 0,
      badge: p.badge || '', image: p.imageUrl || '', desc: p.description || '',
      // Live stock never "unknown": a product whose stock was never set is 0.
      stockQty: liveStock(p.stockQty), minOrderQty: p.minOrderQty || 1,
      inStock: liveStock(p.stockQty) >= (p.minOrderQty || 1),
      featured: p.featured || false, sku: p.sku || '', gstRate: p.gstRate ?? 18,
      tagline: p.tagline || '', deliveryCharge: p.deliveryCharge ?? null,
      deliveryRestricted: !!p.deliveryRestricted, allowedPincodes: p.allowedPincodes || '',
      deliveryAreaNote: p.deliveryAreaNote || '',
      // Options (brand / grade / size…) with their own prices, and bulk prices.
      ...liveOptionFields(p),
    })).map(p => (p.hasVariants ? { ...p, inStock: !isOutOfStock(p) } : p));
    return null;
  }, [apiData]);
  // True only when we're falling back to the built-in catalogue because the API
  // failed — used to be transparent that these aren't the live shop products.
  const usingSampleData = !liveProducts && !apiLoading && Boolean(apiErr);
  // Sample products only when the live shop can't be reached — and they're shown
  // for browsing only (their stock/prices aren't live and can't be ordered).
  const ACTIVE_PRODUCTS = React.useMemo(
    () => liveProducts || PRODUCTS.map(p => ({ ...p, sample: true, stockQty: undefined, inStock: undefined })),
    [liveProducts]);
  const showSkeleton = apiLoading && !liveProducts;
  const ACTIVE_CATS     = React.useMemo(() => ['All', ...Array.from(new Set(ACTIVE_PRODUCTS.map(p => p.cat)))], [ACTIVE_PRODUCTS]);

  const [search, setSearch]       = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debouncedSetSearch = React.useMemo(() => debounce(setDebouncedSearch, 280), []);
  const [cat, setCat]             = useState('All');
  const [sort, setSort]           = useState('Featured');
  const [priceMin, setPriceMin]     = useState('');
  const [priceMax, setPriceMax]     = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const { totalItems, setCartOpen, addItem, clearCart } = useCart();
  const navigate = useNavigate();

  // Scroll to products grid when filter/sort changes (skip initial mount)
  const gridRef     = useRef(null);
  const mountedRef2 = useRef(false);
  useEffect(() => {
    if (!mountedRef2.current) { mountedRef2.current = true; return; }
    if (gridRef.current) {
      gridRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [cat, debouncedSearch, sort, priceMin, priceMax, inStockOnly]);


  const handleBuyNow = async (product) => {
    const r = await addItem(toCartItem(product), { mode: 'set' });
    if (r?.ok) navigate('/checkout');
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
        (p.desc || '').toLowerCase().includes(q) ||
        (p.sku  || '').toLowerCase().includes(q) ||
        // Options too, so "UltraTech" or "OPC 53" finds the cement.
        activeVariants(p).some(v => variantLabel(v).toLowerCase().includes(q) || String(v.sku || '').toLowerCase().includes(q))
      );
    }
    if (inStockOnly) list = list.filter(p => !isOutOfStock(p));
    // Price range filter
    // A product sold in options matches when any of its options is in the range.
    if (priceMin !== '') list = list.filter(p => (hasOptions(p) ? priceRange(p).max : p.price) >= Number(priceMin));
    if (priceMax !== '') list = list.filter(p => p.price <= Number(priceMax));

    if (sort === 'Price: Low to High')  list.sort((a, b) => a.price - b.price);
    if (sort === 'Price: High to Low')  list.sort((a, b) => b.price - a.price);
    if (sort === 'Top Rated')           list.sort((a, b) => b.rating - a.rating);
    if (sort === 'Most Reviewed')       list.sort((a, b) => (b.reviews||0) - (a.reviews||0));
    // Featured: available products first (out-of-stock ones stay listed — they can
    // still be quoted — but shouldn't crowd the top of the shop), then featured, rating.
    const oos = (p) => (isOutOfStock(p) ? 1 : 0);
    if (sort === 'Featured')             list.sort((a, b) => oos(a) - oos(b) || (b.featured?1:0) - (a.featured?1:0) || (b.rating||0) - (a.rating||0));
    return list;
  }, [cat, debouncedSearch, sort, priceMin, priceMax, inStockOnly, ACTIVE_PRODUCTS]);

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
            <h1 className="mb-3 text-white">Engineering <span className="gradient-text-light">Shop</span></h1>
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
          <div ref={gridRef} className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between mb-6">
            <div className="flex flex-wrap gap-2">
              {ACTIVE_CATS.map(c => (
                <button key={c} onClick={() => setCat(c)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    cat === c ? 'brand-gradient text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'
                  }`}>{c}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:shrink-0">
              {usingSampleData && (
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 order-1"
                  title="Live shop data couldn't be loaded; showing the built-in sample catalogue.">
                  Sample catalogue
                </span>
              )}
              <span className="text-sm text-gray-500 hidden sm:block order-1">{filtered.length} products</span>
              <select value={sort} onChange={e => setSort(e.target.value)}
                className="flex-1 min-w-[130px] sm:flex-none px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-400 cursor-pointer order-2">
                {SORTS.map(o => <option key={o}>{o}</option>)}
              </select>
              <div className="flex items-center gap-1.5 order-3">
                <input type="number" inputMode="numeric" value={priceMin} onChange={e => setPriceMin(e.target.value)}
                  placeholder="Min ₹" className="w-[72px] sm:w-20 px-2 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:border-blue-400 text-center"/>
                <span className="text-gray-400 text-xs">–</span>
                <input type="number" inputMode="numeric" value={priceMax} onChange={e => setPriceMax(e.target.value)}
                  placeholder="Max ₹" className="w-[72px] sm:w-20 px-2 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:border-blue-400 text-center"/>
                {(priceMin || priceMax) && (
                  <button onClick={() => { setPriceMin(''); setPriceMax(''); }} aria-label="Clear price filter"
                    className="text-gray-400 hover:text-red-500 transition-colors shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 cursor-pointer select-none order-3 px-2 py-2 rounded-xl bg-white border border-gray-200 hover:border-blue-300">
                <input type="checkbox" checked={inStockOnly} onChange={e => setInStockOnly(e.target.checked)}
                  className="h-3.5 w-3.5 rounded accent-blue-600" />
                In stock only
              </label>
              {totalItems > 0 && (
                <button onClick={() => setCartOpen(true)} aria-label={`Open cart, ${totalItems} items`}
                  className="flex items-center gap-2 px-4 py-2 brand-gradient text-white rounded-xl text-sm font-bold shadow-md hover:opacity-90 order-4 shrink-0">
                  <ShoppingCart className="h-4 w-4" /> ({totalItems})
                </button>
              )}
            </div>
          </div>

          {usingSampleData && (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <strong>Live prices and stock couldn't be loaded right now.</strong> You can browse the range below — refresh in a
              moment to buy online, or call <a href="tel:+918927070972" className="underline font-semibold">+91 89270 70972</a> /
              WhatsApp us to order.
            </div>
          )}
          {/* Product grid */}
          {showSkeleton ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" aria-busy="true">
              {[...Array(8)].map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 max-w-md mx-auto">
              <Package className="h-16 w-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-700 font-bold text-lg">No products match your search</p>
              <p className="text-gray-400 text-sm mt-1">Try a different keyword or category — or ask us directly for what you need.</p>
              <div className="flex flex-wrap gap-2 justify-center mt-5">
                <button onClick={() => { setSearch(''); setDebouncedSearch(''); setCat('All'); setPriceMin(''); setPriceMax(''); setInStockOnly(false); }}
                  className="px-4 py-2 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-bold hover:border-blue-300 hover:text-blue-600 transition-colors">
                  Clear filters
                </button>
                <Link to="/quote"
                  className="px-4 py-2 rounded-xl brand-gradient text-white text-sm font-bold hover:opacity-90 transition-opacity">
                  Request a quote
                </Link>
              </div>
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
      <RecentlyViewed liveProducts={liveProducts} />

      <CtaSection />

      {/* Modals */}
    </>
  );
};

export default ShopPage;