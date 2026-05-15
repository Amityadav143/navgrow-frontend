import React from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Truck, Clock, CheckCircle, XCircle, Phone } from 'lucide-react';
import PageHero from '@/components/PageHero';
import { Link } from 'react-router-dom';

const steps = [
  { icon: Phone, label: 'Contact Us', desc: 'Email info@navgrow.org with your order ID & photos within 7 days of delivery.', color: 'from-blue-500 to-blue-700' },
  { icon: CheckCircle, label: 'Approval', desc: 'We review your request within 2 business days and confirm eligibility.', color: 'from-indigo-500 to-indigo-700' },
  { icon: Truck, label: 'Pickup', desc: 'We arrange reverse pickup from your address within 3 business days.', color: 'from-cyan-500 to-cyan-700' },
  { icon: RotateCcw, label: 'Refund', desc: 'Refund credited to original payment method within 7–10 business days.', color: 'from-green-500 to-green-700' },
];

const eligible = ['Defective or damaged products on arrival', 'Item significantly different from website description', 'Wrong item delivered', 'Missing parts or accessories from the package'];
const notEligible = ['Customised or made-to-order products', 'Consumables that have been opened or used', 'Products damaged due to customer misuse or improper installation', 'Returns requested after 7 days of delivery', 'Products without original packaging', 'Service contracts once work has commenced'];

const RefundPolicyPage = () => (
  <>
    <PageHero
      chip={<><RotateCcw className="h-4 w-4" /> Policy</>}
      title={<>Refund & <span className="gradient-text">Shipping Policy</span></>}
      subtitle="Our commitment to fair returns and transparent delivery terms."
      breadcrumbs={[{ label: 'Refund & Shipping Policy' }]}
    />

    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4 max-w-4xl space-y-10">

        {/* Refund process steps */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Return & Refund <span className="gradient-text">Process</span></h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {steps.map(({ icon: Icon, label, desc, color }, i) => (
              <motion.div key={label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-center">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mx-auto mb-4 shadow-md`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="text-2xl font-black text-blue-100 mb-1">0{i+1}</div>
                <h4 className="font-bold text-gray-900 mb-2">{label}</h4>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Eligible / not eligible */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
            <h3 className="font-bold text-green-800 text-lg mb-4 flex items-center gap-2"><CheckCircle className="h-5 w-5" /> Eligible for Return</h3>
            <ul className="space-y-2">
              {eligible.map((e, i) => <li key={i} className="flex items-start gap-2 text-sm text-green-700"><CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />{e}</li>)}
            </ul>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <h3 className="font-bold text-red-800 text-lg mb-4 flex items-center gap-2"><XCircle className="h-5 w-5" /> Not Eligible for Return</h3>
            <ul className="space-y-2">
              {notEligible.map((e, i) => <li key={i} className="flex items-start gap-2 text-sm text-red-700"><XCircle className="h-4 w-4 shrink-0 mt-0.5" />{e}</li>)}
            </ul>
          </div>
        </div>

        {/* Shipping */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
          <h2 className="text-2xl font-bold text-gray-900 mb-5"><Truck className="inline h-6 w-6 text-blue-600 mr-2" />Shipping Policy</h2>
          <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
            {[
              ['Standard Delivery', '3–5 business days across India. North-East India remote areas may take 7–10 business days.'],
              ['Shipping Charges', 'Calculated at checkout based on weight and destination. Free shipping on orders above ₹5,000.'],
              ['Order Processing', 'Orders placed before 2 PM IST on business days are processed the same day. Orders placed after 2 PM or on weekends are processed the next business day.'],
              ['Tracking', 'A tracking number is sent via email and SMS once your order is dispatched. You can track your order through our courier partner\'s website.'],
              ['Failed Delivery', 'Our courier partner will attempt delivery 3 times. After 3 failed attempts, the order is returned to our warehouse and a refund is issued (minus shipping charges).'],
              ['Damaged in Transit', 'If your product is visibly damaged on delivery, please refuse acceptance and contact us immediately at info@navgrow.org or +91 89270 70972.'],
            ].map(([title, text]) => (
              <div key={title} className="flex gap-3">
                <Clock className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <div><strong className="text-gray-800">{title}:</strong> {text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="bg-blue-950 rounded-2xl p-7 text-center">
          <h3 className="text-xl font-bold text-white mb-2">Need Help with a Return?</h3>
          <p className="text-blue-200 mb-5 text-sm">Our support team responds within 24 business hours.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href="mailto:info@navgrow.org?subject=Return Request" className="px-6 py-3 bg-white text-blue-700 font-bold rounded-xl text-sm hover:bg-blue-50 transition-colors">Email Us</a>
            <a href="tel:+918927070972" className="px-6 py-3 border border-blue-600 text-blue-200 font-bold rounded-xl text-sm hover:border-blue-400 transition-colors">Call +91 89270 70972</a>
            <a href="https://wa.me/918927070972" target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-[#25D366] text-white font-bold rounded-xl text-sm hover:opacity-90">WhatsApp</a>
          </div>
        </div>
      </div>
    </section>
  </>
);

export default RefundPolicyPage;
