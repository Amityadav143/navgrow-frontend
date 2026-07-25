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
import useEscapeKey from '@/hooks/useEscapeKey';
import useBodyScrollLock from '@/hooks/useBodyScrollLock';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Minus, Plus, Trash2, Package, ArrowRight, Tag,
         CheckCircle, AlertTriangle, Mail, Send, FileText, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { couponsApi, rfqApi } from '@/lib/api';
import { applyDeliveryTier, deliveryTierFactor } from '@/lib/utils';
import { evaluateLocalCoupon, isOffline } from '@/lib/offers';
import { track } from '@/lib/analytics';
import { useToast } from '@/components/ui/use-toast';

/* ── Professional bulk-quote email ──────────────────────────────────────── */
const buildBulkQuoteEmail = (items, subtotal, grandTotal, discount) => {
  const now     = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });
  const refNo   = `NGQT-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Math.floor(1000+Math.random()*9000)}`;
  const itemLines = items.map((item, idx) =>
    `  ${idx+1}. ${item.name}\n` +
    `     Unit Price : \u20B9${(item.price||0).toLocaleString('en-IN')}\n` +
    `     Quantity   : ${item.qty||1} unit${(item.qty||1)>1?'s':''}\n` +
    `     Line Total : \u20B9${((item.price||0)*(item.qty||1)).toLocaleString('en-IN')}`
  ).join('\n\n');
  const subject = `Bulk Quote Request [Ref: ${refNo}] \u2014 ${items.length} Item${items.length>1?'s':''}`;
  const body = [
    `Dear Navgrow Engineering Team,`,``,
    `I would like to request a formal quotation for the following items.`,``,
    `QUOTE REFERENCE : ${refNo}`,`DATE            : ${dateStr}`,
    `\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`,
    `CART ITEMS`,itemLines,
    `\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`,
    `SUMMARY`,
    `  Subtotal  : \u20B9${subtotal.toLocaleString('en-IN')}`,
    discount>0 ? `  Discount  : -\u20B9${Number(discount).toLocaleString('en-IN')}` : null,
    `  Est. Total: \u20B9${Math.round(grandTotal).toLocaleString('en-IN')} (excl. GST & shipping)`,``,
    `REQUIREMENTS`,`  Please provide:`,
    `  \u2022 Formal quotation with GST breakup`,
    `  \u2022 Volume / bulk discount if applicable`,
    `  \u2022 Delivery timeline to [YOUR CITY, PIN CODE]`,
    `  \u2022 Accepted payment modes and terms`,``,
    `\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`,
    `BUYER DETAILS`,
    `  Name    : [Your Name]`,`  Company : [Company / Organisation]`,
    `  Phone   : [Your Mobile Number]`,
    `  Ship To : [Delivery Address, City, State \u2014 PIN]`,
    `  GSTIN   : [Your GST Number for B2B invoice]`,
    `\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`,``,
    `Thank you,`,`[Your Name]`,`[Company | Phone | Email]`,
  ].filter(l => l !== null).join('\n');
  return `mailto:info@navgrow.org?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

/* ── Clear-cart confirmation ─────────────────────────────────────────────── */
const ClearCartConfirm = ({ itemCount, onConfirm, onCancel }) => (
  <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.95 }}
    className="absolute inset-x-4 bottom-36 z-20 bg-white border-2 border-red-200 rounded-2xl shadow-2xl p-4">
    <div className="flex gap-3 mb-3">
      <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
        <AlertTriangle className="h-5 w-5 text-red-600"/>
      </div>
      <div>
        <p className="font-bold text-gray-900 text-sm">Clear entire cart?</p>
        <p className="text-xs text-gray-500 mt-0.5">This will remove all {itemCount} item{itemCount!==1?'s':''} and cannot be undone.</p>
      </div>
    </div>
    <div className="flex gap-2">
      <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-colors">
        Yes, Clear Cart
      </button>
      <button onClick={onCancel} className="flex-1 py-2.5 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:border-gray-300 transition-colors">
        Cancel
      </button>
    </div>
  </motion.div>
);

/* ── Main CartSidebar ────────────────────────────────────────────────────── */
/* ── Request-Quote choice modal: direct send (API) or email ──────────────── */
const QuoteChoiceModal = ({ open, onClose, items, subtotal, grandTotal, discount, emailHref, onToast }) => {
  const [mode, setMode] = useState('choose');   // choose | form | done
  const [submitting, setSubmitting] = useState(false);
  const [rfqNumber, setRfqNumber] = useState('');
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ buyerName:'', buyerEmail:'', buyerPhone:'', company:'', gstin:'' });
  const set = (k,v) => setForm(f => ({ ...f, [k]: v }));

  React.useEffect(() => { if (open) { setMode('choose'); setErr(''); setRfqNumber(''); } }, [open]);

  const submitDirect = async () => {
    if (!form.buyerName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.buyerEmail) || !/^[6-9]\d{9}$/.test(form.buyerPhone.replace(/\s/g,''))) {
      setErr('Please enter a valid name, email and 10-digit mobile.'); return;
    }
    setSubmitting(true); setErr('');
    try {
      const payload = {
        ...form, buyerPhone: form.buyerPhone.replace(/\s/g,''),
        items: items.map(i => ({
          productId: String(i.id), productName: i.name, sku: i.sku || '',
          quantity: i.qty || 1, gstRate: i.gstRate || 18,
        })),
        notes: discount ? `Cart subtotal ₹${subtotal}, after discount ₹${grandTotal}.` : '',
      };
      const { data } = await rfqApi.submit(payload);
      try { track('rfq_submit', { label: data?.rfqNumber, value: (payload?.items?.length)||undefined }); } catch {}
      setRfqNumber(data.rfqNumber || '');
      setMode('done');
      onToast?.({ title: '✓ Quote request sent', description: 'Our team will respond within 1 business day.' });
    } catch (e) {
      setErr(e?.response?.data?.message || 'Could not send. Try the email option or call +91 89270 70972.');
    } finally { setSubmitting(false); }
  };

  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm z-[130]" onClick={onClose} />
      <div className="fixed inset-0 z-[131] flex items-center justify-center p-4 pointer-events-none">
        <motion.div initial={{opacity:0,scale:0.94,y:16}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.94}}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden">
          <div className="brand-gradient px-5 py-4 flex items-center justify-between">
            <h3 className="text-white font-extrabold flex items-center gap-2"><FileText className="h-5 w-5"/> Request a Quote</h3>
            <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-white/15 text-white"><X className="h-5 w-5"/></button>
          </div>

          {mode === 'choose' && (
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-500 mb-1">Choose how you'd like to send your bulk quote request for {items.length} item{items.length>1?'s':''}:</p>
              <button onClick={() => setMode('form')}
                className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left">
                <div className="w-10 h-10 rounded-xl brand-gradient flex items-center justify-center shrink-0"><Send className="h-5 w-5 text-white"/></div>
                <div><p className="font-bold text-gray-900 text-sm">Send Directly (Recommended)</p>
                  <p className="text-xs text-gray-500">Submits to our procurement team — fastest response, tracked in our system.</p></div>
              </button>
              <a href={emailHref} onClick={() => setTimeout(onClose, 300)}
                className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-left">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0"><Mail className="h-5 w-5 text-gray-600"/></div>
                <div><p className="font-bold text-gray-900 text-sm">Send via Email</p>
                  <p className="text-xs text-gray-500">Opens your mail app with the quote pre-filled to info@navgrow.org.</p></div>
              </a>
            </div>
          )}

          {mode === 'form' && (
            <div className="p-5 space-y-3">
              {[
                {k:'buyerName', l:'Full Name *', ph:'Contact person'},
                {k:'buyerEmail', l:'Email *', ph:'you@company.com', t:'email'},
                {k:'buyerPhone', l:'Mobile *', ph:'10-digit mobile', t:'tel'},
                {k:'company', l:'Company / PSU', ph:'Organisation (optional)'},
                {k:'gstin', l:'GSTIN', ph:'For GST invoice (optional)'},
              ].map(f => (
                <div key={f.k}>
                  <label className="block text-xs font-bold text-gray-500 mb-1">{f.l}</label>
                  <input type={f.t||'text'} value={form[f.k]} onChange={e=>set(f.k,e.target.value)} placeholder={f.ph}
                    className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"/>
                </div>
              ))}
              {err && <p className="text-red-500 text-xs bg-red-50 rounded-lg px-3 py-2">{err}</p>}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setMode('choose')} className="px-4 py-3 border-2 border-gray-200 text-gray-600 font-bold rounded-xl text-sm">Back</button>
                <button onClick={submitDirect} disabled={submitting}
                  className="flex-1 py-3 brand-gradient text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
                  {submitting ? 'Sending…' : 'Submit Quote Request'}
                </button>
              </div>
            </div>
          )}

          {mode === 'done' && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4"><CheckCircle className="h-8 w-8 text-green-600"/></div>
              <h4 className="text-lg font-extrabold text-gray-900 mb-1">Request Sent!</h4>
              {rfqNumber && <p className="text-sm font-mono font-bold text-blue-600 bg-blue-50 rounded-lg py-1.5 px-3 inline-block mb-3">{rfqNumber}</p>}
              <p className="text-sm text-gray-500 mb-5">Our team will send a GST-compliant quotation within 1 business day.</p>
              <button onClick={onClose} className="px-6 py-2.5 brand-gradient text-white font-bold rounded-xl text-sm">Done</button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const CartSidebar = () => {
  const { items, totalItems, totalAmount, cartOpen, setCartOpen, removeItem, updateQty, clearCart } = useCart();
  const navigate = useNavigate();
  const [couponCode,    setCouponCode]    = useState('');
  const [coupon,        setCoupon]        = useState(null);
  const [couponError,   setCouponError]   = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [confirmClear,  setConfirmClear]  = useState(false);
  const [quoteOpen,     setQuoteOpen]     = useState(false);
  const { toast } = useToast();

  // Close the cart on Escape (only meaningful while it's open).
  useEscapeKey(cartOpen, () => setCartOpen(false));
  // Lock the page while this overlay is open (iOS-safe).
  useBodyScrollLock(cartOpen);

  const discount    = coupon?.discount || 0;
  // Catalogue prices INCLUDE GST. The tax is therefore extracted from the price
  // (inclusive x 100 / (100 + rate)) and disclosed, never added on top — adding
  // it would charge more than the price the customer was shown. Each product can
  // sit on its own slab (5/12/18/28%), so this is worked out per line.
  const payableGoods = Math.max(0, totalAmount - discount);
  const grossGst = items.reduce((sum, i) => {
    const rate = (typeof i.gstRate === 'number' && i.gstRate >= 0) ? i.gstRate : 18;
    const inclusive = (i.price || 0) * (i.qty || 1);
    return sum + (inclusive - inclusive * 100 / (100 + rate));
  }, 0);
  // Scale the disclosed GST down proportionally if a discount applies.
  const gst         = totalAmount > 0 ? grossGst * (payableGoods / totalAmount) : 0;
  const taxableAmt  = payableGoods - gst;
  // Preview delivery: free above the threshold, otherwise the default rate
  // discounted by the volume tier for the number of units — the same tiering the
  // zone quote applies at checkout, so this estimate lines up with the charge.
  // Delivery is chargeable outside Siliguri — no spend-based waiver. The exact
  // charge comes from the zone quote at checkout; this is the indicative figure.
  const shipping    = payableGoods === 0 ? 0 : applyDeliveryTier(150, totalItems);
  // Goods are already tax-inclusive, so only delivery is added.
  const grandTotal  = payableGoods + shipping;

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true); setCouponError('');
    try {
      const { data } = await couponsApi.validate(couponCode.trim(), totalAmount);
      setCoupon(data);
      // Carry the code to checkout, which re-validates against the final total.
      try { localStorage.setItem('navgrow_coupon', data.code || couponCode.trim()); } catch {}
    } catch (err) {
      // Server unreachable → evaluate with the mirrored rules so the shopper gets
      // a real answer (and a real reason). The server re-validates at checkout.
      if (isOffline(err)) {
        const local = evaluateLocalCoupon(couponCode, totalAmount);
        if (local.ok) {
          setCoupon(local.coupon);
          try { localStorage.setItem('navgrow_coupon', local.coupon.code); } catch {}
        } else {
          setCoupon(null);
          setCouponError(local.message);
          try { localStorage.removeItem('navgrow_coupon'); } catch {}
        }
      } else {
        setCouponError(err.response?.data?.message || 'Invalid coupon code');
        setCoupon(null);
        try { localStorage.removeItem('navgrow_coupon'); } catch {}
      }
    } finally { setCouponLoading(false); }
  };
  const removeCoupon = () => {
    setCoupon(null); setCouponCode(''); setCouponError('');
    try { localStorage.removeItem('navgrow_coupon'); } catch {}
  };
  const handleClearConfirmed = () => {
    clearCart(); setConfirmClear(false);
    setCoupon(null); setCouponCode(''); setCouponError('');
    try { localStorage.removeItem('navgrow_coupon'); } catch {}
  };

  return (
    <>
      <AnimatePresence>
        {cartOpen && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100]"
              onClick={() => { setCartOpen(false); setConfirmClear(false); }}/>

            <motion.div
              initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}}
              transition={{type:'spring', stiffness:320, damping:32}}
              className="fixed top-0 right-0 h-full bg-white shadow-2xl z-[110] flex flex-col"
              style={{ width: 'min(384px, calc(100vw - 16px))' }}>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <ShoppingCart className="h-5 w-5 text-blue-600"/>
                  <span className="font-bold text-gray-900">Shopping Cart</span>
                  {totalItems > 0 && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">{totalItems}</span>
                  )}
                </div>
                <button onClick={() => { setCartOpen(false); setConfirmClear(false); }}
                  className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors">
                  <X className="h-5 w-5"/>
                </button>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Package className="h-20 w-20 text-gray-200 mb-4"/>
                    <p className="font-bold text-gray-500 text-lg mb-2">Your cart is empty</p>
                    <p className="text-gray-500 text-sm mb-6">Add products from our engineering shop</p>
                    <Link to="/shop" onClick={() => setCartOpen(false)}
                      className="px-6 py-3 brand-gradient text-white rounded-xl font-semibold hover:opacity-90 flex items-center gap-2">
                      Browse Shop <ArrowRight className="h-4 w-4"/>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {items.map(item => (
                      <motion.div key={item.id} layout initial={{opacity:0,x:20}} animate={{opacity:1,x:0}}
                        className="flex gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="w-16 h-16 bg-white rounded-xl overflow-hidden border border-gray-100 shrink-0">
                          {item.image
                            ? <img src={item.image} alt={item.name} loading="lazy" className="w-full h-full object-cover"/>
                            : <Package className="h-8 w-8 text-gray-300 m-4"/>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{item.name}</p>
                          <p className="text-blue-600 font-bold text-sm mt-1">₹{(item.price||0).toLocaleString('en-IN')}</p>
                          <div className="flex items-center justify-between mt-2">
                            {/* 44px touch targets (WCAG AA) */}
                            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg">
                              <button onClick={() => updateQty(item.id, item.qty-1)}
                                style={{minWidth:44,minHeight:44}}
                                className="flex items-center justify-center hover:bg-gray-50 rounded-l-lg text-gray-600 transition-colors"
                                aria-label="Decrease quantity">
                                <Minus className="h-3.5 w-3.5"/>
                              </button>
                              <span className="px-2.5 text-sm font-bold text-gray-900 min-w-[28px] text-center">{item.qty}</span>
                              <button onClick={() => updateQty(item.id, item.qty+1)}
                                disabled={typeof item.stockQty === 'number' && item.stockQty > 0 && item.qty >= item.stockQty}
                                style={{minWidth:44,minHeight:44}}
                                className="flex items-center justify-center hover:bg-gray-50 rounded-r-lg text-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                aria-label="Increase quantity">
                                <Plus className="h-3.5 w-3.5"/>
                              </button>
                            </div>
                            <button onClick={() => removeItem(item.id)}
                              style={{minWidth:44,minHeight:44}}
                              className="flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              aria-label="Remove item">
                              <Trash2 className="h-4 w-4"/>
                            </button>
                          </div>
                          {typeof item.stockQty === 'number' && item.stockQty > 0 && item.qty >= item.stockQty && (
                            <p className="text-[11px] text-amber-600 font-semibold mt-1">Max available: {item.stockQty}</p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {items.length > 0 && (
                <div className="relative px-5 pt-4 pb-5 border-t border-gray-100 bg-white space-y-3">

                  {/* Confirm clear overlay */}
                  <AnimatePresence>
                    {confirmClear && (
                      <ClearCartConfirm
                        itemCount={totalItems}
                        onConfirm={handleClearConfirmed}
                        onCancel={() => setConfirmClear(false)}
                      />
                    )}
                  </AnimatePresence>

                  {/* Coupon */}
                  {!coupon ? (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"/>
                        <input value={couponCode}
                          onChange={e => setCouponCode(e.target.value.toUpperCase())}
                          onKeyDown={e => e.key==='Enter' && applyCoupon()}
                          placeholder="Coupon code (NAVGROW10)"
                          className={`w-full pl-9 pr-3 py-2.5 border-2 rounded-xl text-sm font-mono focus:outline-none transition-colors ${couponError?'border-red-400':'border-gray-200 focus:border-blue-500'}`}/>
                      </div>
                      <button onClick={applyCoupon} disabled={couponLoading}
                        className="px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 disabled:opacity-60 transition-colors">
                        {couponLoading?'…':'Apply'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-200 rounded-xl">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600"/>
                        <span className="text-sm font-bold text-green-700">{coupon.code}</span>
                        <span className="text-xs text-green-600">–₹{Number(coupon.discount).toLocaleString('en-IN')}</span>
                      </div>
                      <button onClick={removeCoupon} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4"/></button>
                    </div>
                  )}
                  {couponError && <p className="text-xs text-red-500">{couponError}</p>}

                  {/* Summary */}
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal ({totalItems} items)</span>
                      <span>₹{totalAmount.toLocaleString('en-IN')}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-green-600 font-semibold">
                        <span>Coupon discount</span>
                        <span>–₹{Number(discount).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-600">
                      <span>GST (included)</span><span>₹{gst.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Delivery {totalItems > 1 && <span className="text-emerald-600 text-xs font-bold ml-1">{Math.round((1-deliveryTierFactor(totalItems))*100)}% OFF</span>}</span>
                      <span>{shipping===0?'₹0':`₹${shipping}`}</span>
                    </div>
                    <div className="flex justify-between font-extrabold text-gray-900 text-base pt-2 border-t border-gray-100">
                      <span>Grand Total</span>
                      <span>₹{grandTotal.toFixed(0)}</span>
                    </div>
                  </div>

                  <button onClick={() => { setCartOpen(false); navigate('/checkout'); }}
                    className="w-full py-3.5 btn-gold rounded-xl shadow-lg font-bold">
                    Proceed to Checkout
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setQuoteOpen(true)}
                      className="py-2.5 border-2 border-blue-200 text-blue-700 font-bold rounded-xl text-sm hover:border-blue-400 hover:bg-blue-50 transition-colors text-center flex items-center justify-center gap-1.5">
                      <FileText className="h-4 w-4" /> Request Quote
                    </button>
                    <button onClick={() => setConfirmClear(true)}
                      className="py-2.5 border-2 border-gray-200 text-gray-500 font-semibold rounded-xl text-sm hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-colors">
                      Clear Cart
                    </button>
                  </div>
                  <p className="text-center text-xs text-gray-400">Free shipping on orders above ₹5,000</p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
<QuoteChoiceModal
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        items={items}
        subtotal={totalAmount}
        grandTotal={grandTotal}
        discount={discount}
        emailHref={buildBulkQuoteEmail(items, totalAmount, grandTotal, discount)}
        onToast={toast}
      />
    </>
  );
};

export default CartSidebar;
