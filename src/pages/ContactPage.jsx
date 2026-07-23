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
import { MapPin, Phone, Mail, Clock, MessageCircle } from 'lucide-react';
import ContactForm from '@/components/ContactForm';
import useSeo from '@/hooks/useSeo';

const infos = [
  {
    icon: MapPin, label: 'Our Office', color: 'from-blue-500 to-blue-700',
    content: 'Ward No-47, Old Matigara Road, Pati Colony,\nSiliguri, West Bengal – 734001',
  },
  {
    icon: Phone, label: 'Phone', color: 'from-indigo-500 to-indigo-700',
    content: '(+91) 89270 70972',
    href: 'tel:+918927070972',
  },
  {
    icon: Mail, label: 'Email', color: 'from-cyan-500 to-cyan-700',
    content: 'info@navgrow.org',
    href: 'mailto:info@navgrow.org',
  },
  {
    icon: Clock, label: 'Business Hours', color: 'from-violet-500 to-violet-700',
    content: 'Mon – Fri: 9 AM – 6 PM\nSat – Sun: Closed',
  },
];

const ContactPage = () => {
  useSeo({
    title: 'Contact Navgrow Engineering | Get a Project Quote!',
    description: 'Contact Navgrow Engineering Service — call +91 89270 70972, email info@navgrow.org, or visit Siliguri, West Bengal. Get a project quote for railway, industrial, civil, or government engineering work.',
    path: '/contact',
    keywords: 'contact engineering company Siliguri, get project quote engineering, railway contractor contact India, engineering enquiry West Bengal, Navgrow Engineering contact',
  });
  return (
  <>
    {/* Hero */}
    <section className="pt-14 pb-16 bg-gradient-to-br from-blue-950 to-indigo-900 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      <div className="container mx-auto px-4 relative z-10">
        <motion.div className="max-w-3xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-6 border border-blue-400/30 text-blue-200">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            Let's Talk
          </div>
          <h1 className="mb-4 text-white">Get in <span className="gradient-text-light">Touch</span></h1>
          <p className="text-blue-200 text-lg">
            Have a project in mind? Our team is ready to assist with your railway and government contract needs.
          </p>
        </motion.div>
      </div>
    </section>

    {/* WhatsApp quick action */}
    <div className="bg-[#25D366]">
      <div className="container mx-auto px-4 py-3">
        <a
          href="https://wa.me/918927070972?text=Hello%20Navgrow%2C%20I%20would%20like%20to%20enquire%20about%20your%20services."
          target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 text-white font-semibold text-sm"
        >
          <MessageCircle className="h-4 w-4" />
          Prefer WhatsApp? Chat with us instantly on +91 89270 70972
          <span className="underline underline-offset-2">→</span>
        </a>
      </div>
    </div>

    {/* Main content */}
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">

          {/* Left — contact info */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>

            <h2 className="mb-2">Contact <span className="gradient-text">Information</span></h2>
            <p className="text-gray-600 mb-8">Reach us by phone, email, or visit our office in Siliguri.</p>

            <div className="flex flex-col gap-5 mb-8">
              {infos.map(({ icon: Icon, label, content, href, color }) => (
                <div key={label} className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-blue-200 transition-colors">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition-transform`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                    {href ? (
                      <a href={href} className="text-gray-900 font-medium text-sm hover:text-blue-600 transition-colors whitespace-pre-line">{content}</a>
                    ) : (
                      <p className="text-gray-900 font-medium text-sm whitespace-pre-line">{content}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Social links */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">Follow Us</p>
              <div className="flex gap-3">
                {[
                  { href: 'https://www.facebook.com/share/1FJBhpqzx4/', label: 'Facebook' },
                  { href: 'https://x.com/NavgrowEng/', label: 'Twitter/X' },
                  { href: 'https://www.linkedin.com/company/navgrow/', label: 'LinkedIn' },
                  { href: 'https://www.instagram.com/navgrow.eng/', label: 'Instagram' },
                ].map(({ href, label }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-2 bg-gray-100 rounded-lg text-xs font-medium text-gray-600 hover:bg-blue-600 hover:text-white transition-all duration-200">
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right — form */}
          <motion.div
            className="lg:col-span-3"
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <ContactForm />
          </motion.div>
        </div>
      </div>
    </section>

    {/* Map */}
    <section className="pb-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
          <h2 className="text-center mb-2">Find Us <span className="gradient-text">Here</span></h2>
          <p className="text-center text-gray-500 mb-8">Ward No-47, Old Matigara Road, Pati Colony, Siliguri, West Bengal – 734001</p>
          <div className="rounded-3xl overflow-hidden shadow-xl border border-gray-200 h-80 md:h-[450px]">
            <iframe
              title="Navgrow Engineering Office Location"
              src="https://www.openstreetmap.org/export/embed.html?bbox=88.392903%2C26.713923%2C88.412903%2C26.733923&layer=mapnik&marker=26.723923%2C88.402903"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </motion.div>
      </div>
    </section>
  </>
);
};
export default ContactPage;