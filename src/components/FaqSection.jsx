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
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, HelpCircle } from 'lucide-react';

const FAQS = [
  { q: 'What does Navgrow do?', a: 'Navgrow is an engineering and sustainability solutions company. On the engineering side we deliver railway infrastructure, industrial engineering, civil construction, government contracts, and maintenance. On the sustainability side we design and build rainwater harvesting, solar energy, wastewater treatment, energy-efficiency, and green-building projects. Both are delivered with the same quality-first engineering discipline — proven on projects for Indian Railways and Wabtec.' },
  { q: 'What services do you offer?', a: 'Two categories. Engineering Services: railway infrastructure (loco modification, testing plants, shed works), industrial engineering and fabrication, civil and construction works, government tender management, and maintenance/AMC. Sustainability Solutions: rainwater harvesting, solar energy, wastewater treatment and recycling, energy-efficiency audits, and green-building consulting. You can engage us for either — or both.' },
  { q: 'Are your systems compliant with regulations?', a: 'Yes. Our rainwater harvesting designs meet CGWA norms and state mandates; our water-treatment systems are engineered to CPCB/SPCB discharge standards; energy audits follow BEE guidelines; and solar installations include net-metering and MNRE subsidy support. Compliance is built into the design, not added as an afterthought.' },
  { q: 'How do I request a quote or consultation?', a: 'You can use the contact form on our Contact page, email us at info@navgrow.org, call us at +91 89270 70972, or reach out instantly via WhatsApp. We respond to all enquiries within 24 business hours.' },
  { q: 'Do you help with solar subsidies and net-metering?', a: 'Yes. For solar projects we handle the full process — feasibility and energy-yield analysis, net-metering approvals with your DISCOM, and documentation for MNRE and state solar subsidies — so you capture every available incentive.' },
  { q: 'Is Navgrow a registered, credible company?', a: 'Yes. Navgrow Engineering Service Pvt. Ltd. is a DPIIT-recognised startup and MSME-registered enterprise, and a Make in India aligned supplier (CIN: U74999WB2022PTC256012). Our engineering credentials were earned on projects for Indian Railways and Wabtec, where precision and compliance are non-negotiable.' },
  { q: 'How quickly can you start a project?', a: 'For standard projects we can mobilise within 7–14 days of work order issue, following a site assessment and feasibility study. Timelines for larger installations are confirmed based on scope and site conditions.' },
  { q: 'Can you help with government and PSU tenders?', a: 'Absolutely. As an MSME-registered enterprise we support the full tender lifecycle for sustainability projects — opportunity identification on GeM and other portals, document preparation, technical bid writing, compliance management, and post-award execution.' },
  { q: 'Do you provide ongoing maintenance?', a: 'Yes. Every solution can include an Annual Maintenance Contract covering scheduled preventive maintenance, performance monitoring, periodic audits, and priority response — so your rainwater, solar, or treatment systems keep performing at their best.' },
  { q: 'Where is Navgrow based and which areas do you serve?', a: 'Navgrow is headquartered in Siliguri, West Bengal (734001). We primarily serve North Bengal and North-East India, and can mobilise pan-India for larger contracts.' },
];

const FaqItem = ({ item, isOpen, onToggle }) => (
  <div className={`rounded-2xl border transition-all duration-200 overflow-hidden ${isOpen ? 'border-blue-200 bg-blue-50/50' : 'border-gray-100 bg-white hover:border-blue-100'}`}>
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between gap-4 p-5 text-left"
    >
      <span className={`font-semibold text-base leading-snug ${isOpen ? 'text-blue-700' : 'text-gray-900'}`}>{item.q}</span>
      <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${isOpen ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
        {isOpen ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
      </span>
    </button>
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
        >
          <p className="px-5 pb-5 text-gray-600 leading-relaxed text-sm">{item.a}</p>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const FaqSection = () => {
  const [open, setOpen] = useState(0);
  const toggle = (i) => setOpen(prev => prev === i ? null : i);

  return (
    <section className="section-padding bg-gray-50/80">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">

          {/* Left */}
          <motion.div className="lg:col-span-2"
            initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <div className="section-chip mb-4 w-fit">FAQ</div>
            <h2 className="mb-4">Frequently Asked <span className="gradient-text">Questions</span></h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              Everything you need to know about working with Navgrow Engineering Service Pvt. Ltd.
            </p>
            <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <HelpCircle className="h-6 w-6 text-amber-600 mb-3" />
              <p className="font-semibold text-gray-900 mb-1">Still have questions?</p>
              <p className="text-sm text-gray-500 mb-3">Our team is happy to help with any specific enquiry.</p>
              <a href="https://wa.me/918927070972" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#25D366] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
                💬 WhatsApp Us
              </a>
            </div>
          </motion.div>

          {/* Right — accordion */}
          <motion.div className="lg:col-span-3 flex flex-col gap-3"
            initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            {FAQS.map((item, i) => (
              <FaqItem key={i} item={item} isOpen={open === i} onToggle={() => toggle(i)} />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default FaqSection;
