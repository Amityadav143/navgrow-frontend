/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 · navgrow.org
 *
 * RfqDrawer — slide-out panel for the B2B "Request for Quote" basket.
 * Shows requested items, lets the buyer set quantities + specs, and submits
 * a formal RFQ. Two steps: (1) review items, (2) buyer details → submit.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, FileText, Trash2, Plus, Minus, Send, CheckCircle2,
  Building2, ArrowRight, ArrowLeft, Loader2, Package,
} from 'lucide-react';
import { useRfq } from '@/context/RfqContext';
import { rfqApi } from '@/lib/api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[6-9]\d{9}$/;

const RfqDrawer = () => {
  const { items, totalItems, drawerOpen, setDrawerOpen, updateQty, updateSpec, removeItem, clearRfq } = useRfq();
  const [step, setStep] = useState(1);            // 1 = items, 2 = details, 3 = success
  const [submitting, setSubmitting] = useState(false);
  const [rfqNumber, setRfqNumber] = useState('');
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    buyerName: '', buyerEmail: '', buyerPhone: '', company: '',
    gstin: '', deliveryCity: '', deliveryState: 'West Bengal', pincode: '', notes: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.buyerName.trim()) e.buyerName = 'Required';
    if (!EMAIL_RE.test(form.buyerEmail)) e.buyerEmail = 'Valid email required';
    if (!PHONE_RE.test(form.buyerPhone.replace(/\s/g, ''))) e.buyerPhone = 'Valid 10-digit mobile';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        buyerPhone: form.buyerPhone.replace(/\s/g, ''),
        items: items.map(i => ({
          productId: i.productId, productName: i.productName, sku: i.sku,
          quantity: i.quantity, specification: i.specification || '', gstRate: i.gstRate || 18,
        })),
      };
      const { data } = await rfqApi.submit(payload);
      setRfqNumber(data.rfqNumber || '');
      setStep(3);
      clearRfq();
    } catch (err) {
      setErrors({ submit: err?.response?.data?.message || 'Could not submit. Please try again or call +91 89270 70972.' });
    } finally {
      setSubmitting(false);
    }
  };

  const close = () => {
    setDrawerOpen(false);
    setTimeout(() => { setStep(1); setRfqNumber(''); setErrors({}); }, 300);
  };

  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[120]"
            onClick={close}
          />
          <motion.aside
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-[121] flex flex-col shadow-2xl"
            role="dialog" aria-label="Request for Quote">

            {/* Header */}
            <div className="brand-gradient px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-white font-extrabold text-base leading-tight">Request for Quote</h2>
                  <p className="text-blue-100 text-xs">{totalItems} item{totalItems !== 1 ? 's' : ''} · GST invoice</p>
                </div>
              </div>
              <button onClick={close} aria-label="Close" className="p-2 rounded-lg hover:bg-white/15 text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Step indicator */}
            {step < 3 && (
              <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 shrink-0">
                {[1, 2].map(s => (
                  <React.Fragment key={s}>
                    <div className={`flex items-center gap-1.5 text-xs font-bold ${step >= s ? 'text-blue-600' : 'text-gray-300'}`}>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>{s}</span>
                      {s === 1 ? 'Items' : 'Details'}
                    </div>
                    {s === 1 && <div className={`flex-1 h-0.5 rounded ${step >= 2 ? 'bg-blue-600' : 'bg-gray-100'}`} />}
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {/* STEP 1 — items */}
              {step === 1 && (
                <div className="p-5">
                  {items.length === 0 ? (
                    <div className="text-center py-16">
                      <Package className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-400 font-medium">No items yet</p>
                      <p className="text-gray-400 text-sm mt-1">Add products to request a bulk quote.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {items.map(it => (
                        <div key={it.productId} className="border border-gray-150 rounded-2xl p-3.5 bg-gray-50/50">
                          <div className="flex gap-3">
                            {it.image && (
                              <img loading="lazy" decoding="async" src={it.image} alt={it.productName}
                                className="w-14 h-14 rounded-xl object-cover bg-white border border-gray-100 shrink-0"
                                onError={e => { e.target.style.display = 'none'; }} />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-800 text-sm leading-snug line-clamp-2">{it.productName}</p>
                              {it.sku && <p className="text-[11px] text-gray-400 mt-0.5">SKU: {it.sku}</p>}
                              <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg">
                                  <button aria-label="Decrease" onClick={() => updateQty(it.productId, it.quantity - 1)}
                                    className="p-1.5 hover:bg-gray-50 rounded-l-lg"><Minus className="h-3.5 w-3.5 text-gray-500" /></button>
                                  <input type="number" value={it.quantity} min={1}
                                    onChange={e => updateQty(it.productId, parseInt(e.target.value) || 1)}
                                    className="w-12 text-center text-sm font-bold border-0 focus:outline-none bg-transparent" />
                                  <button aria-label="Increase" onClick={() => updateQty(it.productId, it.quantity + 1)}
                                    className="p-1.5 hover:bg-gray-50 rounded-r-lg"><Plus className="h-3.5 w-3.5 text-gray-500" /></button>
                                </div>
                                <button aria-label="Remove" onClick={() => removeItem(it.productId)}
                                  className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                              </div>
                            </div>
                          </div>
                          <input
                            type="text" value={it.specification || ''}
                            onChange={e => updateSpec(it.productId, e.target.value)}
                            placeholder="Add spec / grade / note (optional)"
                            className="w-full mt-2.5 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2 — buyer details */}
              {step === 2 && (
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 rounded-xl px-3 py-2.5 mb-1">
                    <Building2 className="h-4 w-4 shrink-0" />
                    Add GSTIN to receive a GST-compliant tax invoice for input credit.
                  </div>
                  {[
                    { k: 'buyerName',  label: 'Full Name *',     ph: 'Contact person' },
                    { k: 'buyerEmail', label: 'Email *',          ph: 'you@company.com', type: 'email' },
                    { k: 'buyerPhone', label: 'Mobile *',         ph: '10-digit mobile', type: 'tel' },
                    { k: 'company',    label: 'Company / PSU',     ph: 'Organisation name' },
                    { k: 'gstin',      label: 'GSTIN',             ph: '22AAAAA0000A1Z5' },
                  ].map(f => (
                    <div key={f.k}>
                      <label className="block text-xs font-bold text-gray-500 mb-1">{f.label}</label>
                      <input
                        type={f.type || 'text'} value={form[f.k]}
                        onChange={e => set(f.k, e.target.value)} placeholder={f.ph}
                        className={`w-full px-3.5 py-2.5 border-2 rounded-xl text-sm focus:outline-none transition-colors ${errors[f.k] ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-blue-500'}`} />
                      {errors[f.k] && <p className="text-red-500 text-xs mt-1">{errors[f.k]}</p>}
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Delivery City</label>
                      <input value={form.deliveryCity} onChange={e => set('deliveryCity', e.target.value)} placeholder="City"
                        className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Pincode</label>
                      <input value={form.pincode} onChange={e => set('pincode', e.target.value)} placeholder="734001" maxLength={6}
                        className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Requirements / Notes</label>
                    <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
                      placeholder="Delivery timeline, tender ref, certifications required, etc."
                      className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 resize-none" />
                  </div>
                  {errors.submit && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{errors.submit}</p>}
                </div>
              )}

              {/* STEP 3 — success */}
              {step === 3 && (
                <div className="p-8 text-center">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}
                    className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                  </motion.div>
                  <h3 className="text-xl font-extrabold text-gray-900 mb-2">RFQ Submitted!</h3>
                  {rfqNumber && (
                    <p className="text-sm text-gray-500 mb-1">Reference</p>
                  )}
                  {rfqNumber && (
                    <p className="text-lg font-mono font-bold text-blue-600 mb-4 bg-blue-50 rounded-xl py-2 px-4 inline-block">{rfqNumber}</p>
                  )}
                  <p className="text-gray-500 text-sm leading-relaxed mb-6">
                    Our procurement team will send your formal, GST-compliant quotation within
                    <strong className="text-gray-700"> 1 business day</strong>. A confirmation email is on its way.
                  </p>
                  <button onClick={close} className="px-6 py-3 brand-gradient text-white font-bold rounded-xl text-sm hover:opacity-90 transition-opacity">
                    Done
                  </button>
                </div>
              )}
            </div>

            {/* Footer actions */}
            {step < 3 && items.length > 0 && (
              <div className="border-t border-gray-100 p-4 shrink-0 flex gap-3">
                {step === 2 && (
                  <button onClick={() => setStep(1)}
                    className="px-4 py-3 border-2 border-gray-200 text-gray-600 font-bold rounded-xl text-sm hover:bg-gray-50 flex items-center gap-1.5">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                )}
                {step === 1 ? (
                  <button onClick={() => setStep(2)}
                    className="flex-1 py-3 brand-gradient text-white font-bold rounded-xl text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                    Continue <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button onClick={submit} disabled={submitting}
                    className="flex-1 py-3 brand-gradient text-white font-bold rounded-xl text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {submitting ? 'Submitting…' : 'Submit RFQ'}
                  </button>
                )}
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default RfqDrawer;
