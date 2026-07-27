/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 · navgrow.org · info@navgrow.org
 * Unauthorised reproduction, modification or distribution is strictly prohibited.
 */
/**
 * Navgrow Engineering — Product Detail Page
 * Route: /shop/:slug
 * Conversion-focused, Blue+Gold theme, full eCommerce experience
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, Zap, Heart, Star, ChevronRight, ChevronLeft,
  Shield, Truck, RotateCcw, Award, CheckCircle, Share2,
  MessageCircle, Phone, ZoomIn, Package, AlertCircle,
  ThumbsUp, ThumbsDown, Send, User, Clock, Tag,
  ChevronDown, ChevronUp, ArrowLeft, Copy, Check, FileText } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useRfq } from '@/context/RfqContext';
import { useAuth } from '@/context/AuthContext';
import { productsApi } from '@/lib/api';
import { renderArticleHtml } from '@/lib/richText';
import { track } from '@/lib/analytics';
import { getProductBySlug, getRelated } from '@/lib/productData';
import useSeo from '@/hooks/useSeo';
import BulkOrderForm from '@/components/BulkOrderForm';
import { toCartItem } from '@/lib/cartItem';
import PincodeCheck from '@/components/PincodeCheck';

/* ─── helpers ────────────────────────────────────────────────────────────── */
const fmt     = (n) => '₹' + Number(n).toLocaleString('en-IN');
const disc    = (p) => Math.round((1 - p.price / p.mrp) * 100);
const savings = (p) => p.mrp - p.price;

/* ─── Star row ─────────────────────────────────────────────────────────── */
const Stars = ({ rating, size = 'md', interactive = false, onRate }) => {
  const [hover, setHover] = useState(0);
  const sz = size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-6 w-6' : 'h-4 w-4';
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star
          key={i}
          className={`${sz} cursor-${interactive?'pointer':'default'} transition-colors ${
            i <= (hover || Math.floor(rating))
              ? 'fill-amber-400 text-amber-400'
              : 'text-gray-200 fill-gray-200'
          }`}
          onMouseEnter={() => interactive && setHover(i)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onRate?.(i)}
        />
      ))}
    </div>
  );
};

/* ─── Rating distribution bar ───────────────────────────────────────────── */
const RatingBar = ({ star, count, total }) => (
  <div className="flex items-center gap-2 text-xs">
    <span className="text-gray-500 w-4 text-right">{star}</span>
    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: total > 0 ? `${(count/total)*100}%` : '0%' }}
        transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
        className="h-full bg-amber-400 rounded-full"
      />
    </div>
    <span className="text-gray-400 w-6 text-left">{count}</span>
  </div>
);

/* ─── Trust pill ─────────────────────────────────────────────────────────── */
const TrustPill = ({ icon: Icon, text, sub }) => (
  <div className="flex items-center gap-2.5 p-3 bg-blue-50 rounded-2xl border border-blue-100">
    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
      <Icon className="h-4.5 w-4.5 text-white" style={{width:'18px',height:'18px'}}/>
    </div>
    <div>
      <p className="text-xs font-bold text-blue-900">{text}</p>
      {sub && <p className="text-[10px] text-blue-600">{sub}</p>}
    </div>
  </div>
);

/* ─── Review card ────────────────────────────────────────────────────────── */
const ReviewCard = ({ review }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-amber-200 transition-colors hover:shadow-md"
  >
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full brand-gradient flex items-center justify-center text-white font-bold text-sm shrink-0">
          {(review.authorName || review.name || 'U')[0].toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-gray-900 text-sm">{review.authorName || review.name || 'Verified Buyer'}</p>
          <p className="text-[11px] text-gray-400 flex items-center gap-1">
            <Clock className="h-3 w-3"/>
            {review.createdAt ? new Date(review.createdAt).toLocaleDateString('en-IN',{month:'short',year:'numeric'}) : 'Recent'}
          </p>
        </div>
      </div>
      <Stars rating={review.rating} size="sm" />
    </div>
    {review.title && <p className="font-semibold text-gray-800 text-sm mb-1">{review.title}</p>}
    <p className="text-gray-600 text-sm leading-relaxed">{review.body || review.comment}</p>
    {review.verified && (
      <div className="flex items-center gap-1 mt-2.5 text-green-600">
        <CheckCircle className="h-3.5 w-3.5"/>
        <span className="text-[11px] font-semibold">Verified Purchase</span>
      </div>
    )}
  </motion.div>
);

/* ─── Write review form ─────────────────────────────────────────────────── */
const ReviewForm = ({ productId, productName, onSubmit }) => {
  // FIX: isLoggedIn must be in ReviewForm's own scope — it is a module-level component
  const { isLoggedIn, user } = useAuth();

  const [rating,  setRating]  = useState(0);
  const [title,   setTitle]   = useState('');
  const [body,    setBody]    = useState('');
  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState('');

  const submit = async () => {
    if (!rating)  { setError('Please select a star rating.'); return; }
    if (!body.trim()) { setError('Please write your review.'); return; }
    if (!isLoggedIn && !name.trim()) { setError('Please enter your name.'); return; }
    setLoading(true); setError('');
    try {
      await productsApi.addReview(productId, { rating, title, body, name, email });
      setDone(true);
      onSubmit?.();
    } catch {
      setError('Unable to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <motion.div initial={{ opacity:0, scale:.95 }} animate={{ opacity:1, scale:1 }}
      className="p-6 bg-green-50 border border-green-200 rounded-2xl text-center">
      <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2"/>
      <p className="font-bold text-green-800 text-lg">Thank you for your review!</p>
      <p className="text-green-600 text-sm mt-1">It helps other buyers choose the right product.</p>
    </motion.div>
  );

  return (
    <div className="bg-gradient-to-br from-blue-50 to-amber-50/30 rounded-2xl border border-blue-100 p-5">
      <h4 className="font-bold text-gray-900 text-base mb-4 flex items-center gap-2">
        <Star className="h-5 w-5 text-amber-500"/>
        Write a Review for {productName}
      </h4>

      {/* Star selector */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">Your Rating *</label>
        <div className="flex items-center gap-1">
          <Stars rating={rating} size="lg" interactive onRate={setRating}/>
          <span className="text-sm text-gray-500 ml-2">
            {rating === 0 ? 'Tap to rate' : ['','Poor','Fair','Good','Very Good','Excellent'][rating]}
          </span>
        </div>
      </div>

      {/* Guest name/email */}
      {!isLoggedIn && (
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Name *</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"/>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Email (optional)</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" type="email"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"/>
          </div>
        </div>
      )}

      {/* Title */}
      <div className="mb-3">
        <label className="text-xs font-semibold text-gray-600 mb-1 block">Review Title (optional)</label>
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Excellent quality, exactly what I needed"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"/>
      </div>

      {/* Body */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-gray-600 mb-1 block">Your Review *</label>
        <textarea value={body} onChange={e=>setBody(e.target.value)}
          placeholder="What did you use it for? What did you like or dislike? Would you recommend it?"
          rows={4} maxLength={1000}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none"/>
        <div className="flex justify-end mt-1">
          <span className="text-[10px] text-gray-400">{body.length}/1000</span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-3 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0"/>{error}
        </div>
      )}

      <button aria-label="Send" onClick={submit} disabled={loading}
        className="w-full py-3 btn-gold rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
        {loading
          ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
          : <><Send className="h-4 w-4"/>Submit Review</>
        }
      </button>
    </div>
  );
};

/* ─── Related product card ──────────────────────────────────────────────── */
const RelatedCard = ({ product }) => {
  const { addItem, items } = useCart();
  const inCart = items.some(i => i.id === product.id);
  const d = disc(product);
  return (
    <Link to={`/shop/${product.slug || product.id}`}
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-50">
        <img src={product.image} alt={product.name} loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => { e.target.onerror=null; e.target.src=`data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23eff6ff'/%3E%3Ctext x='200' y='155' font-family='sans-serif' font-size='13' fill='%232563eb' text-anchor='middle'%3E${encodeURIComponent(product.name.substring(0,20))}%3C/text%3E%3C/svg%3E`; }}/>
        {product.badge && <span className="absolute top-2 left-2 badge-gold text-[10px]">{product.badge}</span>}
        {d > 0 && <span className="absolute top-2 right-2 badge-blue text-[10px]">{d}% OFF</span>}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-1">{product.cat}</p>
        <p className="font-bold text-gray-900 text-xs leading-snug mb-2 line-clamp-2 flex-1">{product.name}</p>
        {product.rating != null && (
          <div className="flex items-center gap-1 mb-2">
            <Stars rating={product.rating} size="sm"/>
            {product.reviews != null && <span className="text-[10px] text-gray-400">({product.reviews})</span>}
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <span className="font-extrabold text-gray-900 text-sm">{fmt(product.price)}</span>
            {product.mrp > product.price && <span className="text-[10px] text-gray-400 line-through ml-1">{fmt(product.mrp)}</span>}
          </div>
          <button onClick={(e) => { e.preventDefault(); addItem(toCartItem(product)); }}
            className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-all ${inCart?'bg-green-100 text-green-700':'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white'}`}>
            {inCart ? '✓ In Cart' : '+ Add'}
          </button>
        </div>
      </div>
    </Link>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
const ProductDetailPage = () => {
  const { slug }     = useParams();
  const navigate     = useNavigate();
  // navigate kept for future routing
  const { addItem, items, toggleWishlist, inWishlist } = useCart();
  const { addToRfq, inRfq } = useRfq();
  const { isLoggedIn } = useAuth();

  /* ── product data: try local lib first (fast), then fall back to API ── */
  const staticProduct = getProductBySlug(slug);
  const [apiProduct, setApiProduct] = React.useState(null);
  const [apiLoading, setApiLoading] = React.useState(false);

  // Always ask the API for this slug — not only when the slug is missing from the
  // static catalogue. The static file is rich editorial content (features, specs,
  // photos) but it carries NO stock figure and its price can go stale, so live
  // data has to win for anything commercial. Without this the quantity cap had
  // nothing to enforce and every product looked infinitely available.
  React.useEffect(() => {
    if (slug) {
      setApiLoading(true);
      productsApi.get(slug)
        .then(({ data }) => {
          try { track('product_view', { label: data?.slug || slug }); } catch {}
          // Helpers to parse newline-separated admin text into UI shapes
          const lines = (s) => (s || '').split('\n').map(x => x.trim()).filter(Boolean);
          const parseSpecs = (s) => lines(s).map((row) => {
            const idx = row.indexOf(':');
            return idx === -1
              ? { label: row, value: '' }
              : { label: row.slice(0, idx).trim(), value: row.slice(idx + 1).trim() };
          });
          const galleryImgs = lines(data.imageUrls);
          const primaryImg = data.imageUrl || galleryImgs[0] || '';
          // Normalize API product to match static shape
          setApiProduct({
            id: data.id,
            slug: data.slug || slug,
            cat: data.category,
            name: data.name,
            tagline: data.tagline || '',
            price: Number(data.price),
            mrp: data.mrp ? Number(data.mrp) : Number(data.price),
            rating: Number(data.rating) || 0,
            reviews: data.reviewCount || 0,
            badge: data.badge || '',
            image: primaryImg,
            images: [primaryImg, ...galleryImgs].filter((v, i, a) => v && a.indexOf(v) === i),
            summary: data.summary || data.description || '',
            desc: data.description || '',
            description: data.description || data.summary || '',
            inStock: (data.stockQty || 0) > 0,
            stockQty: data.stockQty || 0,
            features: lines(data.features),
            specs: parseSpecs(data.specifications),
            benefits: lines(data.benefits),
            applications: lines(data.applications),
            warranty: data.warranty || '',
            gstRate: data.gstRate || 18,
          });
        })
        .catch(() => {})
        .finally(() => setApiLoading(false));
    }
  }, [slug, staticProduct]);

  // Merge: static supplies the editorial depth, the API supplies the truth about
  // price and availability. Live values overwrite the static ones; static fields
  // survive only where the API has nothing to say (e.g. long-form spec tables an
  // admin hasn't filled in). If the API is unreachable we still render the static
  // page rather than a blank one — but then stock is unknown and the UI says so.
  const product = React.useMemo(() => {
    // Normalise availability from a concrete stock number wherever we have one,
    // so the Add/Buy buttons and the quantity stepper always agree.
    const withStock = (p) => {
      if (!p) return p;
      if (Number.isFinite(Number(p.stockQty))) return { ...p, inStock: Number(p.stockQty) > 0 };
      return p;
    };
    if (!staticProduct) return withStock(apiProduct);
    if (!apiProduct)    return withStock(staticProduct);
    const merged = { ...staticProduct };
    Object.entries(apiProduct).forEach(([k, v]) => {
      const empty = v === null || v === undefined || v === ''
        || (Array.isArray(v) && v.length === 0);
      if (!empty) merged[k] = v;
    });
    // Availability is never inherited blindly: the live figure wins whenever the
    // API answered, otherwise we fall back to the catalogue's own stock.
    if (apiProduct.stockQty !== undefined && apiProduct.stockQty !== null) {
      merged.stockQty = apiProduct.stockQty;
      merged.inStock  = apiProduct.inStock;
    }
    return withStock(merged);
  }, [staticProduct, apiProduct]);
  const stockKnown = apiProduct != null || Number.isFinite(Number(staticProduct?.stockQty));
  // Live related products from the API (same category); static data is only a
  // fallback so admin-created products get a related section too.
  const [liveRelated, setLiveRelated] = React.useState(null);
  React.useEffect(() => {
    if (!product?.id) { setLiveRelated(null); return; }
    let cancelled = false;
    productsApi.related(product.id, 4)
      .then(r => {
        if (cancelled || !Array.isArray(r.data)) return;
        setLiveRelated(r.data.map(p => ({
          id: p.id, slug: p.slug, name: p.name,
          image: p.imageUrl, cat: p.category,
          price: Number(p.price), mrp: p.mrp != null ? Number(p.mrp) : null,
          badge: p.badge, stockQty: p.stockQty, gstRate: p.gstRate,
        })));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [product?.id]);

  const related = (liveRelated && liveRelated.length > 0)
    ? liveRelated
    : (staticProduct ? getRelated(staticProduct, 4) : []);

  /* ── state ── */
  const [imgIdx,      setImgIdx]    = useState(0);
  const [qty,         setQty]       = useState(1);
  const [tab,         setTab]       = useState('description');
  const [reviews,     setReviews]   = useState([]);
  const [reviewLoad,  setRevLoad]   = useState(true);
  const [ratingDist,  setRatingDist]= useState({5:0,4:0,3:0,2:0,1:0});
  const [showFull,    setShowFull]  = useState(false);
  const [copied,      setCopied]    = useState(false);
  const [addedAnim,   setAddedAnim] = useState(false);
  const [pinchZoom,   setPinchZoom] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const stickyRef = useRef(null);

  // Available stock caps how much can be added here. Stock is authoritative only
  // when the API answered (see the merge above); if the shop API is unreachable
  // we fall back to a sane ceiling and let the cart/server do the final clamp
  // rather than silently promising unlimited units.
  const stockNum   = Number(product?.stockQty);
  const liveStock  = stockKnown && Number.isFinite(stockNum);
  const soldOut    = liveStock && stockNum <= 0;
  const knownStock = liveStock && stockNum > 0;
  const maxQty     = knownStock ? stockNum : 99;
  const atMax      = knownStock && qty >= maxQty;
  // Low-stock nudge: honest scarcity, shown only when it's actually true.
  const lowStock   = knownStock && stockNum <= 5;

  // Never let the selected quantity sit above what's actually available — e.g.
  // if the product data loads after mount, or stock was reduced.
  useEffect(() => {
    setQty(q => Math.min(Math.max(1, q), maxQty));
  }, [maxQty]);

  /* ── SEO ── */
  const productSchema = product ? (() => {
    const priceNum = Number(product.price);
    const hasValidPrice = Number.isFinite(priceNum) && priceNum > 0;
    const schema = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.name,
      "description": product.summary || product.desc || product.name,
      "sku": String(product.sku || product.id || product.slug || ''),
      "brand": { "@type": "Brand", "name": "Navgrow Engineering" },
    };
    if (product.image || product.imageUrl) {
      schema.image = product.image || product.imageUrl;
    }
    // An Offer is only valid (and only satisfies Google) when it has a real price.
    if (hasValidPrice) {
      const validUntil = new Date();
      validUntil.setFullYear(validUntil.getFullYear() + 1);
      schema.offers = {
        "@type": "Offer",
        "url": `https://navgrow.org/shop/${product.slug || product.id}`,
        "priceCurrency": "INR",
        "price": priceNum.toFixed(2),
        "priceValidUntil": validUntil.toISOString().slice(0, 10),
        "availability": product.inStock !== false ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "seller": { "@type": "Organization", "name": "Navgrow Engineering Service Pvt. Ltd." }
      };
    }
    // Only add aggregateRating when there is a genuine rating value.
    const ratingVal = Number(product.rating);
    if (Number.isFinite(ratingVal) && ratingVal > 0) {
      schema.aggregateRating = {
        "@type": "AggregateRating",
        "ratingValue": ratingVal.toFixed(1),
        "reviewCount": Math.max(1, Number(product.reviews) || Number(product.reviewCount) || 1),
        "bestRating": "5",
        "worstRating": "1"
      };
    }
    // Guarantee the "offers/review/aggregateRating" requirement is always met:
    // if we somehow have neither a price nor a rating, provide a minimal valid Offer.
    if (!schema.offers && !schema.aggregateRating) {
      schema.offers = {
        "@type": "Offer",
        "url": `https://navgrow.org/shop/${product.slug || product.id}`,
        "priceCurrency": "INR",
        "price": hasValidPrice ? priceNum.toFixed(2) : "0.00",
        "availability": "https://schema.org/InStock",
        "seller": { "@type": "Organization", "name": "Navgrow Engineering Service Pvt. Ltd." }
      };
    }
    return schema;
  })() : null;

  useSeo({
    title: product ? `${product.name} — Buy Online | Navgrow Engineering Shop` : 'Product — Navgrow',
    description: product ? `Buy ${product.name} online at ₹${product.price?.toLocaleString('en-IN')}. ${product.summary || product.desc || ''}. ISI-certified. GST invoice with HSN. Pan-India delivery.` : '',
    path: product ? `/shop/${product.slug || product.id}` : '/shop',
    keywords: product ? `buy ${product.name}, ${product.cat}, engineering products India, ${product.name} price` : '',
    type: 'product',
    schema: productSchema,
  });

  /* ── scroll to top on mount + track view ── */
  useEffect(() => {
    window.scrollTo(0,0);
    // Track recently viewed — same function used in ShopPage
    if (product) {
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
    }
  }, [slug, product?.id]);

  /* ── load reviews from backend ── */
  useEffect(() => {
    if (!product) return;
    // Only load reviews if product.id looks like a UUID (admin-added products)
    // Static products have short string ids and won't have backend reviews
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(product.id);
    if (!isUUID) { setRevLoad(false); return; }
    setRevLoad(true);
    productsApi.reviews(product.id)
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data?.content || []);
        setReviews(list);
        const dist = {5:0,4:0,3:0,2:0,1:0};
        list.forEach(r => { if (dist[r.rating] !== undefined) dist[r.rating]++; });
        setRatingDist(dist);
      })
      .catch(() => setReviews([]))
      .finally(() => setRevLoad(false));
  }, [product]);

  /* ── handlers ── */
  const handleAdd = useCallback(() => {
    addItem(toCartItem(product, { qty }));
    setAddedAnim(true);
    setTimeout(() => setAddedAnim(false), 1800);
  }, [product, qty, addItem]);

  const handleBuyNow = useCallback(() => {
    // Add item once with qty property rather than looping (loop causes multiple cart entries)
    addItem(toCartItem(product, { qty }));
    navigate('/checkout');
  }, [product, qty, addItem, navigate]);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(()=>setCopied(false),2500); } catch {}
    if (navigator.share) navigator.share({ title: product.name, url });
  }, [product]);

  /* ── 404 ── */
  if (!product) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center p-8">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h2>
        <p className="text-gray-500 mb-6">This product may have been removed or the link is incorrect.</p>
        <Link to="/shop" className="btn-gold px-6 py-3 rounded-xl inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4"/> Back to Shop
        </Link>
      </div>
    </div>
  );

  const PLACEHOLDER = '/placeholder.jpg';
  const imageList = (product.images && product.images.length) ? product.images : (product.image ? [product.image] : []);
  const images    = imageList.length ? imageList : [PLACEHOLDER];
  const inCart    = items.some(i => i.id === product.id);
  const wished    = typeof inWishlist === 'function' ? inWishlist(product.id) : false;
  const d         = disc(product);
  const saved     = savings(product);
  const totalRevs = reviews.length || product.reviews || 0;

  // Rating breakdown for display (mix backend + product data)
  const displayRating = product.rating;

  const TABS = ['description', 'specifications', 'benefits', 'applications', 'reviews'];

  return (
    <div className="min-h-screen bg-[#fefdf9]">

      {/* ── Breadcrumb ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-3">
          <nav className="flex items-center gap-1.5 text-xs text-gray-500 flex-wrap">
            <Link to="/" className="hover:text-blue-600 transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3 text-gray-300"/>
            <Link to="/shop" className="hover:text-blue-600 transition-colors">Shop</Link>
            <ChevronRight className="h-3 w-3 text-gray-300"/>
            <span className="text-amber-600 font-medium">{product.cat}</span>
            <ChevronRight className="h-3 w-3 text-gray-300"/>
            <span className="text-gray-800 font-semibold line-clamp-1">{product.name}</span>
          </nav>
        </div>
      </div>

      {/* ── Main product section ── */}
      <div className="container mx-auto px-4 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">

          {/* ── LEFT: Image gallery ── */}
          <motion.div
            initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} transition={{ duration:.45 }}
            className="lg:sticky lg:top-24"
          >
            {/* Main image */}
            <div className="relative rounded-3xl overflow-hidden bg-gray-50 border border-gray-100 shadow-lg aspect-square mb-4 group cursor-zoom-in"
              onClick={() => setPinchZoom(v => !v)}>
              <AnimatePresence mode="wait">
                <motion.img
                  key={imgIdx}
                  src={images[imgIdx]}
                  alt={`${product.name} — view ${imgIdx+1}`}
                  onError={(e) => { if (e.target.src !== window.location.origin + '/placeholder.jpg') { e.target.onerror = null; e.target.src = '/placeholder.jpg'; } }}
                  initial={{ opacity:0, scale:1.02 }}
                  animate={{ opacity:1, scale: pinchZoom ? 1.35 : 1 }}
                  exit={{ opacity:0 }}
                  transition={{ duration:.3 }}
                  className="w-full h-full object-cover transition-transform duration-300"
                  onError={(e) => { e.target.onerror=null; e.target.src=`data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600'%3E%3Crect width='600' height='600' fill='%23eff6ff'/%3E%3Ctext x='300' y='290' font-family='sans-serif' font-size='18' fill='%232563eb' text-anchor='middle'%3E${encodeURIComponent(product.name.substring(0,30))}%3C/text%3E%3Ctext x='300' y='320' font-family='sans-serif' font-size='13' fill='%2393c5fd' text-anchor='middle'%3ENavgrow Engineering%3C/text%3E%3C/svg%3E`; }}
                />
              </AnimatePresence>

              {/* Badges overlay */}
              <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
                {product.badge && <span className="badge-gold">{product.badge}</span>}
                {d > 0 && <span className="badge-blue">{d}% OFF — Save {fmt(saved)}</span>}
                {!product.inStock && <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500 text-white">Out of Stock</span>}
              </div>

              {/* Wishlist */}
              <button
                onClick={(e) => { e.stopPropagation(); typeof toggleWishlist === 'function' && toggleWishlist({id:product.id,name:product.name,price:product.price,image:product.image}); }}
                className={`absolute top-3 right-3 w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-all z-10 ${wished?'bg-red-500 text-white':'bg-white text-gray-400 hover:bg-red-50'}`}
                aria-label="Add to wishlist"
              >
                <Heart className={`h-5 w-5 ${wished?'fill-white':'hover:text-red-500'}`}/>
              </button>

              {/* Zoom hint */}
              <div className="absolute bottom-3 right-3 bg-black/40 text-white text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <ZoomIn className="h-3 w-3"/>{pinchZoom?'Click to zoom out':'Click to zoom in'}
              </div>

              {/* Prev/Next arrows */}
              {images.length > 1 && (
                <>
                  <button onClick={e=>{e.stopPropagation();setImgIdx(i=>(i-1+images.length)%images.length);}}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 shadow rounded-full flex items-center justify-center hover:bg-white transition-colors z-10">
                    <ChevronLeft className="h-5 w-5 text-gray-700"/>
                  </button>
                  <button onClick={e=>{e.stopPropagation();setImgIdx(i=>(i+1)%images.length);}}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 shadow rounded-full flex items-center justify-center hover:bg-white transition-colors z-10">
                    <ChevronRight className="h-5 w-5 text-gray-700"/>
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setImgIdx(i)}
                    className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${i===imgIdx?'border-amber-400 shadow-md shadow-amber-200':'border-gray-200 hover:border-blue-300'}`}>
                    <img loading="lazy" decoding="async" src={img} alt="" className="w-full h-full object-cover"
                      onError={e=>{e.target.onerror=null;e.target.src=product.image;}}/>
                  </button>
                ))}
              </div>
            )}

            {/* Trust strip */}
            <div className="grid grid-cols-2 gap-2.5 mt-4">
              <TrustPill icon={Shield}  text="ISI/BIS Certified" sub="Genuine & tested"/>
              <TrustPill icon={Truck}   text="Pan-India Delivery" sub="Check your pincode"/>
              <TrustPill icon={RotateCcw} text="7-Day Returns"   sub="On defective items"/>
              <TrustPill icon={Award}   text="GST Invoice"       sub="B2B purchase ready"/>
            </div>
          </motion.div>

          {/* ── RIGHT: Product info + purchase ── */}
          <motion.div
            initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} transition={{ duration:.45, delay:.1 }}
          >
            {/* Category + SKU */}
            <div className="flex items-center gap-2 mb-2">
              <Link to={`/shop?cat=${encodeURIComponent(product.cat)}`}
                className="text-xs font-bold text-blue-600 uppercase tracking-widest hover:text-amber-600 transition-colors">
                {product.cat}
              </Link>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-400 font-mono">{product.sku}</span>
              {/* B2B buyers reconcile input credit against the HSN code, so it belongs
                  on the product page rather than only on the invoice. */}
              {(product.hsn || product.hsnCode) && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-xs text-gray-400 font-mono">
                    HSN {product.hsn || product.hsnCode}
                  </span>
                </>
              )}
              {(product.gstRate != null) && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-xs text-gray-500">GST {Number(product.gstRate)}%</span>
                </>
              )}
            </div>

            {/* Name */}
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 leading-tight mb-2">
              {product.name}
            </h1>

            {/* Tagline */}
            {product.tagline && (
              <p className="text-amber-700 font-semibold text-base mb-4 italic">"{product.tagline}"</p>
            )}

            {/* Rating row */}
            <div className="flex items-center gap-3 mb-5 flex-wrap">
              <Stars rating={displayRating} size="md"/>
              <span className="text-sm font-bold text-gray-700">{displayRating}</span>
              <button onClick={() => setTab('reviews')}
                className="text-sm text-blue-600 hover:text-amber-600 font-semibold underline decoration-dotted transition-colors">
                {totalRevs} {totalRevs === 1 ? 'review' : 'reviews'}
              </button>
              {product.inStock
                ? <span className="flex items-center gap-1 text-green-600 text-sm font-bold"><CheckCircle className="h-4 w-4"/>In Stock</span>
                : <span className="flex items-center gap-1 text-red-500 text-sm font-bold"><AlertCircle className="h-4 w-4"/>Out of Stock</span>
              }
              {product.inStock !== false && product.stockQty > 0 && product.stockQty <= 10 && (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full animate-pulse">
                  ⚡ Only {product.stockQty} left!
                </span>
              )}
            </div>

            {/* Summary */}
            <p className="text-gray-600 text-base leading-relaxed mb-6 border-l-4 border-amber-400 pl-4 bg-amber-50/50 py-3 rounded-r-xl">
              {product.summary || product.desc}
            </p>

            {/* Key features */}
            <div className="mb-6">
              <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded brand-gradient flex items-center justify-center">
                  <CheckCircle className="h-3 w-3 text-white"/>
                </span>
                Key Features
              </h3>
              <ul className="space-y-2">
                {(product.features || []).map((f, i) => (
                  <motion.li key={i}
                    initial={{ opacity:0, x:-12 }} animate={{ opacity:1, x:0 }} transition={{ delay: i*0.06 }}
                    className="flex items-start gap-2.5 text-sm text-gray-700">
                    <span className="w-5 h-5 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle className="h-3 w-3 text-amber-600"/>
                    </span>
                    {f}
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Pricing */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
              <div className="flex items-baseline gap-3 mb-1">
                <span className="text-4xl font-black text-gray-900">{fmt(product.price)}</span>
                {product.mrp > product.price && (
                  <span className="text-lg text-gray-400 line-through">{fmt(product.mrp)}</span>
                )}
              </div>
              {d > 0 && (
                <div className="flex items-center gap-2">
                  <span className="badge-gold">{d}% OFF</span>
                  <span className="text-green-600 text-sm font-bold">You save {fmt(saved)}</span>
                </div>
              )}
              {/* Price is GST-inclusive; show the split so the buyer sees the base
                  price and the tax that make up the amount, as on the invoice. */}
              {product.gstRate != null && (() => {
                const rate = Number(product.gstRate) || 0;
                const gstAmt = product.price - product.price * 100 / (100 + rate);
                const base = product.price - gstAmt;
                return (
                  <div className="mt-3 pt-3 border-t border-dashed border-gray-100 text-[13px] space-y-1">
                    <div className="flex justify-between text-gray-500">
                      <span>Base price (taxable)</span><span>{fmt(base)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>GST @ {rate}%</span><span>{fmt(gstAmt)}</span>
                    </div>
                    <div className="flex justify-between text-gray-700 font-semibold">
                      <span>Total (incl. GST)</span><span>{fmt(product.price)}</span>
                    </div>
                  </div>
                );
              })()}
              <p className="text-[11px] text-gray-400 mt-2">Inclusive of GST · GST invoice with HSN · Delivery charged separately by pincode</p>
            </div>

            {/* Serviceability — answered before the buyer commits, not after */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
              <PincodeCheck orderValue={(product.price || 0) * qty} compact />
            </div>

            {/* Quantity + Add to Cart + Buy Now */}
            <div className="space-y-3 mb-6">
              {/* Qty selector */}
              <div className="flex items-center gap-3 flex-wrap">
                <label className="text-sm font-semibold text-gray-600">Qty:</label>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                  <button onClick={() => setQty(q => Math.max(1,q-1))} disabled={qty <= 1}
                    aria-label="Decrease quantity"
                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 text-gray-600 font-bold text-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed">−</button>
                  <span className="w-12 text-center font-bold text-gray-900">{qty}</span>
                  <button onClick={() => setQty(q => Math.min(maxQty,q+1))} disabled={atMax}
                    aria-label="Increase quantity"
                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 text-gray-600 font-bold text-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed">+</button>
                </div>
                {knownStock && (
                  <span className={`text-sm ${lowStock ? 'text-amber-700 font-semibold' : 'text-gray-500'}`}>
                    {lowStock
                      ? <>Only <strong>{maxQty}</strong> left in stock</>
                      : <><strong className="text-gray-900">{maxQty}</strong> in stock</>}
                  </span>
                )}
                {soldOut && (
                  <span className="text-sm font-semibold text-red-600">Out of stock</span>
                )}
                {!liveStock && (
                  <span className="text-sm text-gray-400">Live stock unavailable — we'll confirm on order</span>
                )}
                <span className="text-sm text-gray-400 ml-auto">Total: <strong className="text-gray-900">{fmt(product.price * qty)}</strong></span>
              </div>

              {/* Reached the available stock — steer larger requirements to a bulk quote */}
              {atMax && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
                  <p className="font-semibold text-amber-800">
                    That's all we have in stock ({maxQty} unit{maxQty === 1 ? '' : 's'}).
                  </p>
                  <p className="text-amber-700 mt-0.5">
                    Need more? Raise a bulk order enquiry or request a quote and our team will confirm
                    availability, lead time and volume pricing.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2.5">
                    <button onClick={() => setBulkOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-blue-900 text-white hover:bg-blue-800 transition-colors">
                      <Package className="h-3.5 w-3.5" /> Bulk order enquiry
                    </button>
                    <button onClick={() => addToRfq(product, maxQty)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold border-2 border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors">
                      <FileText className="h-3.5 w-3.5" /> Request a quote
                    </button>
                  </div>
                </div>
              )}

              {/* Add to cart */}
              <motion.button
                onClick={handleAdd}
                disabled={!product.inStock}
                whileTap={{ scale: 0.98 }}
                className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2.5 transition-all shadow-md ${
                  inCart
                    ? 'bg-green-600 text-white shadow-green-500/25 hover:bg-green-700'
                    : 'bg-blue-900 hover:bg-blue-800 text-white shadow-blue-900/25'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <AnimatePresence mode="wait">
                  {addedAnim
                    ? <motion.span key="done" initial={{scale:.7}} animate={{scale:1}} className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5"/>Added to Cart!
                      </motion.span>
                    : <motion.span key="add" className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5"/>
                        {inCart ? `In Cart · Add ${qty} More` : `Add ${qty > 1 ? qty+' ×' : ''} to Cart`}
                      </motion.span>
                  }
                </AnimatePresence>
              </motion.button>

              {/* Buy Now */}
              <button onClick={handleBuyNow} disabled={!product.inStock}
                className="w-full py-4 rounded-2xl font-bold text-base btn-gold flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed">
                <Zap className="h-5 w-5"/>
                Buy Now — Instant Checkout
              </button>

              {/* B2B — Request for Quote */}
              <button onClick={() => addToRfq(product, qty)}
                className={`w-full py-3.5 rounded-2xl font-bold text-base border-2 transition-colors flex items-center justify-center gap-2.5 ${
                  inRfq(product.id)
                    ? 'border-green-400 bg-green-50 text-green-700'
                    : 'border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-400'
                }`}>
                <FileText className="h-5 w-5"/>
                {inRfq(product.id) ? 'Added to Quote List ✓' : 'Request for Quote (Bulk / B2B)'}
              </button>

              {/* WhatsApp quick enquiry */}
              <a href={`https://wa.me/918927070972?text=${encodeURIComponent(`Hi Navgrow! I want to order: ${product.name} (SKU: ${product.sku}) — ₹${product.price.toLocaleString('en-IN')} × ${qty}. Please confirm availability.`)}`}
                target="_blank" rel="noopener noreferrer"
                className="w-full py-3.5 rounded-2xl font-bold text-base border-2 border-[#25D366] text-[#1a9c4d] hover:bg-[#f0fff4] transition-colors flex items-center justify-center gap-2.5">
                <MessageCircle className="h-5 w-5"/>
                WhatsApp Enquiry
              </a>
            </div>

            {/* Share */}
            <div className="flex items-center gap-3">
              <button onClick={handleShare}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors">
                {copied ? <Check className="h-4 w-4 text-green-500"/> : <Share2 className="h-4 w-4"/>}
                {copied ? 'Link Copied!' : 'Share'}
              </button>
              <span className="text-gray-200">·</span>
              <a href="tel:+918927070972"
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors">
                <Phone className="h-4 w-4"/>
                Call to Order
              </a>
              <span className="text-gray-200">·</span>
              <span className="flex items-center gap-1 text-sm text-gray-400">
                <Tag className="h-3.5 w-3.5"/>{product.sku}
              </span>
            </div>
          </motion.div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            DETAIL TABS
        ══════════════════════════════════════════════════════════════════ */}
        <div className="mt-16">
          {/* Tab bar */}
          <div className="flex gap-0 border-b border-gray-200 overflow-x-auto scrollbar-hide mb-8">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-3 text-sm font-bold whitespace-nowrap capitalize border-b-2 transition-all ${
                  tab === t
                    ? 'border-amber-500 text-amber-700'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}>
                {t === 'reviews' ? `Reviews (${totalRevs})` : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity:0, y:10 }}
              animate={{ opacity:1, y:0 }}
              exit={{ opacity:0, y:-10 }}
              transition={{ duration:.2 }}
            >

              {/* ── DESCRIPTION ── */}
              {tab === 'description' && (() => {
                // Robust across sources: admin products carry `description`,
                // static ones may only have `desc`/`summary`. Never render the
                // literal string "undefined" (the reported bug).
                const full = (product.description || product.desc || product.summary || '').trim();
                if (!full) return <p className="text-gray-500">No description available for this product yet.</p>;
                const isLong = full.length > 400;
                const shown = showFull || !isLong ? full : full.slice(0, 400).replace(/\s+\S*$/, '') + '…';
                return (
                <div className="max-w-3xl">
                  <div
                    className="prose prose-blue max-w-none text-gray-700 leading-loose
                      prose-headings:text-gray-900 prose-h2:text-xl prose-h3:text-lg
                      prose-li:text-gray-700 prose-ul:list-disc prose-ul:pl-5 prose-ol:pl-5"
                    dangerouslySetInnerHTML={{ __html: renderArticleHtml(shown) }}
                  />
                  {isLong && (
                    <button onClick={() => setShowFull(v=>!v)}
                      className="mt-2 text-blue-600 font-semibold text-sm flex items-center gap-1 hover:text-amber-600 transition-colors">
                      {showFull ? <><ChevronUp className="h-4 w-4"/>Show less</> : <><ChevronDown className="h-4 w-4"/>Read full description</>}
                    </button>
                  )}

                  {/* Warranty block */}
                  {product.warranty && (
                    <div className="mt-8 p-5 bg-gradient-to-br from-blue-50 to-amber-50/30 border border-blue-100 rounded-2xl">
                      <h4 className="font-bold text-blue-900 text-sm flex items-center gap-2 mb-2">
                        <Shield className="h-4 w-4 text-amber-500"/>Warranty & Trust
                      </h4>
                      <p className="text-gray-700 text-sm leading-relaxed">{product.warranty}</p>
                    </div>
                  )}
                </div>
                );
              })()}

              {/* ── SPECIFICATIONS ── */}
              {tab === 'specifications' && (
                <div className="max-w-2xl">
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    {(product.specs || []).map(({ label, value }, i) => (
                      <div key={i} className={`flex items-start gap-4 px-5 py-4 ${i%2===0?'bg-gray-50/60':'bg-white'} ${i>0?'border-t border-gray-100':''}`}>
                        <span className="text-sm font-bold text-blue-900 w-40 shrink-0">{label}</span>
                        <span className="text-sm text-gray-700 flex-1">{value}</span>
                      </div>
                    ))}
                  </div>
                  {(product.specs||[]).length === 0 && (
                    <p className="text-gray-500 text-sm">Detailed specifications available on request — call +91 89270 70972.</p>
                  )}
                </div>
              )}

              {/* ── BENEFITS ── */}
              {tab === 'benefits' && (
                <div className="max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(product.benefits || []).map((b, i) => (
                    <motion.div key={i}
                      initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.07 }}
                      className="flex items-start gap-3 p-4 bg-white border border-amber-100 rounded-2xl shadow-sm hover:border-amber-300 hover:shadow-md transition-all">
                      <span className="w-8 h-8 rounded-xl gold-gradient flex items-center justify-center shrink-0 mt-0.5">
                        <Star className="h-4 w-4 text-white"/>
                      </span>
                      <p className="text-sm text-gray-700 leading-relaxed">{b}</p>
                    </motion.div>
                  ))}
                  {(product.benefits||[]).length === 0 && (
                    <p className="text-gray-500 text-sm">Contact our team for detailed product benefits.</p>
                  )}
                </div>
              )}

              {/* ── APPLICATIONS ── */}
              {tab === 'applications' && (
                <div className="max-w-3xl">
                  <p className="text-gray-600 text-sm mb-5 leading-relaxed">
                    The <strong>{product.name}</strong> is purpose-built for the following use cases. If your application is not listed, contact us — we likely have a solution.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(product.applications || []).map((a, i) => (
                      <motion.div key={i}
                        initial={{ opacity:0, scale:.96 }} animate={{ opacity:1, scale:1 }} transition={{ delay:i*0.06 }}
                        className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-blue-200 hover:shadow-md transition-all group">
                        <span className="w-8 h-8 rounded-lg brand-gradient flex items-center justify-center shrink-0">
                          <Package className="h-4 w-4 text-white"/>
                        </span>
                        <span className="text-sm text-gray-700 font-medium">{a}</span>
                      </motion.div>
                    ))}
                  </div>
                  {(product.applications||[]).length === 0 && (
                    <p className="text-gray-500 text-sm">Application details available on enquiry.</p>
                  )}
                </div>
              )}

              {/* ── REVIEWS ── */}
              {tab === 'reviews' && (
                <div className="max-w-4xl">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">

                    {/* Left: aggregate */}
                    <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                      <div className="text-center mb-5">
                        <div className="text-6xl font-black text-gray-900 leading-none">{displayRating}</div>
                        <Stars rating={displayRating} size="md"/>
                        <p className="text-sm text-gray-400 mt-1">out of 5 · {totalRevs} ratings</p>
                      </div>
                      <div className="space-y-1.5">
                        {[5,4,3,2,1].map(star => (
                          <RatingBar
                            key={star}
                            star={star}
                            count={ratingDist[star] || 0}
                            total={totalRevs}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Right: review form */}
                    <div className="lg:col-span-2">
                      <ReviewForm
                        productId={product.id}
                        productName={product.name}
                        onSubmit={() => {
                          productsApi.reviews(product.id)
                            .then(({data}) => setReviews(Array.isArray(data)?data:(data?.content||[])))
                            .catch(()=>{});
                        }}
                      />
                    </div>
                  </div>

                  {/* Review list */}
                  {reviewLoad
                    ? <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[...Array(2)].map((_,i) => (
                          <div key={i} className="h-32 rounded-2xl bg-gray-100 shimmer"/>
                        ))}
                      </div>
                    : reviews.length > 0
                    ? <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {reviews.map(r => <ReviewCard key={r.id} review={r}/>)}
                      </div>
                    : (
                      <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
                        <Star className="h-10 w-10 text-gray-200 mx-auto mb-3"/>
                        <p className="text-gray-500 font-medium">No reviews yet</p>
                        <p className="text-gray-500 text-sm mt-1">Be the first to review this product!</p>
                      </div>
                    )
                  }
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            RELATED PRODUCTS
        ══════════════════════════════════════════════════════════════════ */}
        {related.length > 0 && (
          <div className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900">You Might Also Need</h2>
                <p className="text-sm text-gray-500 mt-1">More products from <span className="font-semibold text-blue-700">{product.cat}</span></p>
              </div>
              <Link to={`/shop?cat=${encodeURIComponent(product.cat)}`}
                className="text-sm font-bold text-blue-600 hover:text-amber-600 transition-colors flex items-center gap-1">
                View All <ChevronRight className="h-4 w-4"/>
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {related.map(p => <RelatedCard key={p.id} product={p}/>)}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            BOTTOM CTA STRIP
        ══════════════════════════════════════════════════════════════════ */}
        <div className="mt-16 rounded-3xl cta-gradient p-8 md:p-10 relative overflow-hidden">
          {/* Decorative dots */}
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage:'radial-gradient(white 1px, transparent 1px)', backgroundSize:'20px 20px' }}/>
          {/* Gold accent line */}
          <div className="absolute top-0 left-0 right-0 h-0.5 gold-gradient"/>

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-amber-300 font-bold text-sm uppercase tracking-widest mb-1">Need help choosing?</p>
              <h3 className="text-white font-extrabold text-xl md:text-2xl leading-tight">
                Talk to a Navgrow product specialist
              </h3>
              <p className="text-blue-200 text-sm mt-1.5">Get expert advice on the right specification for your railway or industrial site.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <a href="tel:+918927070972"
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-blue-900 font-extrabold rounded-2xl hover:bg-blue-50 transition-colors shadow-lg">
                <Phone className="h-5 w-5 text-amber-600"/>
                +91 89270 70972
              </a>
              <a href="https://wa.me/918927070972" target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-6 py-3.5 font-extrabold rounded-2xl shadow-lg bg-[#25D366] hover:bg-[#1fba59] text-white">
                <MessageCircle className="h-5 w-5"/>
                WhatsApp Us
              </a>
            </div>
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════════════
          STICKY BOTTOM BAR (mobile + desktop)
      ══════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ delay: 1.2, type: 'spring', stiffness: 200, damping: 28 }}
        className="fixed bottom-0 left-0 right-0 z-[70] bg-white/98 backdrop-blur-md border-t border-gray-200 shadow-2xl px-4 py-3 lg:hidden"
      >
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-gray-900 text-base leading-none">{fmt(product.price * qty)}</p>
            {d > 0 && <p className="text-xs text-green-600 font-semibold">{d}% OFF · Save {fmt(saved * qty)}</p>}
          </div>
          <button aria-label="Add to cart" onClick={handleAdd} disabled={!product.inStock}
            className={`flex-1 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${inCart?'bg-green-600 text-white':'bg-blue-900 text-white hover:bg-blue-800'} disabled:opacity-50`}>
            <ShoppingCart className="h-4 w-4"/>
            {inCart ? 'In Cart' : 'Add to Cart'}
          </button>
          <button onClick={handleBuyNow} disabled={!product.inStock}
            className="flex-1 py-3 rounded-2xl font-bold text-sm btn-gold flex items-center justify-center gap-2 disabled:opacity-50">
            <Zap className="h-4 w-4"/>Buy Now
          </button>
        </div>
      </motion.div>

      {/* Bottom spacing for sticky bar */}
      <div className="h-20 lg:h-0"/>
      <BulkOrderForm product={product} open={bulkOpen} onClose={() => setBulkOpen(false)} />

    </div>
  );
};

export default ProductDetailPage;
