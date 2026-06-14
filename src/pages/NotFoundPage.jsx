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
import React, { useState } from 'react';
import useSeo from '@/hooks/useSeo';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Search, ShoppingBag, Phone, MessageCircle, Calculator } from 'lucide-react';

const SUGGESTIONS = [
  { icon: Home,        label: 'Home',             to: '/' },
  { icon: ShoppingBag, label: 'Shop Products',    to: '/shop' },
  { icon: Calculator,  label: 'Get a Quote',      to: '/quote-calculator' },
  { icon: Phone,       label: 'Contact Us',       to: '/contact' },
];

const NotFoundPage = () => {
  useSeo({ title: "Page Not Found | 404", description: "The page you're looking for doesn't exist. Return to Navgrow Engineering homepage for railway, industrial and government engineering services.", path: "/404" });
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/shop?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-4">
      <div className="max-w-lg w-full text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
          {/* Animated 404 */}
          <div className="relative mb-8">
            <div className="text-[120px] font-black text-blue-100 leading-none select-none">404</div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-5xl">🔍</div>
            </div>
          </div>

          <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Page Not Found</h1>
          <p className="text-gray-500 mb-8 leading-relaxed">
            This page doesn't exist or was moved. Let us help you find what you're looking for.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex gap-2 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search products, services…"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white"
              />
            </div>
            <button type="submit" className="px-5 py-3 btn-gold rounded-2xl shrink-0">
              Search
            </button>
          </form>

          {/* Quick links */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            {SUGGESTIONS.map(({ icon: Icon, label, to }) => (
              <Link key={to} to={to}
                className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all">
                <div className="w-9 h-9 rounded-xl brand-gradient flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-gray-800 text-sm">{label}</span>
              </Link>
            ))}
          </div>

          {/* Back + WhatsApp */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate(-1)}
              className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-2xl hover:border-blue-300 hover:bg-blue-50 transition-all">
              <ArrowLeft className="h-4 w-4" /> Go Back
            </button>
            <a href="https://wa.me/918927070972?text=I%20got%20a%20404%20error%20on%20navgrow.org"
              target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-6 py-3 text-white font-semibold rounded-2xl hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#25D366' }}>
              <MessageCircle className="h-4 w-4" /> Need Help?
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFoundPage;
