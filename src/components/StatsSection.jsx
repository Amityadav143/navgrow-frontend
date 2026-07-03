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
import { Building2, Users, Award, Clock, Percent } from 'lucide-react';
import AnimatedCounter from '@/components/AnimatedCounter';

const stats = [
  {
    icon: Building2, value: '30+', label: 'Projects Delivered',
    desc: 'Railway, industrial & sustainability projects',
    iconBg: 'from-blue-700 to-blue-900', accent: 'border-blue-400/20',
  },
  {
    icon: Users, value: '5+', label: 'Major Clients',
    desc: 'Industrial, government & commercial',
    iconBg: 'from-amber-500 to-amber-700', accent: 'border-amber-400/30',
  },
  {
    icon: Percent, value: '100 %', label: 'On-Time Delivery',
    desc: 'Every project, on schedule',
    iconBg: 'from-green-500 to-amber-700', accent: 'border-amber-400/30',
  },
  {
    icon: Award, value: '3', label: 'Gov. Registrations',
    desc: 'DPIIT, MSME & Make in India',
    iconBg: 'from-blue-600 to-blue-800', accent: 'border-blue-400/20',
  },
  {
    icon: Clock, value: '3+', label: 'Years of Excellence',
    desc: 'Quality-first since 2022',
    iconBg: 'from-amber-600 to-amber-800', accent: 'border-amber-400/30',
  },
];

const StatsSection = () => (
  <section className="relative py-20 overflow-hidden">
    {/* Deep navy background */}
    <div className="absolute inset-0 dark-section" />
    {/* Gold shimmer top border */}
    <div className="absolute top-0 left-0 right-0 h-0.5 gold-divider" />
    <div className="absolute bottom-0 left-0 right-0 h-0.5 gold-divider" />
    {/* Dot pattern */}
    <div className="absolute inset-0 opacity-5"
      style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
    {/* Gold glow orbs */}
    <div className="absolute top-0 left-1/4 w-64 h-64 bg-amber-500/8 rounded-full blur-3xl" />
    <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />

    <div className="container mx-auto px-4 relative z-10">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-5">
        {stats.map(({ icon: Icon, value, label, desc, iconBg, accent }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="group relative"
          >
            <div className={`glass-card-dark rounded-2xl p-6 text-center h-full border ${accent} hover:border-amber-400/50 transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-xl group-hover:shadow-amber-900/20`}>
              {/* Gold top line on hover */}
              <div className="absolute top-0 left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full" />

              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${iconBg} shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <Icon className="h-7 w-7 text-white" />
              </div>
              <div className="text-3xl md:text-4xl font-extrabold text-white mb-1">
                <AnimatedCounter target={value} />
              </div>
              <div className="text-base font-bold text-blue-200 mb-1">{label}</div>
              <div className="text-xs text-blue-300/70 leading-relaxed">{desc}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default StatsSection;
