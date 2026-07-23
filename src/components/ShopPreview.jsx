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

const FEATURED = [
  { id: 1,  slug: 'industrial-safety-helmet-isi', name: 'Industrial Safety Helmet (ISI Marked)',  price: 480,  cat: 'Safety', image: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=400&q=80' },
  { id: 6, slug: 'digital-torque-wrench', name: 'Digital Torque Wrench (10–200 Nm)',      price: 4800, cat: 'Tools',  image: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=400&q=80' },
  { id: 11, name: 'Anti-Corrosion Penetrant Spray (500 ml)',price: 380,  cat: 'Supply', image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&q=80' },
  { id: 14, name: 'Digital Vernier Calliper (0–300 mm)',    price: 1650, cat: 'Testing',image: 'https://images.unsplash.com/photo-1611791484670-ce19b801d192?w=400&q=80' },
];

const categories = [
  { icon: HardHat,    label: 'Safety Equipment',    count: 5, color: 'from-blue-500 to-blue-700' },
  { icon: Wrench,     label: 'Railway Tools',        count: 4, color: 'from-indigo-500 to-indigo-700' },
  { icon: Package,    label: 'Maintenance Supplies', count: 4, color: 'from-cyan-500 to-cyan-700' },
  { icon: ShieldCheck,label: 'PPE & Workwear',       count: 4, color: 'from-violet-500 to-violet-700' },
];

const ShopPreview = () => {
  const { addItem, items } = useCart();

  return (
    <section className="section-padding bg-white">
      <div className="container mx-auto px-4">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <motion.div initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ duration:0.5 }}>
            <div className="section-chip mb-4 w-fit">Online Shop</div>
            <h2 className="mb-3">Engineering <span className="gradient-text">Supply Store</span></h2>
            <p className="text-gray-600 text-lg max-w-lg">Safety equipment, railway tools, maintenance supplies and PPE — available for B2B quote requests.</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURED.map((p, i) => {
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
