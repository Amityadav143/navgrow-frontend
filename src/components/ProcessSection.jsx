/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 | navgrow.org | info@navgrow.org
 *
 * PROPRIETARY & CONFIDENTIAL
 * This file is part of the Navgrow Engineering Platform.
 * Unauthorised copying, modification, distribution, or use is prohibited
 * without prior written consent of Navgrow Engineering Service Pvt. Ltd.
 *
 * ProcessSection — "How We Work". A clear 4-step delivery process that builds
 * buyer confidence by showing a structured, professional engagement model.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { PhoneCall, ClipboardList, Cog, CheckCircle2 } from 'lucide-react';

const steps = [
  { n: '01', icon: PhoneCall,     title: 'Consult & Scope',   desc: 'We understand your requirement, site conditions, and compliance needs in a free consultation.' },
  { n: '02', icon: ClipboardList, title: 'Quote & Plan',      desc: 'You receive a transparent, GST-compliant quotation with a clear timeline and deliverables.' },
  { n: '03', icon: Cog,           title: 'Execute',           desc: 'Our team delivers with stage inspections, quality checks, and documented progress.' },
  { n: '04', icon: CheckCircle2,  title: 'Handover & Support', desc: 'On-time handover with full documentation, plus ongoing maintenance and support options.' },
];

const ProcessSection = () => (
  <section className="section-padding bg-gray-50/80">
    <div className="container mx-auto px-4">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-16">
        <motion.div className="section-chip mb-4 mx-auto w-fit"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          How We Work
        </motion.div>
        <motion.h2 className="mb-4"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
          A clear path from <span className="gradient-text">enquiry to handover</span>
        </motion.h2>
        <motion.p className="text-gray-600 text-lg"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}>
          A structured, transparent delivery process that keeps you informed and in control at every stage.
        </motion.p>
      </div>

      {/* Steps */}
      <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* connecting line (desktop) */}
        <div className="hidden lg:block absolute top-12 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-blue-200 via-amber-200 to-blue-200" />

        {steps.map(({ n, icon: Icon, title, desc }, i) => (
          <motion.div
            key={n}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: i * 0.1 }}
            className="relative text-center"
          >
            {/* number circle */}
            <div className="relative z-10 w-24 h-24 mx-auto mb-5">
              <div className="w-24 h-24 rounded-full bg-white border-2 border-blue-100 shadow-lg flex items-center justify-center">
                <Icon className="h-9 w-9 text-blue-700" />
              </div>
              <div className="absolute -top-1 -right-1 w-9 h-9 rounded-full gold-gradient flex items-center justify-center text-white text-xs font-extrabold shadow-md">
                {n}
              </div>
            </div>
            <h3 className="text-lg font-extrabold text-gray-900 mb-2">{title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed px-2">{desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default ProcessSection;
