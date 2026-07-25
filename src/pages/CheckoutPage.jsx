/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 | navgrow.org | info@navgrow.org
 *
 * PROPRIETARY & CONFIDENTIAL — Navgrow Engineering Platform v1.0
 * Unauthorised copying or distribution is strictly prohibited.
 */
/**
 * Checkout — a full page, not a modal.
 *
 * Structured as the step-wise journey buyers already know from large Indian
 * marketplaces: numbered stages on the left that collapse to a summary once
 * complete (with a "Change" affordance), and a price panel on the right that
 * stays visible while scrolling. A modal cannot offer this — it has no room for
 * a persistent summary, no addressable URL, and no browser-back behaviour.
 *
 * Stages: 1 Review cart → 2 Delivery details → 3 Pay → confirmation screen.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, MapPin, CreditCard, CheckCircle, Check, Plus, Minus, Trash2,
  ShieldCheck, Truck, RotateCcw, Lock, Package, ChevronRight, Loader2, AlertCircle,
  FileText, ArrowLeft, Zap, Banknote, Tag,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { ordersApi, deliveryApi, couponsApi } from '@/lib/api';
import { applyDeliveryTier } from '@/lib/utils';
import PincodeCheck from '@/components/PincodeCheck';
import RequireAuth from '@/components/RequireAuth';
import { useAuth } from '@/context/AuthContext';
import useSeo from '@/hooks/useSeo';

const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi'];

// Navgrow bills from West Bengal: a buyer in the same state pays CGST+SGST,
// anyone else pays IGST. This mirrors InvoiceService exactly so the figures the
// buyer sees before paying are the ones printed on their tax invoice.
const SELLER_STATE = 'West Bengal';

const FREE_SHIPPING_THRESHOLD = 5000;
const SHIPPING_FEE = 150;

const inr = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/* ── Small building blocks ─────────────────────────────────────────────── */

const StepHeader = ({ index, title, done, active, onChange, summary }) => (
  <div className={`flex items-start gap-3 ${active ? '' : 'cursor-default'}`}>
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
      done ? 'bg-green-600 text-white' : active ? 'gold-gradient text-[#1A1206]' : 'bg-gray-200 text-gray-500'
    }`}>
      {done ? <Check className="h-4 w-4" /> : index}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-3">
        <h2 className={`font-bold ${active || done ? 'text-gray-900' : 'text-gray-400'}`}>{title}</h2>
        {done && onChange && (
          <button onClick={onChange} className="text-sm font-semibold text-blue-600 hover:text-blue-700 shrink-0">
            Change
          </button>
        )}
      </div>
      {done && summary && <p className="text-sm text-gray-500 mt-0.5 truncate">{summary}</p>}
    </div>
  </div>
);

const Field = ({ id, label, type = 'text', required, placeholder, value, onChange, options, error, autoComplete, inputMode, className = '' }) => (
  <div className={className}>
    <label htmlFor={id} className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
      {label}{required && <span className="text-red-500"> *</span>}
    </label>
    {options ? (
      <select id={id} value={value} onChange={onChange}
        className={`w-full px-3 py-2.5 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${error ? 'border-red-400' : 'border-gray-200'}`}>
        <option value="">Select…</option>
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    ) : (
      <input id={id} type={type} value={value} onChange={onChange} placeholder={placeholder}
        autoComplete={autoComplete} inputMode={inputMode}
        className={`w-full px-3 py-2.5 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${error ? 'border-red-400' : 'border-gray-200'}`} />
    )}
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

/* ── Page ──────────────────────────────────────────────────────────────── */

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, updateQty, removeItem, clearCart } = useCart();
  const { user } = useAuth();

  const [step, setStep]       = useState(1);
  const [maxStep, setMaxStep] = useState(1);
  const [paying, setPaying]   = useState(false);
  const [error, setError]     = useState('');
  const [placed, setPlaced]   = useState(null);   // { orderNumber, grandTotal }
  const [errors, setErrors]   = useState({});
  const [delivery, setDelivery]         = useState(null);      // zone quote
  const [deliverySpeed, setDeliverySpeed] = useState('standard');
  const [payMethod, setPayMethod] = useState('ONLINE');
  const [couponCode,    setCouponCode]    = useState('');
  const [coupon,        setCoupon]        = useState(null);   // { code, discount, description }
  const [couponError,   setCouponError]   = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', gstin: '',
    address: '', city: '', state: '', pincode: '',
  });

  // Prefill from the signed-in account — re-typing details you have already
  // given us is friction, not security.
  useEffect(() => {
    if (!user) return;
    setForm(prev => ({
      ...prev,
      name:  prev.name  || user.name  || user.fullName || '',
      email: prev.email || user.email || '',
      phone: prev.phone || user.phone || '',
    }));
  }, [user]);

  useSeo({
    title: 'Checkout | Navgrow Engineering',
    description: 'Securely complete your order of industrial, railway and safety equipment from Navgrow Engineering.',
    noindex: true,
  });

  const ch = (k) => (e) => {
    setForm(p => ({ ...p, [k]: e.target.value }));
    setErrors(p => ({ ...p, [k]: undefined }));
  };

  /* Razorpay script — loaded once, on demand */
  useEffect(() => {
    if (document.getElementById('razorpay-sdk')) return;
    const s = document.createElement('script');
    s.id = 'razorpay-sdk';
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    document.body.appendChild(s);
  }, []);

  /* ── Money. GST is summed per line item on that product's own slab, which is
        what the server charges — a flat rate here would show a total the
        customer never actually pays. ─────────────────────────────────────── */
  const totals = useMemo(() => {
    // Tax is worked out per line on that product's own slab, then grouped by
    // rate, so the buyer can see exactly which items sit at 12% and which at 18%
    // instead of a single opaque "GST" figure.
    // Catalogue prices INCLUDE GST, so tax is backed out of the price rather than
    // added to it: taxable = inclusive x 100 / (100 + rate). Only delivery is
    // charged on top. This mirrors the server calculation exactly.
    const lines = items.map(i => {
      const qty = i.qty || 1;
      const rate = (typeof i.gstRate === 'number' && i.gstRate >= 0) ? i.gstRate : 18;
      const inclusive = (i.price || 0) * qty;
      const taxable = inclusive * 100 / (100 + rate);
      return { ...i, qty, rate, inclusive, taxable, tax: inclusive - taxable };
    });

    // What the customer pays for goods is the inclusive figure they were shown.
    const goods    = lines.reduce((s, l) => s + l.inclusive, 0);
    const subtotal = lines.reduce((s, l) => s + l.taxable, 0);
    const gst      = lines.reduce((s, l) => s + l.tax, 0);
    const mrpTotal = items.reduce((s, i) => s + ((i.mrp || i.price || 0) * (i.qty || 1)), 0);
    const count = items.reduce((s, i) => s + (i.qty || 1), 0);
    // Delivery is priced by the buyer's zone once their pincode resolves — the
    // zone quote already applies the volume-based tier for the order quantity, so
    // we use it as-is. Until a pincode is entered we show a tiered estimate of the
    // default national rule so the preview matches the eventual charge.
    let shipping;
    if (delivery && delivery.serviceable) {
      shipping = deliverySpeed === 'express' && delivery.expressAvailable
        ? Number(delivery.expressCharge || 0)
        : Number(delivery.standardCharge || 0);
    } else {
      shipping = goods >= FREE_SHIPPING_THRESHOLD || goods === 0
        ? 0
        : applyDeliveryTier(SHIPPING_FEE, count);
    }

    // Group taxable value and tax by slab for the breakdown.
    const bySlab = {};
    lines.forEach(l => {
      const k = String(l.rate);
      if (!bySlab[k]) bySlab[k] = { rate: l.rate, taxable: 0, tax: 0 };
      bySlab[k].taxable += l.taxable;
      bySlab[k].tax     += l.tax;
    });

    return {
      lines, subtotal, gst, shipping,
      slabs: Object.values(bySlab).sort((a, b) => a.rate - b.rate),
      savings: Math.max(0, mrpTotal - subtotal),
      codCharge: 0,   // filled in below once the zone and method are known
      goods,
      grandTotal: goods + shipping,
      count,
    };
  }, [items, delivery, deliverySpeed]);

  // Cash-handling fee, only when COD is both chosen and offered here.
  const codFee = (payMethod === 'COD' && delivery?.codAvailable)
    ? Number(delivery.codCharge || 0) : 0;
  // Coupon discount is a single deduction off the (tax-inclusive) goods total —
  // exactly what the server applies and what the invoice shows. Clamp so it can
  // never exceed the goods value.
  const discount = coupon ? Math.min(Number(coupon.discount || 0), totals.goods) : 0;
  const payable  = Math.max(0, totals.grandTotal - discount + codFee);

  // Validate a code against the CURRENT goods total (server is the source of
  // truth for eligibility, cap and per-customer limits). Persisted so a code
  // applied in the cart survives the jump to this page.
  const applyCoupon = useCallback(async (rawCode) => {
    const code = (typeof rawCode === 'string' ? rawCode : couponCode).trim();
    if (!code) return;
    setCouponLoading(true); setCouponError('');
    try {
      const { data } = await couponsApi.validate(code, totals.goods);
      setCoupon(data);
      setCouponCode(data.code || code);
      try { localStorage.setItem('navgrow_coupon', data.code || code); } catch {}
    } catch (err) {
      setCoupon(null);
      setCouponError(err.response?.data?.message || 'This coupon could not be applied.');
    } finally {
      setCouponLoading(false);
    }
  }, [couponCode, totals.goods]);

  const removeCoupon = () => {
    setCoupon(null); setCouponCode(''); setCouponError('');
    try { localStorage.removeItem('navgrow_coupon'); } catch {}
  };

  // Prefill a code carried over from the cart, and validate it once on mount.
  useEffect(() => {
    let stored = '';
    try { stored = localStorage.getItem('navgrow_coupon') || ''; } catch {}
    if (stored) { setCouponCode(stored); applyCoupon(stored); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the discount honest when the cart quantity/value changes: re-validate so
  // it drops automatically if the order falls below the coupon's minimum.
  useEffect(() => {
    if (coupon) applyCoupon(coupon.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totals.goods]);

  // Only known once a state is chosen; before that we show the combined figure.
  const intraState = form.state ? form.state === SELLER_STATE : null;

  // Resolve the zone as soon as a complete pincode is typed.
  useEffect(() => {
    const pin = form.pincode.trim();
    if (!/^[1-9][0-9]{5}$/.test(pin)) { setDelivery(null); return; }
    let cancelled = false;
    // Total quantity drives the volume-based delivery tier, so the quote must be
    // refreshed when it changes (not only when the pincode or order value does).
    deliveryApi.check(pin, totals.goods, totals.count)
      .then(({ data }) => {
        if (cancelled) return;
        setDelivery(data);
        if (!data.expressAvailable) setDeliverySpeed('standard');
        if (!data.codAvailable) setPayMethod('ONLINE');
      })
      .catch(() => { if (!cancelled) setDelivery(null); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.pincode, totals.goods, totals.count]);

  const validateDelivery = () => {
    const e = {};
    if (!form.name.trim())  e.name  = 'Required';
    if (!form.email.trim()) e.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter a valid email';
    if (!form.phone.trim()) e.phone = 'Required';
    else if (!/^[0-9+\-()\s]{7,20}$/.test(form.phone.trim())) e.phone = 'Enter a valid phone number';
    if (!form.address.trim()) e.address = 'Required';
    if (!form.city.trim())    e.city    = 'Required';
    if (!form.state)          e.state   = 'Required';
    if (!form.pincode.trim()) e.pincode = 'Required';
    else if (!/^[1-9][0-9]{5}$/.test(form.pincode.trim())) e.pincode = 'Enter a valid 6-digit PIN code';
    if (form.gstin.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(form.gstin.trim().toUpperCase()))
      e.gstin = 'Enter a valid 15-character GSTIN';
    // A buyer must not be able to pay for an address we cannot ship to.
    if (delivery && !delivery.serviceable)
      e.pincode = delivery.note || 'We do not deliver to this pincode yet.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goToStep = useCallback((n) => {
    setStep(n);
    setMaxStep(m => Math.max(m, n));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handlePay = async () => {
    setError('');
    if (!items.length) { setError('Your cart is empty.'); return; }
    if (payMethod !== 'COD' && !window.Razorpay) {
      setError('Payment library is still loading — please try again in a moment.'); return;
    }
    setPaying(true);
    try {
      const { data: order } = await ordersApi.create({
        customerName: form.name.trim(),
        customerEmail: form.email.trim(),
        customerPhone: form.phone.trim(),
        gstin: form.gstin.trim() ? form.gstin.trim().toUpperCase() : undefined,
        addressLine1: form.address.trim(),
        city: form.city.trim(),
        state: form.state,
        pincode: form.pincode.trim(),
        deliverySpeed,
        paymentMethod: payMethod,
        couponCode: coupon?.code || undefined,
        items: items.map(i => ({ productId: i.id, quantity: i.qty || 1 })),
      });

      // COD is settled on delivery: the server has already confirmed the order,
      // so there is no payment step to open.
      if (payMethod === 'COD') {
        setPlaced({
          orderNumber: order.orderNumber,
          grandTotal: order.grandTotal ?? payable,
          eta: deliverySpeed === 'express' ? delivery?.expressBy : delivery?.estimatedBy,
          zone: delivery?.zone,
          cod: true,
        });
        try { localStorage.removeItem('navgrow_coupon'); } catch {}
        clearCart();
        setPaying(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const rzp = new window.Razorpay({
        key:       order.razorpayKeyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount:    order.amount,
        currency:  order.currency || 'INR',
        name:      'Navgrow Engineering',
        description: `Order ${order.orderNumber}`,
        order_id:  order.razorpayOrderId,
        prefill:   { name: form.name, email: form.email, contact: form.phone },
        theme:     { color: '#1e3a8a' },
        handler: async (response) => {
          try {
            await ordersApi.verifyPayment({
              razorpayOrderId:   response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setPlaced({
              orderNumber: order.orderNumber,
              grandTotal: order.grandTotal ?? payable,
              eta: deliverySpeed === 'express' ? delivery?.expressBy : delivery?.estimatedBy,
              zone: delivery?.zone,
            });
            try { localStorage.removeItem('navgrow_coupon'); } catch {}
            clearCart();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } catch {
            setError('Payment went through but confirmation failed. Please contact us with your payment ID — we will resolve it immediately.');
          } finally {
            setPaying(false);
          }
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      rzp.open();
    } catch (err) {
      setPaying(false);
      setError(err.response?.data?.message || 'We could not start the payment. Please try again.');
    }
  };

  /* ── Confirmation ───────────────────────────────────────────────────── */
  if (placed) {
    return (
      <section className="py-16 bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="h-9 w-9 text-green-600" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Order confirmed</h1>
            {placed.cod && (
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full mb-3">
                <Banknote className="h-3.5 w-3.5" /> Pay {inr(placed.grandTotal)} in cash when it arrives
              </p>
            )}
            <p className="text-gray-500 mb-6">
              Thank you, {form.name.split(' ')[0]}. We have emailed the details to{' '}
              <span className="font-semibold text-gray-700">{form.email}</span>.
            </p>
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Order number</span>
                <span className="font-mono font-bold text-gray-900">{placed.orderNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{placed.cod ? 'Amount due on delivery' : 'Amount paid'}</span>
                <span className="font-bold text-gray-900">{inr(placed.grandTotal)}</span>
              </div>
              {placed.eta && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Expected delivery</span>
                  <span className="font-bold text-gray-900">{placed.eta}</span>
                </div>
              )}
              {placed.zone && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Delivery zone</span>
                  <span className="font-medium text-gray-700">{placed.zone}</span>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to={`/track-order?order=${encodeURIComponent(placed.orderNumber)}`}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 btn-gold rounded-xl text-sm">
                <Package className="h-4 w-4" /> Track this order
              </Link>
              <Link to="/shop"
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-200">
                Continue shopping
              </Link>
            </div>
            <p className="text-xs text-gray-500 mt-5 inline-flex items-center gap-1.5 justify-center">
              <FileText className="h-3.5 w-3.5" /> Your GST invoice is available from the order tracking page.
            </p>
          </motion.div>
        </div>
      </section>
    );
  }

  /* ── Empty cart ─────────────────────────────────────────────────────── */
  if (!items.length) {
    return (
      <section className="py-16 bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 max-w-lg text-center">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10">
            <ShoppingCart className="h-14 w-14 text-gray-200 mx-auto mb-4" />
            <h1 className="text-xl font-extrabold text-gray-900 mb-2">Your cart is empty</h1>
            <p className="text-gray-500 text-sm mb-6">Add a few items and they will show up here.</p>
            <Link to="/shop" className="inline-flex items-center gap-2 px-6 py-3 btn-gold rounded-xl text-sm">
              Browse the shop <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const addressSummary = `${form.name}, ${form.address}, ${form.city}, ${form.state} ${form.pincode}`;

  /* ── Main journey ───────────────────────────────────────────────────── */
  return (
    <section className="py-8 sm:py-12 bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4">

        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} aria-label="Go back"
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-2xl font-extrabold text-gray-900">Checkout</h1>
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
            <Lock className="h-3.5 w-3.5" /> Secure checkout
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* ── Steps ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Step 1 — Cart */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <StepHeader index={1} title="Review your items" active={step === 1} done={step > 1}
                summary={`${totals.count} item${totals.count === 1 ? '' : 's'} · ${inr(totals.subtotal)}`}
                onChange={() => goToStep(1)} />
              <AnimatePresence initial={false}>
                {step === 1 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden">
                    <div className="mt-4 space-y-3">
                      {totals.lines.map(i => {
                        const rate = i.rate;
                        return (
                          <div key={i.id} className="flex gap-3 p-3 rounded-xl border border-gray-100">
                            <img src={i.image} alt={i.name} width={64} height={64} loading="lazy"
                              onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder.jpg'; }}
                              className="w-16 h-16 rounded-lg object-cover bg-gray-50 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{i.name}</p>
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                {i.hsn ? `HSN ${i.hsn} · ` : ''}incl. {rate}% GST ({inr(i.tax)})
                              </p>
                              <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
                                <div className="flex items-center gap-1 border border-gray-200 rounded-lg">
                                  <button onClick={() => updateQty(i.id, Math.max(1, (i.qty || 1) - 1))}
                                    aria-label={`Decrease quantity of ${i.name}`}
                                    className="p-1.5 hover:bg-gray-50 rounded-l-lg"><Minus className="h-3.5 w-3.5" /></button>
                                  <span className="px-2 text-sm font-bold min-w-[28px] text-center">{i.qty || 1}</span>
                                  <button onClick={() => updateQty(i.id, (i.qty || 1) + 1)}
                                    aria-label={`Increase quantity of ${i.name}`}
                                    className="p-1.5 hover:bg-gray-50 rounded-r-lg"><Plus className="h-3.5 w-3.5" /></button>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-extrabold text-gray-900 text-sm">{inr((i.price || 0) * (i.qty || 1))}</span>
                                  <button onClick={() => removeItem(i.id)} aria-label={`Remove ${i.name}`}
                                    className="text-gray-300 hover:text-red-500 transition-colors">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 rounded-xl bg-gray-50 border border-gray-100 p-3 space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Items (inclusive of GST)</span>
                        <span className="font-medium text-gray-800">{inr(totals.goods)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">of which GST</span>
                        <span className="font-medium text-gray-800">{inr(totals.gst)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Delivery</span>
                        <span className="font-medium text-gray-800">
                          {totals.shipping === 0 ? 'Free' : inr(totals.shipping)}
                        </span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-emerald-700">
                          <span>Coupon discount{coupon?.code ? ` (${coupon.code})` : ''}</span>
                          <span className="font-semibold">−{inr(discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-1.5 mt-0.5 border-t border-gray-200">
                        <span className="font-semibold text-gray-900">Total</span>
                        <span className="font-bold text-gray-900">{inr(Math.max(0, totals.grandTotal - discount))}</span>
                      </div>
                    </div>

                    {/* Coupon */}
                    <div className="mt-3">
                      {coupon ? (
                        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <Tag className="h-4 w-4 text-emerald-600 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-emerald-800 truncate">
                                {coupon.code} applied
                              </p>
                              <p className="text-xs text-emerald-700">You save {inr(discount)}</p>
                            </div>
                          </div>
                          <button onClick={removeCoupon}
                            className="text-xs font-semibold text-gray-500 hover:text-gray-800 shrink-0 ml-2">
                            Remove
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <input
                                value={couponCode}
                                onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); if (couponError) setCouponError(''); }}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); } }}
                                placeholder="Coupon code"
                                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                              />
                            </div>
                            <button onClick={() => applyCoupon()} disabled={couponLoading || !couponCode.trim()}
                              className="px-4 py-2.5 rounded-xl text-sm font-bold border-2 border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                              {couponLoading ? '…' : 'Apply'}
                            </button>
                          </div>
                          {couponError && <p className="mt-1.5 text-xs text-red-600">{couponError}</p>}
                        </>
                      )}
                    </div>

                    <button onClick={() => goToStep(2)}
                      className="w-full mt-4 py-3 btn-gold rounded-xl text-sm">
                      Continue to delivery →
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Step 2 — Delivery */}
            <div className={`bg-white rounded-2xl border shadow-sm p-5 ${step === 2 ? 'border-blue-200' : 'border-gray-100'}`}>
              <StepHeader index={2} title="Delivery details" active={step === 2} done={step > 2}
                summary={addressSummary} onChange={() => goToStep(2)} />
              <AnimatePresence initial={false}>
                {step === 2 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <Field id="name" label="Full name" required value={form.name} onChange={ch('name')} autoComplete="name" error={errors.name} />
                      <Field id="phone" label="Phone" required type="tel" inputMode="tel" value={form.phone} onChange={ch('phone')} autoComplete="tel" error={errors.phone} placeholder="+91 98765 43210" />
                      <Field id="email" label="Email" required type="email" value={form.email} onChange={ch('email')} autoComplete="email" error={errors.email} className="sm:col-span-2" />
                      <Field id="address" label="Address" required value={form.address} onChange={ch('address')} autoComplete="street-address" error={errors.address} className="sm:col-span-2" placeholder="Building, street, area" />
                      <Field id="city" label="City" required value={form.city} onChange={ch('city')} autoComplete="address-level2" error={errors.city} />
                      <Field id="state" label="State" required options={STATES} value={form.state} onChange={ch('state')} error={errors.state} />
                      <Field id="pincode" label="PIN code" required inputMode="numeric" value={form.pincode} onChange={ch('pincode')} autoComplete="postal-code" error={errors.pincode} placeholder="734001" />
                      <Field id="gstin" label="GSTIN (optional)" value={form.gstin} onChange={ch('gstin')} error={errors.gstin} placeholder="For a business GST invoice" />
                    </div>
                    {delivery && (
                      <div className="mt-5">
                        {!delivery.serviceable ? (
                          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            <div>
                              <p className="font-semibold">We cannot deliver to {form.pincode} yet</p>
                              <p className="text-red-500 mt-0.5">{delivery.note}</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                              Delivery option — {delivery.zone}
                            </p>
                            <div className="space-y-2">
                              <button onClick={() => setDeliverySpeed('standard')}
                                className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border-2 text-left transition-colors ${
                                  deliverySpeed === 'standard' ? 'border-amber-400 bg-amber-50/60' : 'border-gray-200 hover:border-gray-300'}`}>
                                <span className="flex items-center gap-2.5 min-w-0">
                                  <Truck className="h-4 w-4 text-gray-500 shrink-0" />
                                  <span className="min-w-0">
                                    <span className="block text-sm font-semibold text-gray-900">Standard delivery</span>
                                    <span className="block text-xs text-gray-500">Arrives {delivery.estimatedBy}</span>
                                  </span>
                                </span>
                                <span className="text-sm font-bold shrink-0">
                                  {Number(delivery.standardCharge) === 0
                                    ? <span className="text-green-600">FREE</span>
                                    : inr(delivery.standardCharge)}
                                </span>
                              </button>

                              {delivery.expressAvailable && (
                                <button onClick={() => setDeliverySpeed('express')}
                                  className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border-2 text-left transition-colors ${
                                    deliverySpeed === 'express' ? 'border-amber-400 bg-amber-50/60' : 'border-gray-200 hover:border-gray-300'}`}>
                                  <span className="flex items-center gap-2.5 min-w-0">
                                    <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                                    <span className="min-w-0">
                                      <span className="block text-sm font-semibold text-gray-900">Express delivery</span>
                                      <span className="block text-xs text-gray-500">Arrives {delivery.expressBy}</span>
                                    </span>
                                  </span>
                                  <span className="text-sm font-bold shrink-0">{inr(delivery.expressCharge)}</span>
                                </button>
                              )}
                            </div>
                            {delivery.addForFreeDelivery > 0 && (
                              <p className="text-xs text-amber-700 mt-2">
                                Add {inr(delivery.addForFreeDelivery)} more to this order for free delivery here.
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    <div className="flex gap-3 mt-5">
                      <button onClick={() => goToStep(1)} className="px-5 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-200">Back</button>
                      <button onClick={() => { if (validateDelivery()) goToStep(3); }}
                        className="flex-1 py-3 btn-gold rounded-xl text-sm">
                        Continue to payment →
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Step 3 — Payment */}
            <div className={`bg-white rounded-2xl border shadow-sm p-5 ${step === 3 ? 'border-blue-200' : 'border-gray-100'}`}>
              <StepHeader index={3} title="Payment" active={step === 3} done={false} />
              <AnimatePresence initial={false}>
                {step === 3 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden">
                    {error && (
                      <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mt-4">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{error}</span>
                      </div>
                    )}
                    <div className="mt-4 space-y-2">
                      <button onClick={() => setPayMethod('ONLINE')}
                        className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-colors ${
                          payMethod === 'ONLINE' ? 'border-amber-400 bg-amber-50/60' : 'border-gray-200 hover:border-gray-300'}`}>
                        <CreditCard className="h-5 w-5 text-blue-600 shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-gray-900 text-sm">Pay online</span>
                          <span className="block text-xs text-gray-500">Cards, UPI, net banking &amp; wallets — secured by Razorpay.</span>
                        </span>
                      </button>

                      {delivery?.codAvailable && (
                        <button onClick={() => setPayMethod('COD')}
                          className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-colors ${
                            payMethod === 'COD' ? 'border-amber-400 bg-amber-50/60' : 'border-gray-200 hover:border-gray-300'}`}>
                          <Banknote className="h-5 w-5 text-green-600 shrink-0" />
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold text-gray-900 text-sm">Cash on delivery</span>
                            <span className="block text-xs text-gray-500">
                              Pay the courier when it arrives
                              {Number(delivery.codCharge) > 0 && <> · handling fee {inr(delivery.codCharge)}</>}
                            </span>
                          </span>
                        </button>
                      )}

                      {delivery && !delivery.codAvailable && (
                        <p className="text-xs text-gray-400 px-1">
                          Cash on delivery is not available for {form.pincode}.
                        </p>
                      )}
                    </div>
                    <button onClick={handlePay} disabled={paying}
                      className="w-full mt-4 inline-flex items-center justify-center gap-2 py-3.5 btn-gold rounded-xl text-sm disabled:opacity-60">
                      {paying
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> {payMethod === 'COD' ? 'Placing order…' : 'Opening payment…'}</>
                        : payMethod === 'COD'
                          ? <><Banknote className="h-4 w-4" /> Place order · {inr(payable)} on delivery</>
                          : <><Lock className="h-4 w-4" /> Pay {inr(payable)}</>}
                    </button>
                    <button onClick={() => goToStep(2)} className="w-full mt-2 py-2 text-sm text-gray-500 hover:text-gray-700">
                      Back to delivery details
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Price panel (sticky) ── */}
          <aside className="lg:sticky lg:top-24 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Price details</h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Price ({totals.count} item{totals.count === 1 ? '' : 's'})
                    <span className="block text-[11px] text-gray-400">inclusive of GST</span>
                  </span>
                  <span className="font-semibold text-gray-900">{inr(totals.goods)}</span>
                </div>
                {totals.savings > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Discount</span>
                    <span className="font-semibold text-green-600">− {inr(totals.savings)}</span>
                  </div>
                )}
                {/* Tax disclosure. These figures are already contained in the price
                    above — they are shown so the buyer can see the split that will
                    appear on their invoice, not because anything is being added. */}
                {totals.slabs.map(sl => (
                  <div key={sl.rate} className="flex justify-between text-[13px]">
                    <span className="text-gray-500">
                      {intraState === true
                        ? `CGST ${(sl.rate / 2).toFixed(1).replace(/\.0$/, '')}% + SGST ${(sl.rate / 2).toFixed(1).replace(/\.0$/, '')}%`
                        : intraState === false
                          ? `IGST ${sl.rate}%`
                          : `GST ${sl.rate}%`}
                      <span className="text-gray-400"> on {inr(sl.taxable)}</span>
                    </span>
                    <span className="font-medium text-gray-800">{inr(sl.tax)}</span>
                  </div>
                ))}
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax included above</span>
                  <span className="font-medium text-gray-500">{inr(totals.gst)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Delivery
                    {delivery?.serviceable && (
                      <span className="block text-[11px] text-gray-400">
                        {deliverySpeed === 'express' ? delivery.expressBy : delivery.estimatedBy}
                        {delivery.zone ? ` · ${delivery.zone}` : ''}
                      </span>
                    )}
                  </span>
                  <span className="font-semibold">
                    {totals.shipping === 0 ? <span className="text-green-600">FREE</span> : inr(totals.shipping)}
                  </span>
                </div>
                {codFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cash handling</span>
                    <span className="font-semibold text-gray-900">{inr(codFee)}</span>
                  </div>
                )}
                <div className="border-t border-dashed border-gray-200 pt-3 flex justify-between items-center">
                  <span className="font-bold text-gray-900">Total payable</span>
                  <span className="text-xl font-extrabold text-gray-900">{inr(payable)}</span>
                </div>
              </div>

              {totals.shipping > 0 && (
                <div className="mt-4">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full gold-gradient rounded-full transition-all"
                      style={{ width: `${Math.min(100, (totals.subtotal / FREE_SHIPPING_THRESHOLD) * 100)}%` }} />
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1.5">
                    Add {inr(FREE_SHIPPING_THRESHOLD - totals.subtotal)} more for free delivery
                  </p>
                </div>
              )}
              {totals.savings > 0 && (
                <p className="mt-4 text-sm font-bold text-green-600">
                  You save {inr(totals.savings)} on this order
                </p>
              )}
              <p className="mt-3 text-[11px] leading-relaxed text-gray-500">
                {intraState === null
                  ? 'Choose your state to see whether CGST + SGST or IGST applies.'
                  : intraState
                    ? 'Billed from West Bengal to West Bengal, so CGST and SGST apply.'
                    : `Billed from West Bengal to ${form.state}, so IGST applies.`}
                {' '}Prices include GST; only delivery is charged on top. These are the figures that appear on your invoice.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              {[
                [ShieldCheck, 'Quality certified', 'ISI-marked and test-certified stock'],
                [Truck,       'Pan-India delivery', 'Dispatched from Siliguri, tracked'],
                [RotateCcw,   '7-day returns',      'On unused items in original packing'],
                [FileText,    'GST invoice',        'HSN-wise tax invoice with every order'],
              ].map(([Icon, title, sub]) => (
                <div key={title} className="flex items-start gap-3">
                  <Icon className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{title}</p>
                    <p className="text-xs text-gray-500">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};

// Placing an order requires an account: the order endpoint is authenticated, and
// a buyer who reaches payment only to be rejected has wasted the whole journey.
const GuardedCheckoutPage = () => (
  <RequireAuth
    title="Sign in to complete your order"
    message="Orders are tied to your account so you can track them, download GST invoices and reorder. It only takes a moment.">
    <CheckoutPage />
  </RequireAuth>
);

export default GuardedCheckoutPage;
