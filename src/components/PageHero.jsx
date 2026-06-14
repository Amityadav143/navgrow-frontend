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
import { ChevronRight } from 'lucide-react';

/**
 * Reusable dark-gradient page hero with breadcrumb.
 * Props: chip, title (JSX), subtitle, breadcrumbs [{label, path}]
 */
const PageHero = ({ chip, title, subtitle, breadcrumbs = [] }) => (
  <section className="pt-10 pb-14 bg-gradient-to-br from-blue-950 to-indigo-900 relative overflow-hidden">
    <div className="absolute inset-0 opacity-10"
      style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
    <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />
    <div className="container mx-auto px-4 relative z-10">
      {/* Breadcrumb */}
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-xs text-blue-300/70 mb-5 flex-wrap">
          <Link to="/" className="hover:text-blue-200 transition-colors">Home</Link>
          {breadcrumbs.map((b, i) => (
            <React.Fragment key={i}>
              <ChevronRight className="h-3 w-3 text-blue-500/50" />
              {b.path
                ? <Link to={b.path} className="hover:text-blue-200 transition-colors">{b.label}</Link>
                : <span className="text-blue-200 font-medium">{b.label}</span>
              }
            </React.Fragment>
          ))}
        </nav>
      )}

      <motion.div className="max-w-3xl"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        {chip && (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-5 border border-blue-400/30 text-blue-200">
            {chip}
          </div>
        )}
        <h1 className="mb-3 text-white leading-tight">{title}</h1>
        {subtitle && <p className="text-blue-200 text-lg leading-relaxed max-w-2xl">{subtitle}</p>}
        <div className="mt-6 w-24 gold-divider" />
      </motion.div>
    </div>
  </section>
);

export default PageHero;
