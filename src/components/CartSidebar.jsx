import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Minus, Plus, Trash2, Package, ArrowRight, Tag, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { couponsApi } from '@/lib/api';
import CheckoutModal from '@/components/CheckoutModal';

const CartSidebar = () => {
  const { items, totalItems, totalAmount, cartOpen, setCartOpen, removeItem, updateQty, clearCart } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [couponCode, setCouponCode]     = useState('');
  const [coupon, setCoupon]             = useState(null);
  const [couponError, setCouponError]   = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const discount   = coupon?.discount || 0;
  const gst        = (totalAmount - discount) * 0.18;
  const shipping   = totalAmount > 5000 ? 0 : 150;
  const grandTotal = totalAmount - discount + gst + shipping;

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const { data } = await couponsApi.validate(couponCode.trim(), totalAmount);
      setCoupon(data);
    } catch (err) {
      setCouponError(err.response?.data?.message || 'Invalid coupon code');
      setCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => { setCoupon(null); setCouponCode(''); setCouponError(''); };

  return (
    <>
      <AnimatePresence>
        {cartOpen && (
          <>
            {/* Overlay */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100]" onClick={() => setCartOpen(false)} />

            {/* Drawer */}
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-[110] flex flex-col">

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                  <span className="font-bold text-gray-900">Shopping Cart</span>
                  {totalItems > 0 && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">{totalItems}</span>
                  )}
                </div>
                <button onClick={() => setCartOpen(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Package className="h-20 w-20 text-gray-200 mb-4" />
                    <p className="font-bold text-gray-400 text-lg mb-2">Your cart is empty</p>
                    <p className="text-gray-400 text-sm mb-6">Add products from our shop</p>
                    <Link to="/shop" onClick={() => setCartOpen(false)}
                      className="px-6 py-3 brand-gradient text-white rounded-xl font-semibold hover:opacity-90 flex items-center gap-2">
                      Browse Shop <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {items.map((item) => (
                      <motion.div key={item.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                        className="flex gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="w-16 h-16 bg-white rounded-xl overflow-hidden border border-gray-100 shrink-0">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="h-8 w-8 text-gray-300 m-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{item.name}</p>
                          <p className="text-blue-600 font-bold text-sm mt-1">₹{item.price.toLocaleString('en-IN')}</p>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg">
                              <button onClick={() => updateQty(item.id, item.qty - 1)} className="p-1.5 hover:bg-gray-50 rounded-l-lg text-gray-600 transition-colors">
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="px-2.5 text-sm font-bold text-gray-900 min-w-[24px] text-center">{item.qty}</span>
                              <button onClick={() => updateQty(item.id, item.qty + 1)} className="p-1.5 hover:bg-gray-50 rounded-r-lg text-gray-600 transition-colors">
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <button onClick={() => removeItem(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {items.length > 0 && (
                <div className="px-5 pt-4 pb-5 border-t border-gray-100 bg-white space-y-3">
                  {/* Coupon */}
                  {!coupon ? (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())}
                          onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                          placeholder="Coupon code (NAVGROW10)"
                          className={`w-full pl-9 pr-3 py-2.5 border-2 rounded-xl text-sm font-mono focus:outline-none transition-colors ${couponError ? 'border-red-400' : 'border-gray-200 focus:border-blue-500'}`} />
                      </div>
                      <button onClick={applyCoupon} disabled={couponLoading}
                        className="px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 disabled:opacity-60 transition-colors">
                        {couponLoading ? '…' : 'Apply'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-200 rounded-xl">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-bold text-green-700">{coupon.code}</span>
                        <span className="text-xs text-green-600">–₹{Number(coupon.discount).toLocaleString('en-IN')}</span>
                      </div>
                      <button onClick={removeCoupon} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
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
                      <span>GST (18%)</span>
                      <span>₹{gst.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Shipping {totalAmount >= 5000 && <span className="text-green-600 text-xs font-bold ml-1">FREE</span>}</span>
                      <span>{shipping === 0 ? '₹0' : `₹${shipping}`}</span>
                    </div>
                    <div className="flex justify-between font-extrabold text-gray-900 text-base pt-2 border-t border-gray-100">
                      <span>Grand Total</span>
                      <span>₹{grandTotal.toFixed(0)}</span>
                    </div>
                  </div>

                  {/* CTAs */}
                  <button onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}
                    className="w-full py-3.5 btn-gold rounded-xl shadow-lg">
                    Proceed to Checkout
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <a href={`mailto:info@navgrow.org?subject=Bulk Quote Request&body=Items: ${items.map(i=>`${i.name} x${i.qty}`).join(', ')}`}
                      className="py-2.5 border-2 border-blue-200 text-blue-700 font-bold rounded-xl text-sm hover:border-blue-400 hover:bg-blue-50 transition-colors text-center">
                      Request Quote
                    </a>
                    <button onClick={clearCart} className="py-2.5 border-2 border-gray-200 text-gray-500 font-semibold rounded-xl text-sm hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-colors">
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

      <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)}
        orderData={{ items, totalAmount, discount, couponCode: coupon?.code, grandTotal }} />
    </>
  );
};

export default CartSidebar;
