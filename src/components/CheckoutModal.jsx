import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Phone, User, Mail, Building, CreditCard, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { ordersApi } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi'];

const Field = ({ id, label, type='text', required, placeholder, value, onChange, options, error }) => (
  <div>
    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
    {options ? (
      <select value={value} onChange={onChange} required={required}
        className={`w-full px-4 py-2.5 border-2 rounded-xl text-sm focus:outline-none transition-colors bg-white ${error ? 'border-red-400' : 'border-gray-200 focus:border-blue-500'}`}>
        <option value="">Select {label}</option>
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    ) : (
      <input type={type} value={value} onChange={onChange} required={required} placeholder={placeholder}
        className={`w-full px-4 py-2.5 border-2 rounded-xl text-sm focus:outline-none transition-colors ${error ? 'border-red-400' : 'border-gray-200 focus:border-blue-500'}`} />
    )}
    {error && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{error}</p>}
  </div>
);

const CheckoutModal = ({ open, onClose, orderData }) => {
  const { items, clearCart } = useCart();
  const { toast } = useToast();
  const [step, setStep]   = useState(1); // 1 = shipping, 2 = processing, 3 = success

  // Reset step when modal closes so next open starts fresh
  useEffect(() => {
    if (!open) { setTimeout(() => setStep(1), 300); }
  }, [open]);
  const [errors, setErrors] = useState({});
  const [form, setForm]   = useState({
    name: '', email: '', phone: '', company: '',
    address1: '', address2: '', city: '', state: 'West Bengal', pincode: '', notes: '',
  });

  const ch = (k) => (e) => { setForm(p => ({ ...p, [k]: e.target.value })); if (errors[k]) setErrors(p => ({ ...p, [k]: '' })); };

  const validateShipping = () => {
    const e = {};
    if (!form.name.trim())    e.name    = 'Required';
    if (!form.email.trim())   e.email   = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address.';
    if (!form.phone.trim())   e.phone   = 'Required';
    else if (!/^[+\d\s\-()]{7,15}$/.test(form.phone)) e.phone = 'Enter a valid phone number.';
    if (form.pincode && !/^\d{6}$/.test(form.pincode)) e.pincode = 'Pincode must be 6 digits.';
    if (!form.address1.trim())e.address1= 'Required';
    if (!form.city.trim())    e.city    = 'Required';
    if (!form.state)          e.state   = 'Required';
    if (!form.pincode.trim()) e.pincode = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const loadRazorpay = () => new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  const handlePay = async (e) => {
    e.preventDefault();
    if (!validateShipping()) return;
    setStep(2);

    try {
      // Create order on backend
      const orderPayload = {
        customerName:  form.name,
        customerEmail: form.email,
        customerPhone: form.phone,
        companyName:   form.company || null,
        addressLine1:  form.address1,
        addressLine2:  form.address2 || null,
        city:          form.city,
        state:         form.state,
        pincode:       form.pincode,
        notes:         form.notes || null,
        items: items.map(i => ({ productId: i.id, quantity: i.qty })),
      };

      const { data: order } = await ordersApi.create(orderPayload);

      // Load Razorpay
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error('Razorpay SDK failed to load');

      const options = {
        key:       import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount:    order.amount,
        currency:  'INR',
        name:      'Navgrow Engineering',
        description:'Engineering Products',
        order_id:  order.razorpayOrderId,
        prefill:   { name: form.name, email: form.email, contact: form.phone },
        theme:     { color: '#2563eb' },
        modal:     { ondismiss: () => setStep(1) },
        handler: async (response) => {
          try {
            await ordersApi.verifyPayment({
              razorpayOrderId:   response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            clearCart();
            setForm({ name:'',email:'',phone:'',company:'',address1:'',address2:'',city:'',state:'West Bengal',pincode:'',notes:'' });
            setStep(3);
          } catch {
            toast({ title: 'Payment verification failed', description: 'Please contact us with your payment ID.', variant: 'destructive' });
            setStep(1);
          }
        },
      };
      new window.Razorpay(options).open();
    } catch (err) {
      toast({ title: 'Checkout failed', description: err.response?.data?.message || err.message || 'Please try again.', variant: 'destructive' });
      setStep(1);
    }
  };

  // Compute totals directly from cart items (orderData prop is optional/deprecated)
  const cartTotal = items.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
  const grandTotal = (orderData?.grandTotal) || cartTotal;
  const discount   = orderData?.discount || 0;
  const itemCount  = items.reduce((s, i) => s + (i.qty || 1), 0);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[120] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm" onClick={step < 3 ? onClose : undefined} />
          <motion.div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}>

            {/* Header */}
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 rounded-t-3xl flex items-center justify-between z-10">
              {step === 1 && (
                <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2"><MapPin className="h-5 w-5 text-blue-600" />Delivery Details</h2>
              )}
              {step === 2 && <h2 className="font-bold text-gray-900 text-lg">Processing Payment…</h2>}
              {step === 3 && <h2 className="font-bold text-gray-900 text-lg text-green-700">Order Confirmed! 🎉</h2>}
              {step < 3 && (
                <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500">
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Step 1 — Shipping Form */}
            {step === 1 && (
              <form onSubmit={handlePay} noValidate className="p-6 space-y-4">
                <p className="text-sm text-gray-500 font-medium -mt-1 mb-2">
                  {itemCount} item{itemCount !== 1 ? 's' : ''} · Total: <strong className="text-gray-900">₹{Math.round(grandTotal).toLocaleString('en-IN')}</strong>
                  {discount > 0 && <span className="text-green-600 ml-2">(₹{Number(discount).toLocaleString('en-IN')} saved)</span>}
                </p>

                {/* Order Summary */}
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 -mt-1 mb-2">
                  <p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-2.5">Order Summary</p>
                  <div className="space-y-2">
                    {items.map(i => (
                      <div key={i.id} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          {i.image && <img src={i.image} alt={i.name} className="w-9 h-9 rounded-xl object-cover bg-white border border-blue-100 shrink-0" onError={e=>{e.target.style.display='none'}}/>}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-900 line-clamp-1">{i.name}</p>
                            <p className="text-[10px] text-gray-500">Qty: {i.qty || 1} × ₹{(i.price||0).toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-gray-900 shrink-0">₹{((i.price||0)*(i.qty||1)).toLocaleString('en-IN')}</p>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-blue-200 mt-3 pt-3 flex items-center justify-between">
                    <p className="text-sm font-bold text-blue-900">Total Payable</p>
                    <p className="text-xl font-extrabold text-blue-900">₹{Math.round(grandTotal).toLocaleString('en-IN')}</p>
                  </div>
                  {discount > 0 && <p className="text-xs text-green-600 font-semibold text-right mt-1">You save ₹{Number(discount).toLocaleString('en-IN')}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><Field id="name"    label="Full Name"     required value={form.name}    onChange={ch('name')}    placeholder="Your full name" error={errors.name} /></div>
                  <Field id="email"   label="Email"        type="email" required value={form.email}   onChange={ch('email')}   placeholder="you@example.com" error={errors.email} />
                  <Field id="phone"   label="Phone"        type="tel"   required value={form.phone}   onChange={ch('phone')}   placeholder="+91 xxxxx xxxxx" error={errors.phone} />
                  <div className="col-span-2"><Field id="company" label="Company (Optional)"          value={form.company} onChange={ch('company')} placeholder="Company name" /></div>
                  <div className="col-span-2"><Field id="address1" label="Address Line 1" required value={form.address1} onChange={ch('address1')} placeholder="Street, locality" error={errors.address1} /></div>
                  <div className="col-span-2"><Field id="address2" label="Address Line 2" value={form.address2} onChange={ch('address2')} placeholder="Landmark (optional)" /></div>
                  <Field id="city"    label="City"         required value={form.city}    onChange={ch('city')}    placeholder="Siliguri" error={errors.city} />
                  <Field id="pincode" label="Pincode"      required value={form.pincode} onChange={ch('pincode')} placeholder="734001" error={errors.pincode} />
                  <div className="col-span-2"><Field id="state" label="State" required value={form.state} onChange={ch('state')} options={STATES} error={errors.state} /></div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Notes</label>
                    <textarea value={form.notes} onChange={ch('notes')} rows={2} placeholder="Delivery instructions (optional)"
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 resize-none" />
                  </div>
                </div>

                <button type="submit"
                  className="w-full py-4 btn-gold rounded-xl shadow-lg flex items-center justify-center gap-2 text-base">
                  <CreditCard className="h-5 w-5" /> Pay ₹{Math.round(grandTotal).toLocaleString('en-IN')}
                </button>
                <p className="text-center text-xs text-gray-400">Secured by Razorpay · UPI, Cards, Net Banking</p>
              </form>
            )}

            {/* Step 2 — Processing */}
            {step === 2 && (
              <div className="p-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-5" />
                <p className="font-bold text-gray-900 text-lg mb-2">Creating your order…</p>
                <p className="text-gray-500 text-sm">Razorpay payment window will open shortly.</p>
              </div>
            )}

            {/* Step 3 — Success */}
            {step === 3 && (
              <div className="p-10 flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mb-5">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                <h3 className="text-2xl font-extrabold text-gray-900 mb-2">Payment Successful!</h3>
                <p className="text-gray-500 text-sm mb-6">A confirmation email has been sent to <strong>{form.email}</strong>. Your order will be dispatched within 1–2 business days.</p>
                <div className="flex flex-col gap-3 w-full">
                  <button onClick={() => { onClose(); setStep(1); }}
                    className="py-3 brand-gradient text-white font-bold rounded-xl hover:opacity-90">
                    Continue Shopping
                  </button>
                  <a href="/track-order" className="py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-blue-300 hover:text-blue-600 transition-colors text-center text-sm">
                    Track My Order
                  </a>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CheckoutModal;
