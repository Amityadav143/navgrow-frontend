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
/**
 * BulkOrderForm — B2B bulk pricing enquiry modal
 * Features: quantity tiers, volume discount calculator, GST invoice
 */
import React, { useState, useCallback } from 'react';
import useBodyScrollLock from '@/hooks/useBodyScrollLock';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, Calculator, Send, CheckCircle, Building, Phone, Mail, MapPin } from 'lucide-react';
import { ordersApi } from '@/lib/api';

const VOLUME_TIERS = [
  { min: 1,   max: 9,   label: '1–9 units',     disc: 0 },
  { min: 10,  max: 24,  label: '10–24 units',   disc: 5 },
  { min: 25,  max: 49,  label: '25–49 units',   disc: 8 },
  { min: 50,  max: 99,  label: '50–99 units',   disc: 12 },
  { min: 100, max: 499, label: '100–499 units',  disc: 18 },
  { min: 500, max: 999, label: '500+ units',     disc: 25 },
];

const getDiscount = (qty) => {
  const tier = VOLUME_TIERS.find(t => qty >= t.min && qty <= t.max) || VOLUME_TIERS[VOLUME_TIERS.length - 1];
  return tier.disc;
};

const BulkOrderForm = ({ product, open, onClose }) => {
  // Lock the page while this overlay is open (iOS-safe).
  useBodyScrollLock(open);
  const [qty,      setQty]      = useState(10);
  const [form,     setForm]     = useState({ name:'', phone:'', email:'', company:'', gstin:'', city:'', notes:'' });
  const [sending,  setSending]  = useState(false);
  const [sent,     setSent]     = useState(false);
  const [errors,   setErrors]   = useState({});

  const ch = useCallback((k, v) => setForm(p => ({ ...p, [k]: v })), []);

  const unitPrice     = product?.price || 0;
  const discountPct   = getDiscount(qty);
  const discountedUnit= unitPrice * (1 - discountPct / 100);
  const lineTotal     = discountedUnit * qty;
  const savings       = (unitPrice - discountedUnit) * qty;
  const gstAmount     = lineTotal * ((product?.gstRate || 18) / 100);
  const grandTotal    = lineTotal + gstAmount;

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name  = 'Required';
    if (!form.phone.trim()) e.phone = 'Required';
    if (!form.email.trim()) e.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) e.email = 'Invalid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSend = async () => {
    if (!validate()) return;
    setSending(true);
    try {
      // Try API first
      await ordersApi.create({
        customerName:  form.name,
        customerEmail: form.email,
        customerPhone: form.phone,
        companyName:   form.company,
        gstin:         form.gstin,
        city:          form.city,
        notes:         `BULK ORDER REQUEST\nProduct: ${product.name}\nQty: ${qty} units\nUnit Price: ₹${Math.round(discountedUnit).toLocaleString('en-IN')}\nTotal: ₹${Math.round(grandTotal).toLocaleString('en-IN')}\nDiscount: ${discountPct}%\n\nNotes: ${form.notes}`,
        items: [{ productId: product.id, quantity: qty }],
        orderType: 'BULK_ENQUIRY',
      });
      setSent(true);
    } catch {
      // Fallback: pre-fill mailto
      const subject = encodeURIComponent(`Bulk Order Enquiry — ${product.name} × ${qty} units`);
      const body = encodeURIComponent(
        `Dear Navgrow Engineering Team,\n\n` +
        `I would like to place a bulk order for the following product:\n\n` +
        `PRODUCT DETAILS\n` +
        `Product    : ${product.name}\n` +
        `SKU        : ${product.sku || 'N/A'}\n` +
        `Quantity   : ${qty} units\n` +
        `Unit Price : ₹${Math.round(discountedUnit).toLocaleString('en-IN')} (${discountPct}% bulk discount)\n` +
        `Subtotal   : ₹${Math.round(lineTotal).toLocaleString('en-IN')}\n` +
        `GST        : ₹${Math.round(gstAmount).toLocaleString('en-IN')} (${product?.gstRate || 18}%)\n` +
        `Grand Total: ₹${Math.round(grandTotal).toLocaleString('en-IN')}\n` +
        `Savings    : ₹${Math.round(savings).toLocaleString('en-IN')}\n\n` +
        `BUYER DETAILS\n` +
        `Name    : ${form.name}\n` +
        `Phone   : ${form.phone}\n` +
        `Email   : ${form.email}\n` +
        (form.company ? `Company : ${form.company}\n` : '') +
        (form.gstin   ? `GSTIN   : ${form.gstin}\n` : '') +
        (form.city    ? `City    : ${form.city}\n` : '') +
        `\nAdditional Notes: ${form.notes || 'None'}\n\n` +
        `Please confirm availability, delivery timeline, and payment terms.\n\nThank you,\n${form.name}`
      );
      window.open(`mailto:info@navgrow.org?subject=${subject}&body=${body}`, '_blank');
      setSent(true);
    } finally { setSending(false); }
  };

  if (!product) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4"
          initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
          <motion.div className="absolute inset-0 bg-gray-900/75 backdrop-blur-sm" onClick={onClose}/>
          <motion.div
            className="relative bg-white w-full sm:max-w-xl sm:rounded-3xl shadow-2xl max-h-[95dvh] overflow-y-auto rounded-t-3xl"
            initial={{ y:60, scale:.97 }} animate={{ y:0, scale:1 }} exit={{ y:60, scale:.97 }}
            transition={{ type:'spring', stiffness:300, damping:30 }}>

            {/* Header */}
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 rounded-t-3xl flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 brand-gradient rounded-2xl flex items-center justify-center">
                  <Package className="h-5 w-5 text-white"/>
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-base">Bulk Order Enquiry</h2>
                  <p className="text-xs text-gray-500">{product.name}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500">
                <X className="h-5 w-5"/>
              </button>
            </div>

            {sent ? (
              <div className="p-10 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-10 w-10 text-green-600"/>
                </div>
                <h3 className="text-xl font-extrabold text-gray-900 mb-2">Enquiry Sent!</h3>
                <p className="text-gray-500 text-sm mb-5">
                  Our team will contact you within 2 business hours with a formal bulk quotation.
                </p>
                <button onClick={onClose} className="px-6 py-3 btn-gold rounded-xl font-bold">
                  Continue Shopping
                </button>
              </div>
            ) : (
              <div className="p-6 space-y-5">
                {/* Quantity + Volume tier */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2.5">
                    Quantity <span className="text-xs text-gray-400 font-normal">(min. 1)</span>
                  </label>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center border-2 border-gray-200 rounded-2xl overflow-hidden">
                      <button onClick={() => setQty(q => Math.max(1, q-1))}
                        className="w-12 h-12 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-bold text-xl">−</button>
                      <input type="number" value={qty} min={1}
                        onChange={e => setQty(Math.max(1, parseInt(e.target.value)||1))}
                        className="w-20 h-12 text-center font-bold text-gray-900 text-lg border-0 focus:outline-none"/>
                      <button onClick={() => setQty(q => q+1)}
                        className="w-12 h-12 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-bold text-xl">+</button>
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-bold text-gray-900">units</span>
                    </div>
                  </div>

                  {/* Volume discount tiers */}
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {VOLUME_TIERS.map(tier => (
                      <button key={tier.min}
                        onClick={() => setQty(tier.min)}
                        className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${
                          qty >= tier.min && (tier.max >= 499 || qty <= tier.max)
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 text-gray-400 hover:border-blue-200'
                        }`}>
                        {tier.label}
                        {tier.disc > 0 && <span className="block text-[10px] text-green-600 font-black">{tier.disc}% off</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price summary */}
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-1">Price Estimate</p>
                      <p className="text-2xl font-extrabold text-gray-900">₹{Math.round(grandTotal).toLocaleString('en-IN')}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Incl. GST {product?.gstRate || 18}%</p>
                    </div>
                    <div className="text-right">
                      {discountPct > 0 && (
                        <span className="inline-block bg-green-600 text-white text-sm font-black px-3 py-1 rounded-full mb-1">
                          {discountPct}% bulk discount
                        </span>
                      )}
                      <p className="text-sm text-gray-600">₹{Math.round(discountedUnit).toLocaleString('en-IN')} / unit</p>
                      {discountPct > 0 && (
                        <p className="text-xs text-green-600 font-bold">
                          You save ₹{Math.round(savings).toLocaleString('en-IN')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact form */}
                <div className="space-y-3">
                  <p className="text-sm font-bold text-gray-700">Your Details</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { k:'name',    label:'Full Name *',    ph:'Your name',          full:true },
                      { k:'phone',   label:'Phone *',        ph:'+91 XXXXX XXXXX',    type:'tel' },
                      { k:'email',   label:'Email *',        ph:'you@company.com',    type:'email' },
                      { k:'company', label:'Company',        ph:'Organisation name' },
                      { k:'gstin',   label:'GSTIN',          ph:'22AAAAA0000A1Z5',   full:false },
                      { k:'city',    label:'Delivery City',  ph:'e.g. Siliguri' },
                    ].map(f => (
                      <div key={f.k} className={f.full ? 'col-span-2' : ''}>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">{f.label}</label>
                        <input
                          type={f.type || 'text'} value={form[f.k]}
                          onChange={e => ch(f.k, e.target.value)} placeholder={f.ph}
                          className={`w-full px-3 py-2.5 border-2 rounded-xl text-sm focus:outline-none transition-colors ${
                            errors[f.k] ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-blue-500'
                          }`}
                        />
                        {errors[f.k] && <p className="text-xs text-red-500 mt-0.5">{errors[f.k]}</p>}
                      </div>
                    ))}
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Additional Notes</label>
                      <textarea value={form.notes} onChange={e => ch('notes', e.target.value)} rows={2}
                        placeholder="Custom specs, branding, packaging, delivery timeline…"
                        className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 resize-none"/>
                    </div>
                  </div>
                </div>

                <button onClick={handleSend} disabled={sending}
                  className="w-full py-4 btn-gold rounded-2xl font-bold text-base flex items-center justify-center gap-2 disabled:opacity-60">
                  {sending
                    ? <span className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                    : <Send className="h-5 w-5"/>
                  }
                  {sending ? 'Sending…' : `Send Bulk Enquiry — ${qty} units`}
                </button>

                <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-green-500"/>GST invoice</span>
                  <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-green-500"/>Pan-India delivery</span>
                  <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-green-500"/>2hr response</span>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BulkOrderForm;
