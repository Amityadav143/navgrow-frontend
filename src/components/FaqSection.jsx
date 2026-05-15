import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, HelpCircle } from 'lucide-react';

const FAQS = [
  { q: 'What types of projects does Navgrow handle?', a: 'We specialise in Indian Railways infrastructure projects including locomotive modification, rainwater testing plants, hand brake fitments, shed construction, and safety systems. We also handle government tenders and private sector projects for clients like Wabtec Locomotives.' },
  { q: 'Are you registered with Indian Railways as a vendor?', a: 'Yes. Navgrow Engineering Service Pvt. Ltd. is a DPIIT-recognised startup and MSME-registered enterprise with active vendor empanelment for Indian Railways. We are also a Make in India aligned supplier.' },
  { q: 'How do I request a project quote?', a: 'You can use the contact form on our Contact page, email us at info@navgrow.org, call us at +91 89270 70972, or reach out instantly via WhatsApp. We respond to all enquiries within 24 business hours.' },
  { q: 'How quickly can you mobilise for a new project?', a: 'For standard contracts we can mobilise within 7–14 days of work order issue. Emergency maintenance and urgent works can be mobilised within 48–72 hours depending on location and scope.' },
  { q: 'Do you supply products and equipment nationally?', a: 'Our primary operations are concentrated in North Bengal and North-East India, but we can arrange supply and project execution across India for large contracts. Shipping timelines and logistics are confirmed case-by-case.' },
  { q: 'How does the online Shop work?', a: 'Our shop lets you browse safety equipment, railway tools, maintenance supplies, and PPE. Add items to your cart and submit a quote request — we review and send you a formal quotation with GST breakdown, delivery timeline, and payment terms within 24 hours.' },
  { q: 'What quality standards do you follow?', a: 'All projects are executed per Indian Railways specifications, RDSO guidelines, and ISO quality norms. We conduct internal quality audits at every stage and provide completion documentation including inspection reports and test certificates.' },
  { q: 'Can Navgrow assist with tender preparation and compliance?', a: 'Absolutely. Our Government Contracts service covers full tender lifecycle support — opportunity identification, document preparation, technical bid writing, compliance management, contract negotiation, and post-award execution.' },
];

const FaqItem = ({ item, isOpen, onToggle }) => (
  <div className={`rounded-2xl border transition-all duration-200 overflow-hidden ${isOpen ? 'border-blue-200 warm-section/50' : 'border-gray-100 bg-white hover:border-blue-100'}`}>
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
