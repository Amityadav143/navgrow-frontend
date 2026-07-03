/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 | navgrow.org | info@navgrow.org
 *
 * PROPRIETARY & CONFIDENTIAL
 * This file is part of the Navgrow Engineering Platform.
 * Unauthorised copying, modification, distribution, or use is prohibited
 * without prior written consent of Navgrow Engineering Service Pvt. Ltd.
 *
 * IndustriesSection — the sectors Navgrow serves. A professional B2B trust
 * signal that helps prospects self-identify and see relevant expertise.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Factory, Landmark, Building2, Train, HeartPulse, GraduationCap,
  ArrowRight,
} from 'lucide-react';

const industries = [
  { icon: Factory,       title: 'Manufacturing & Industrial', desc: 'Fabrication, plant engineering, and maintenance — plus solar, water recycling, and energy audits that cut costs.' },
  { icon: Landmark,      title: 'Government & PSU',           desc: 'Compliant rainwater harvesting and clean-energy projects delivered through GeM and tender processes.' },
  { icon: Building2,     title: 'Commercial & Real Estate',   desc: 'Green-building consulting and rooftop solar for offices, malls, and mixed-use developments.' },
  { icon: Train,         title: 'Railways & Transport',       desc: 'Locomotive modification, testing plants, and shed works for Indian Railways (NER/NFR Zone).' },
  { icon: HeartPulse,    title: 'Healthcare',                 desc: 'Reliable solar-plus-storage and water systems for hospitals and care facilities.' },
  { icon: GraduationCap, title: 'Education & Campuses',       desc: 'Water conservation, solar, and waste systems for schools, colleges, and institutional campuses.' },
];

const IndustriesSection = () => (
  <section className="section-padding bg-white">
    <div className="container mx-auto px-4">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-14">
        <motion.div className="section-chip mb-4 mx-auto w-fit"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          Industries We Serve
        </motion.div>
        <motion.h2 className="mb-4"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
          Trusted across <span className="gradient-text">key sectors</span>
        </motion.h2>
        <motion.p className="text-gray-600 text-lg"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}>
          From railways and industrial plants to government and commercial campuses, we bring compliant, quality-first engineering and sustainability solutions to the sectors that power India's growth.
        </motion.p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
        {industries.map(({ icon: Icon, title, desc }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: i * 0.06 }}
            className="group relative bg-white rounded-2xl border border-gray-100 p-6 hover:border-blue-200 hover:shadow-xl transition-all duration-300 overflow-hidden"
          >
            {/* hover accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-amber-500 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" />
            <div className="w-12 h-12 rounded-xl brand-gradient flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Icon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-base font-extrabold text-gray-900 mb-1.5">{title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Footer CTA */}
      <motion.div
        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        className="mt-10 text-center"
      >
        <Link to="/services"
          className="inline-flex items-center gap-2 text-blue-700 font-bold hover:gap-3 transition-all">
          Explore our full capabilities <ArrowRight className="h-4 w-4" />
        </Link>
      </motion.div>
    </div>
  </section>
);

export default IndustriesSection;
