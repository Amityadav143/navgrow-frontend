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
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ShoppingCart, Trash2, Package, ArrowRight, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { useRfq } from '@/context/RfqContext';
import useLiveAvailability, { withLive } from '@/hooks/useLiveAvailability';
import { isOutOfStock, stockOf, moqOf, isLiveId } from '@/lib/stock';
import { hasOptions, priceRange, perUnit } from '@/lib/variants';
import PageHero from '@/components/PageHero';
import useSeo from '@/hooks/useSeo';

const WishlistPage = () => {
  useSeo({ title: 'Wishlist', description: 'Your saved products from Navgrow Engineering Shop.', path: '/wishlist', noindex: true });
  const { wishlist, toggleWishlist, moveToCart, items } = useCart();
  const { addToRfq, inRfq } = useRfq();
  // Wishlist entries are saved copies — check live stock and price before
  // offering "Add to Cart" (sold-out items used to be addable from here).
  const { live, loading: checking } = useLiveAvailability(wishlist);

  return (
    <>
      <PageHero
        chip={<><Heart className="h-4 w-4" /> Shop</>}
        title={<>My <span className="gradient-text">Wishlist</span></>}
        subtitle="Products you've saved for later."
        breadcrumbs={[{ label: 'Shop', path: '/shop' }, { label: 'Wishlist' }]}
      />

      <section className="py-14 bg-gray-50 min-h-[60vh]">
        <div className="container mx-auto px-4 max-w-4xl">
          {wishlist.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="text-center py-24 bg-white rounded-3xl border border-gray-100 shadow-sm">
              <Heart className="h-16 w-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-500 mb-2">Your wishlist is empty</h3>
              <p className="text-gray-500 text-sm mb-6">Browse our shop and click the heart icon to save products.</p>
              <Link to="/shop" className="inline-flex items-center gap-2 px-6 py-3 btn-gold rounded-xl font-bold shadow-md hover:opacity-90">
                Browse Shop <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          ) : (
            <div>
              <p className="text-gray-500 text-sm mb-6">{wishlist.length} saved product{wishlist.length > 1 ? 's' : ''}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <AnimatePresence>
                  {wishlist.map((saved, i) => {
                    const item = withLive(saved, live[String(saved.id)]);
                    const inCart = items.some(c => c.id === item.id);
                    // Saved from the sample catalogue (live shop was unreachable): can't be
                    // bought online, but can still be quoted.
                    const sample = !isLiveId(item.id);
                    const gone = !sample && (item.unavailable || item.active === false);
                    const soldOut = !gone && !sample && isOutOfStock(item);
                    const stock = stockOf(item);
                    return (
                      <motion.div key={item.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
                        <div className="aspect-[4/3] overflow-hidden bg-gray-50 relative">
                          <img src={item.image} alt={item.name} loading="lazy" onError={(e) => { e.target.onerror=null; e.target.style.display='none'; }}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                          <button onClick={() => toggleWishlist(item)}
                            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-sm text-red-500 hover:bg-red-50 transition-colors">
                            <Heart className="h-4 w-4 fill-current" />
                          </button>
                        </div>
                        <div className="p-4 flex flex-col flex-1">
                          {item.slug ? (
                            <Link to={`/shop/${item.slug}`} className="font-bold text-gray-900 text-sm mb-2 leading-snug flex-1 hover:text-blue-700">{item.name}</Link>
                          ) : (
                            <p className="font-bold text-gray-900 text-sm mb-2 leading-snug flex-1">{item.name}</p>
                          )}
                          <p className="text-xl font-extrabold text-gray-900 mb-1">
                            {hasOptions(item) && priceRange(item).max > priceRange(item).min
                              ? `₹${priceRange(item).min.toLocaleString('en-IN')} – ₹${priceRange(item).max.toLocaleString('en-IN')}`
                              : `₹${Number(item.price || 0).toLocaleString('en-IN')}`}
                            {item.unitLabel && <span className="text-xs font-semibold text-gray-400">{perUnit(item)}</span>}
                          </p>
                          <p className={`text-xs font-semibold mb-3 ${gone ? 'text-gray-500' : soldOut ? 'text-red-600' : sample ? 'text-amber-700' : stock !== null ? 'text-emerald-600' : 'text-gray-400'}`}>
                            {gone ? 'No longer available'
                              : sample ? 'Price & availability on request'
                              : soldOut ? (stock > 0 ? `Only ${stock} left (min. order ${moqOf(item)})` : 'Out of stock — request a quote')
                              : stock !== null ? (stock <= 10 ? `Only ${stock} left` : 'In stock')
                              : (checking ? 'Checking stock…' : '\u00a0')}
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => toggleWishlist(saved)}
                              className="flex items-center justify-center gap-1.5 py-2 border border-red-200 text-red-500 text-xs font-bold rounded-xl hover:bg-red-50 transition-colors">
                              <Trash2 className="h-3.5 w-3.5" /> Remove
                            </button>
                            {gone ? (
                              <span className="flex items-center justify-center py-2 text-xs font-semibold text-gray-400 rounded-xl border border-gray-200">Unavailable</span>
                            ) : hasOptions(item) && !soldOut ? (
                              <Link to={`/shop/${item.slug || item.id}`}
                                className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl btn-gold shadow-sm hover:opacity-90">
                                <ShoppingCart className="h-3.5 w-3.5" /> Choose options
                              </Link>
                            ) : (soldOut || sample) ? (
                              <button onClick={() => addToRfq(item, moqOf(item))}
                                className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl transition-all ${
                                  inRfq(item.id) ? 'bg-green-100 text-green-700 border border-green-300' : 'border-2 border-blue-200 text-blue-700 hover:bg-blue-50'
                                }`}>
                                <FileText className="h-3.5 w-3.5" />
                                {inRfq(item.id) ? 'Quoted ✓' : 'Request Quote'}
                              </button>
                            ) : (
                            <button onClick={() => moveToCart(item)}
                              className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl transition-all ${
                                inCart ? 'bg-green-100 text-green-700 border border-green-300' : 'btn-gold shadow-sm hover:opacity-90'
                              }`}>
                              <ShoppingCart className="h-3.5 w-3.5" />
                              {inCart ? 'In Cart' : 'Add to Cart'}
                            </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
              <div className="text-center mt-8">
                <Link to="/shop" className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:underline text-sm">
                  Continue Shopping <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default WishlistPage;
