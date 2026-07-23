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
import { motion } from 'framer-motion';
import { Search, Package, Truck, CheckCircle, Clock, XCircle, MapPin } from 'lucide-react';
import { ordersApi } from '@/lib/api';
import PageHero from '@/components/PageHero';
import useSeo from '@/hooks/useSeo';

const STEPS = ['PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED'];

const StepIcon = ({ status }) => {
  const icons = { PENDING: Clock, CONFIRMED: CheckCircle, PROCESSING: Package, SHIPPED: Truck, DELIVERED: CheckCircle };
  const Icon = icons[status] || Clock;
  return <Icon className="h-5 w-5" />;
};

const OrderTrackPage = () => {
  useSeo({
    title: 'Track Your Order | Products Delivery Status',
    description: 'Track your Navgrow Engineering order — enter your order number to get real-time delivery status, courier details, and estimated delivery date for safety equipment and engineering products.',
    path: '/track-order',
    keywords: 'track engineering product order, safety equipment delivery tracking, Navgrow order tracking',
  });
  const [orderNum, setOrderNum] = useState('');
  const [order, setOrder]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const track = async (e) => {
    e.preventDefault();
    if (!orderNum.trim()) return;
    setLoading(true);
    setError('');
    setOrder(null);
    try {
      const { data } = await ordersApi.track(orderNum.trim().toUpperCase());
      setOrder(data);
    } catch (err) {
      setError(err.response?.status === 404
        ? 'No order found with that number. Please check and try again.'
        : 'Unable to fetch order. Please try again or contact us.');
    } finally {
      setLoading(false);
    }
  };

  const currentStep = order ? STEPS.indexOf(order.status) : -1;

  return (
    <>
      <PageHero chip={<><Package className="h-4 w-4" /> Logistics</>}
        title={<>Track Your <span className="gradient-text">Order</span></>}
        subtitle="Enter your order number to get real-time status and tracking information."
        breadcrumbs={[{ label: 'Track Order' }]} />

      <section className="py-16 bg-gray-50 min-h-[60vh]">
        <div className="container mx-auto px-4 max-w-2xl">

          {/* Search */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-5">Enter Order Number</h2>
            <form onSubmit={track} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                <input value={orderNum} onChange={e => setOrderNum(e.target.value)}
                  placeholder="e.g. NGO-20260421-0001"
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors font-mono uppercase" />
              </div>
              <button type="submit" disabled={loading}
                className="px-6 py-3 brand-gradient text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-60 transition-all">
                {loading ? <span className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /> : 'Track'}
              </button>
            </form>

            {error && (
              <div className="flex items-center gap-2 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <XCircle className="h-4 w-4 shrink-0" />{error}
              </div>
            )}
          </div>

          {/* Order details */}
          {order && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              {/* Summary */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Order Number</p>
                    <p className="text-xl font-extrabold text-gray-900">#{order.orderNumber}</p>
                    <p className="text-sm text-gray-500 mt-1">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 mb-1">Total</p>
                    <p className="text-2xl font-extrabold text-gray-900">₹{order.grandTotal?.toLocaleString('en-IN')}</p>
                    <span className={`inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-bold ${
                      order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>{order.paymentStatus}</span>
                  </div>
                </div>

                {order.trackingNumber && (
                  <div className="mt-4 flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <Truck className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-700">Tracking: {order.trackingNumber}</span>
                    {order.courierName && <span className="text-sm text-blue-500">via {order.courierName}</span>}
                  </div>
                )}
              </div>

              {/* Progress tracker */}
              {order.status !== 'CANCELLED' && order.status !== 'REFUNDED' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="font-bold text-gray-900 mb-5">Order Progress</h3>
                  <div className="flex items-center gap-0">
                    {STEPS.map((step, i) => (
                      <React.Fragment key={step}>
                        <div className="flex flex-col items-center gap-2 flex-1">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                            i <= currentStep ? 'brand-gradient text-white shadow-md' : 'bg-gray-100 text-gray-400'
                          }`}>
                            <StepIcon status={step} />
                          </div>
                          <span className={`text-[10px] font-semibold text-center ${i <= currentStep ? 'text-blue-600' : 'text-gray-400'}`}>{step}</span>
                        </div>
                        {i < STEPS.length - 1 && (
                          <div className={`flex-1 h-0.5 mb-5 transition-colors ${i < currentStep ? 'bg-blue-500' : 'bg-gray-200'}`} />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {(order.status === 'CANCELLED' || order.status === 'REFUNDED') && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
                  <XCircle className="h-6 w-6 text-red-500 shrink-0" />
                  <div>
                    <p className="font-bold text-red-700">Order {order.status}</p>
                    <p className="text-sm text-red-500">For queries contact info@navgrow.org or +91 89270 70972</p>
                  </div>
                </div>
              )}

              {/* Delivery address */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><MapPin className="h-4 w-4 text-blue-600" />Delivery Address</h3>
                <p className="text-sm text-gray-700">{order.customerName}</p>
                <p className="text-sm text-gray-500">{order.addressLine1}{order.addressLine2 ? ', ' + order.addressLine2 : ''}</p>
                <p className="text-sm text-gray-500">{order.city}, {order.state} – {order.pincode}</p>
                <p className="text-sm text-gray-500">{order.customerPhone}</p>
              </div>
            </motion.div>
          )}

          {!order && !loading && !error && (
            <div className="text-center py-8 text-gray-400 text-sm">
              Your order number is in your confirmation email (format: NGO-YYYYMMDD-XXXX)
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default OrderTrackPage;
