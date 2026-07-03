/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 · navgrow.org
 *
 * PROPRIETARY & CONFIDENTIAL — Navgrow Engineering Platform v1.0
 *
 * OrderTrackWidget — a compact, embeddable live order-tracking widget.
 * Drop it anywhere (account page, home, footer). Enter an order number and
 * see an inline status timeline with courier/tracking details. Distinct from
 * the full OrderTrackPage — this is a self-contained card for in-context use.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Package, CheckCircle2, Truck, Home, Clock, XCircle,
  Loader2, MapPin, RefreshCw,
} from 'lucide-react';
import { ordersApi } from '@/lib/api';
import { track } from '@/lib/analytics';

const STEPS = [
  { key: 'PENDING',    label: 'Order Placed', icon: Clock },
  { key: 'CONFIRMED',  label: 'Confirmed',    icon: CheckCircle2 },
  { key: 'PROCESSING', label: 'Processing',   icon: Package },
  { key: 'SHIPPED',    label: 'Shipped',      icon: Truck },
  { key: 'DELIVERED',  label: 'Delivered',    icon: Home },
];

const OrderTrackWidget = ({ compact = false, className = '' }) => {
  const [orderNum, setOrderNum] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const doTrack = async (e) => {
    e?.preventDefault();
    const num = orderNum.trim().toUpperCase();
    if (!num) return;
    setLoading(true); setError(''); setOrder(null);
    try {
      const { data } = await ordersApi.track(num);
      setOrder(data);
      try { track('order_track', { label: num }); } catch {}
    } catch (err) {
      setError(err?.response?.status === 404
        ? `We couldn't find order ${num}. Please check the number.`
        : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const cancelled = order && (order.status === 'CANCELLED' || order.status === 'REFUNDED');
  const currentIdx = order ? STEPS.findIndex((s) => s.key === order.status) : -1;

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl brand-gradient flex items-center justify-center">
          <Truck className="h-4.5 w-4.5 text-white" />
        </div>
        <div>
          <h3 className="font-extrabold text-gray-900 leading-tight">Track your order</h3>
          <p className="text-xs text-gray-400">Live status in real time</p>
        </div>
      </div>

      <form onSubmit={doTrack} className="flex gap-2 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={orderNum}
            onChange={(e) => setOrderNum(e.target.value)}
            placeholder="Order number, e.g. NG-1234567890"
            className="w-full pl-10 pr-3 py-2.5 rounded-xl border-2 border-gray-200 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <button type="submit" disabled={loading}
          className="px-4 py-2.5 brand-gradient text-white font-bold rounded-xl text-sm flex items-center gap-2 disabled:opacity-60">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {!compact && 'Track'}
        </button>
      </form>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-2">
          <XCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <AnimatePresence>
        {order && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="mt-4 overflow-hidden">

            {/* Order summary */}
            <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 mb-4">
              <div>
                <p className="text-xs text-gray-400 font-semibold">Order</p>
                <p className="font-mono font-extrabold text-gray-900">#{order.orderNumber}</p>
              </div>
              {order.grandTotal != null && (
                <div className="text-right">
                  <p className="text-xs text-gray-400 font-semibold">Total</p>
                  <p className="font-extrabold text-blue-700">₹{Number(order.grandTotal).toLocaleString('en-IN')}</p>
                </div>
              )}
            </div>

            {cancelled ? (
              <div className="flex items-center gap-2 text-sm font-bold text-red-600 bg-red-50 rounded-xl px-4 py-3">
                <XCircle className="h-5 w-5" />
                This order was {order.status === 'REFUNDED' ? 'refunded' : 'cancelled'}.
              </div>
            ) : (
              <>
                {/* Timeline */}
                <div className="relative">
                  {STEPS.map((step, i) => {
                    const done = i <= currentIdx;
                    const active = i === currentIdx;
                    const Icon = step.icon;
                    return (
                      <div key={step.key} className="flex items-start gap-3 pb-4 last:pb-0 relative">
                        {/* connector */}
                        {i < STEPS.length - 1 && (
                          <div className={`absolute left-[15px] top-8 w-0.5 h-full -ml-px ${i < currentIdx ? 'bg-blue-500' : 'bg-gray-200'}`} />
                        )}
                        <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          done ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'} ${active ? 'ring-4 ring-blue-100' : ''}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="pt-1">
                          <p className={`text-sm font-bold ${done ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</p>
                          {active && <p className="text-xs text-blue-600 font-semibold">Current status</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Courier / tracking */}
                {(order.trackingNumber || order.courierName) && (
                  <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-blue-600 shrink-0" />
                      <span className="text-gray-600">
                        {order.courierName && <span className="font-semibold text-gray-800">{order.courierName}</span>}
                        {order.courierName && order.trackingNumber && ' · '}
                        {order.trackingNumber && <span className="font-mono text-blue-700">{order.trackingNumber}</span>}
                      </span>
                    </div>
                  </div>
                )}

                <button onClick={doTrack}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-blue-600 transition-colors">
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh status
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrderTrackWidget;
