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
import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShoppingCart, ArrowRight, ShieldCheck, Package, Wrench, HardHat } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { toCartItem } from '@/lib/cartItem';
import { productsApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { ALL_PRODUCTS } from '@/lib/productData';

// The four roles we lead with on the homepage — one per major category. Kept as
// slugs (not copies of the product data) so the card always renders the real
// catalogue entry: real name, price, image and stock.
const FEATURED_SLUGS = [
  'industrial-safety-helmet-isi',
  'digital-torque-wrench',
  'anti-corrosion-penetrant-spray',
  'digital-vernier-caliper',
];

// Offline/last-resort source. This is the SAME catalogue the shop and product
// pages use — never invented placeholder products. Earlier this was a small
// hardcoded array, which is what surfaced as "dummy products" whenever the shop
// API was unreachable or the catalogue table was empty.
const CATALOGUE_FALLBACK = (() => {
  const bySlug = new Map(ALL_PRODUCTS.map(p => [p.slug, p]));
  const picked = FEATURED_SLUGS.map(s => bySlug.get(s)).filter(Boolean);
  return (picked.length ? picked : ALL_PRODUCTS.slice(0, 4)).map(p => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: Number(p.price ?? 0),
    mrp: p.mrp != null ? Number(p.mrp) : undefined,
    cat: p.cat,
    image: p.image,
    stockQty: p.stockQty,
    gstRate: p.gstRate,
    hsn: p.hsn,
    sku: p.sku,
  }));
})();

// Normalise an API product to the shape this card renders.
const mapProduct = (p) => ({
  id: p.id,
  slug: p.slug || String(p.id),
  name: p.name,
  price: Number(p.price ?? 0),
  mrp: p.mrp != null ? Number(p.mrp) : undefined,
  cat: p.category || 'Shop',
  image: p.imageUrl || '',
  stockQty: p.stockQty,
  gstRate: p.gstRate,
  hsn: p.hsnCode,
});

/**
 * Live featured products for the homepage. Prefers products an admin has flagged
 * as featured; if none are flagged, falls back to the newest active products so
 * the section still shows the real catalogue (never the placeholder list) as long
 * as the shop API is reachable. Only a failed/empty API falls back to placeholders.
 */
const useFeaturedProducts = () => {
  const { data: featuredData, error: featuredErr, loading: fLoading } =
    useApi(() => productsApi.featured(), [], { immediate: true });
  // Only used as a fallback when the admin hasn't flagged ANY product as featured,
  // so the section is never empty on a fresh install.
  const { data: listData, error: listErr, loading: lLoading } =
    useApi(() => productsApi.list({ size: 8, active: true, sort: 'createdAt' }), [], { immediate: true });

  return React.useMemo(() => {
    const featured = Array.isArray(featuredData) ? featuredData : (featuredData?.content || []);
    const list     = listData?.content || (Array.isArray(listData) ? listData : []);
    const loading  = fLoading || lLoading;

    // STRICT: the Engineering Supply Store shows the products an admin has ticked
    // "Featured" — and ONLY those. Show up to 8 of them. We deliberately do NOT
    // top up with other products: mixing in newest/random items is exactly the
    // "it shows random products" bug. If an admin wants more here, they flag more.
    if (featured.length > 0) {
      const items = featured.slice(0, 8).map(mapProduct);
      return { items, source: 'live', loading, featuredCount: featured.length };
    }

    // While still loading, show skeletons rather than a flash of fallback content.
    if (loading) return { items: [], source: 'loading', loading, featuredCount: 0 };

    // No product is flagged featured at all. Rather than an empty section, show
    // the newest few as a clearly-labelled fallback so the page isn't broken —
    // but this only happens when NOTHING is featured, never alongside featured.
    if (list.length > 0) {
      return { items: list.slice(0, 4).map(mapProduct), source: 'fallback-newest', loading, featuredCount: 0 };
    }

    // Empty DB or unreachable API → local catalogue.
    const unreachable = Boolean(featuredErr || listErr);
    return {
      items: CATALOGUE_FALLBACK, source: unreachable ? 'offline' : 'empty',
      loading: false, featuredCount: 0,
    };
  }, [featuredData, listData, featuredErr, listErr, fLoading, lLoading]);
};

const categories = [
  { icon: HardHat,    label: 'Safety Equipment',    count: 5, color: 'from-blue-500 to-blue-700' },
  { icon: Wrench,     label: 'Railway Tools',        count: 4, color: 'from-indigo-500 to-indigo-700' },
  { icon: Package,    label: 'Maintenance Supplies', count: 4, color: 'from-cyan-500 to-cyan-700' },
  { icon: ShieldCheck,label: 'PPE & Workwear',       count: 4, color: 'from-violet-500 to-violet-700' },
];

const ShopPreview = () => {
  const { addItem, items } = useCart();
  const { items: featured, source } = useFeaturedProducts();
  const isFeatured = source === 'live';

  return (
    <section className="section-padding bg-white">
      <div className="container mx-auto px-4">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <motion.div initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ duration:0.5 }}>
            <div className="section-chip mb-4 w-fit">Online Shop</div>
            <h2 className="mb-3">{isFeatured ? <>Featured <span className="gradient-text">Products</span></> : <>Engineering <span className="gradient-text">Supply Store</span></>}</h2>
            <p className="text-gray-600 text-lg max-w-lg">
              {isFeatured
                ? 'Hand-picked products from our catalogue — available for B2B quote requests.'
                : 'Safety equipment, railway tools, maintenance supplies and PPE — available for B2B quote requests.'}
            </p>
          </motion.div>
          <motion.div initial={{ opacity:0, x:20 }} whileInView={{ opacity:1, x:0 }} viewport={{ once:true }} transition={{ duration:0.5 }}>
            <Link to="/shop" className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-blue-200 text-blue-700 font-bold hover:border-blue-400 hover:bg-blue-50 transition-all group">
              View Full Shop <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>

        {/* Category pills */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {categories.map(({ icon:Icon, label, count, color }, i) => (
            <motion.div key={label} initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ delay:i*0.08 }}>
              <Link to="/shop" className="group flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm group-hover:text-blue-700 transition-colors">{label}</p>
                  <p className="text-xs text-gray-400">{count} products</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Featured products */}
        {source === 'offline' && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
            Showing our standard catalogue — live shop data couldn't be loaded right now.
          </div>
        )}
        {source === 'fallback-newest' && (
          <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-800">
            No products are marked <strong>Featured</strong> yet — showing our latest additions. Tick “Featured” on a product in the admin panel to feature it here.
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {source === 'loading'
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                  <div className="aspect-square bg-gray-100" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                    <div className="h-4 bg-gray-100 rounded w-4/5" />
                    <div className="h-5 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              ))
            : featured.map((p, i) => {
            const inCart = items.some(item => item.id === p.id);
            return (
              <motion.div key={p.id} initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ delay:i*0.08 }}
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                <Link to={`/shop/${p.slug || p.id}`} className="block aspect-[4/3] overflow-hidden bg-gray-50">
                  <img src={p.image} alt={p.name} loading="lazy" decoding="async"
                  onError={(e) => { e.target.onerror=null; e.target.src=`data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23dbeafe'/%3E%3Ctext x='200' y='155' font-family='sans-serif' font-size='13' fill='%232563eb' text-anchor='middle'%3E${encodeURIComponent(p.name.substring(0,20))}%3C/text%3E%3C/svg%3E`; }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </Link>
                <div className="p-4">
                  <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">{p.cat}</span>
                  <p className="font-bold text-gray-900 text-sm mt-1 mb-3 line-clamp-2 leading-snug">{p.name}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-gray-900">₹{p.price.toLocaleString('en-IN')}</span>
                    <button onClick={() => addItem(toCartItem(p))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${inCart ? 'bg-green-100 text-green-700' : 'brand-gradient text-white shadow-sm hover:opacity-90'}`}>
                      <ShoppingCart className="h-3.5 w-3.5" />
                      {inCart ? 'Added' : 'Add'}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <Link to="/shop" className="inline-flex items-center gap-2 px-8 py-3.5 brand-gradient text-white font-bold rounded-full shadow-lg shadow-blue-500/25 hover:opacity-90 transition-opacity">
            <ShoppingCart className="h-4 w-4" /> Browse All 20 Products
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ShopPreview;
