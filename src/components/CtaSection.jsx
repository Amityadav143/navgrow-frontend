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
import { ArrowRight, Phone, MessageCircle, Mail } from 'lucide-react';

const CtaSection = () => (
  <section className="relative py-24 overflow-hidden">
    <div className="absolute inset-0 brand-gradient" />
    <div className="absolute inset-0 opacity-10"
      style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
    {/* Decorative circles */}
    <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
    <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-white/5" />

    <div className="container mx-auto px-4 relative z-10">
      <motion.div
        className="max-w-4xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-6 border border-white/30 text-white/80">
              <span className="w-2 h-2 rounded-full bg-white/70 animate-pulse" />
              Start Your Project
            </div>
            <h2 className="text-white mb-4 leading-tight">
              Ready to Build Something <span className="gradient-text-gold">Exceptional?</span>
            </h2>
            <p className="text-blue-100 text-lg leading-relaxed">
              Partner with Navgrow Engineering — your trusted contractor for railway infrastructure, industrial projects, civil works, and government contracts across India. Let's discuss your project today.
            </p>
          </div>

          {/* Action cards */}
          <div className="flex flex-col gap-4">
            {[
              {
                icon: Phone,
                label: 'Call Us Directly',
                value: '+91 89270 70972',
                href: 'tel:+918927070972',
                bg: 'bg-white',
                textColor: 'text-blue-700',
                subColor: 'text-blue-600',
              },
              {
                icon: MessageCircle,
                label: 'WhatsApp Chat',
                value: 'Quick Response Guaranteed',
                href: 'https://wa.me/918927070972?text=Hello%20Navgrow%2C%20I%20need%20a%20quote',
                bg: 'bg-[#25D366]',
                textColor: 'text-white',
                subColor: 'text-white/80',
                external: true,
              },
              {
                icon: Mail,
                label: 'Email Us',
                value: 'info@navgrow.org',
                href: 'mailto:info@navgrow.org',
                bg: 'bg-white/15',
                textColor: 'text-white',
                subColor: 'text-white/70',
              },
            ].map(({ icon: Icon, label, value, href, bg, textColor, subColor, external }) => (
              <a
                key={label}
                href={href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                className={`flex items-center gap-4 p-4 rounded-2xl ${bg} hover:scale-[1.02] transition-transform duration-200 shadow-lg`}
              >
                <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Icon className={`h-5 w-5 ${textColor}`} />
                </div>
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${subColor}`}>{label}</p>
                  <p className={`font-bold ${textColor}`}>{value}</p>
                </div>
              </a>
            ))}

            <Link
              to="/contact"
              className="flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-white/30 text-white font-semibold hover:bg-white/10 transition-all duration-200 group"
            >
              Get a Full Quote
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

export default CtaSection;
