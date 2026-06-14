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
import { Star, Quote, ExternalLink } from 'lucide-react';

const clients = [
  {
    name: 'Indian Railways',
    project: 'Rainwater Leakage Testing Plant',
    location: 'Siliguri Diesel Loco Shed',
    year: '2025',
    image: '/wltpsguj.jpeg',
    stars: 5,
  },
  {
    name: 'Indian Railways',
    project: 'Modified Hand Brake Fitment',
    location: 'Siliguri Diesel Loco Shed',
    year: '2025–2026',
    image: '/handbreak.png',
    stars: 5,
  },
  {
    name: 'Wabtec Locomotives Pvt. Ltd.',
    project: 'Lube Oil Storage Solutions',
    location: 'Siliguri, West Bengal',
    year: '2026',
    image: '/barricading.png',
    stars: 5,
  },
];

const TestimonialsSection = () => (
  <section className="section-padding bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 relative overflow-hidden">
    {/* Pattern */}
    <div className="absolute inset-0 opacity-10"
      style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent" />

    <div className="container mx-auto px-4 relative z-10">
      {/* Header */}
      <motion.div className="text-center max-w-2xl mx-auto mb-14"
        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-6 border border-blue-400/30 text-blue-200">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          Our Clients
        </div>
        <h2 className="mb-4 text-white">Trusted by <span className="gradient-text">Industry Leaders</span></h2>
        <p className="text-blue-200 text-lg">
          Delivering quality-first engineering to India's most demanding railway and industrial clients.
        </p>
      </motion.div>

      {/* Client cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-7 mb-14">
        {clients.map((c, i) => (
          <motion.div
            key={i}
            className="group rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            <div className="h-44 overflow-hidden relative">
              <img loading="lazy" decoding="async" src={c.image} alt={c.project} onError={(e) => { e.target.onerror=null; e.target.style.display='none'; }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy" decoding="async" />
              <div className="absolute inset-0 bg-gradient-to-t from-blue-950/80 to-transparent" />
            </div>
            <div className="p-6">
              <div className="flex gap-0.5 mb-3">
                {[...Array(c.stars)].map((_, si) => <Star key={si} className="h-4 w-4 star-gold" />)}
              </div>
              <h4 className="font-bold text-white text-lg mb-1">{c.name}</h4>
              <p className="text-blue-200 text-sm mb-1">{c.project}</p>
              <p className="text-blue-300 text-xs">{c.location} · {c.year}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Share experience */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}>
        <div className="inline-block bg-white/5 border border-white/10 rounded-2xl px-10 py-8 max-w-lg mx-auto">
          <Quote className="h-8 w-8 text-blue-400 mx-auto mb-3" />
          <p className="text-blue-100 text-base mb-5">
            Worked with us on a project? Share your experience and help us grow.
          </p>
          <a
            href="mailto:info@navgrow.org?subject=Client Testimonial"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-blue-700 rounded-full font-semibold text-sm hover:bg-blue-50 transition-colors shadow-lg"
          >
            <ExternalLink className="h-4 w-4" /> Share Your Experience
          </a>
        </div>
      </motion.div>
    </div>
  </section>
);

export default TestimonialsSection;
