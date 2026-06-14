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
import { X, ShoppingCart, Minus, Plus, Trash2, Package, ArrowRight, Tag,
         CheckCircle, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { couponsApi } from '@/lib/api';
import CheckoutModal from '@/components/CheckoutModal';

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
const CartSidebar = () => {
  const { items, totalItems, totalAmount, cartOpen, setCartOpen, removeItem, updateQty, clearCart } = useCart();
  const [checkoutOpen,  setCheckoutOpen]  = useState(false);
  const [couponCode,    setCouponCode]    = useState('');
  const [coupon,        setCoupon]        = useState(null);
  const [couponError,   setCouponError]   = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [confirmClear,  setConfirmClear]  = useState(false);

  const discount    = coupon?.discount || 0;
  const taxableAmt  = Math.max(0, totalAmount - discount);
  const gst         = taxableAmt * 0.18;
  const shipping    = totalAmount >= 5000 ? 0 : 150;
  const grandTotal  = taxableAmt + gst + shipping;

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true); setCouponError('');
    try {
      const { data } = await couponsApi.validate(couponCode.trim(), totalAmount);
      setCoupon(data);
    } catch (err) {
      setCouponError(err.response?.data?.message || 'Invalid coupon code');
      setCoupon(null);
    } finally { setCouponLoading(false); }
  };
  const removeCoupon = () => { setCoupon(null); setCouponCode(''); setCouponError(''); };
  const handleClearConfirmed = () => {
    clearCart(); setConfirmClear(false);
    setCoupon(null); setCouponCode(''); setCouponError('');
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
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Package className="h-20 w-20 text-gray-200 mb-4"/>
                    <p className="font-bold text-gray-400 text-lg mb-2">Your cart is empty</p>
                    <p className="text-gray-400 text-sm mb-6">Add products from our engineering shop</p>
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
                                style={{minWidth:44,minHeight:44}}
                                className="flex items-center justify-center hover:bg-gray-50 rounded-r-lg text-gray-600 transition-colors"
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
                      <span>GST (18%)</span><span>₹{gst.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Shipping {totalAmount>=5000 && <span className="text-green-600 text-xs font-bold ml-1">FREE</span>}</span>
                      <span>{shipping===0?'₹0':`₹${shipping}`}</span>
                    </div>
                    <div className="flex justify-between font-extrabold text-gray-900 text-base pt-2 border-t border-gray-100">
                      <span>Grand Total</span>
                      <span>₹{grandTotal.toFixed(0)}</span>
                    </div>
                  </div>

                  <button onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}
                    className="w-full py-3.5 btn-gold rounded-xl shadow-lg font-bold">
                    Proceed to Checkout
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <a href={buildBulkQuoteEmail(items, totalAmount, grandTotal, discount)}
                      className="py-2.5 border-2 border-blue-200 text-blue-700 font-bold rounded-xl text-sm hover:border-blue-400 hover:bg-blue-50 transition-colors text-center">
                      Request Quote
                    </a>
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

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        orderData={{ items, totalAmount, discount, couponCode: coupon?.code, grandTotal }}
      />
    </>
  );
};

export default CartSidebar;
