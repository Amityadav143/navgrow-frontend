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
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Package, Search, Filter, ChevronDown, Truck, Eye, AlertTriangle, MapPin, Phone, Mail, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { ordersApi, debounce } from '@/lib/api';
import { usePaginated, useMutation } from '@/hooks/useApi';
import { useToast } from '@/components/ui/use-toast';
import { unitPlural } from '@/lib/variants';

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-700', CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-indigo-100 text-indigo-700', SHIPPED: 'bg-cyan-100 text-cyan-700',
  DELIVERED: 'bg-green-100 text-green-700', CANCELLED: 'bg-red-100 text-red-700', REFUNDED: 'bg-gray-100 text-gray-600'
};
const ORDER_STATUSES = ['PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED','REFUNDED'];

const AdminOrders = () => {
  const { toast } = useToast();
  const [selected, setSelected] = useState(null);
  const [trackingForm, setTrackingForm] = useState({ trackingNumber: '', courierName: '' });
  const { items: orders, total, loading, params, setFilter, goToPage, refetch } = usePaginated(ordersApi.list);
  // Debounced so typing doesn't fire a request per keystroke.
  const searchOrders = useMemo(() => debounce((v) => setFilter('q', v.trim() || undefined), 350), []); // eslint-disable-line react-hooks/exhaustive-deps
  const pageSize = params?.size || 20;
  const pageNo = params?.page || 0;
  const pages = Math.max(1, Math.ceil((total || 0) / pageSize));
  const inr = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;
  const [updateStatus, { loading: updating }] = useMutation(ordersApi.updateStatus);

  const handleStatusChange = async (orderId, newStatus) => {
    const res = await updateStatus(orderId, newStatus,
      selected?.id === orderId ? trackingForm : undefined);
    if (res.error) { toast({ title: 'Failed', description: res.error, variant: 'destructive' }); return; }
    // Re-opening / confirming an order takes its stock again; if some of it has
    // gone in the meantime the server flags the order instead of blocking.
    const flagCount = (n) => (String(n || '').match(/\[STOCK SHORTFALL\]/g) || []).length;
    const before = (Array.isArray(orders) ? orders : []).find(o => o.id === orderId)?.notes
      ?? (selected?.id === orderId ? selected.notes : '');
    if (flagCount(res.data?.notes) > flagCount(before)) {
      toast({ title: `Status changed to ${newStatus} — stock is short`,
              description: 'Some items were not in stock to allocate to this order. Source them (backorder) or refund.',
              variant: 'destructive' });
    } else {
      toast({ title: 'Order updated', description: `Status changed to ${newStatus}` });
    }
    refetch();
    setSelected(null);
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-white">Orders</h1>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input placeholder="Order no., name, email, phone…" onChange={e => searchOrders(e.target.value)}
              className="pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 w-56" />
          </div>
          <select onChange={e => setFilter('status', e.target.value || undefined)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white focus:outline-none">
            <option value="">All Status</option>
            {ORDER_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['Order #','Customer','Items','Total','Payment','Status','Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 animate-pulse rounded" /></td>
                  ))}
                </tr>
              ))
            ) : orders.map((order) => (
              <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-bold text-blue-600">
                  #{order.orderNumber}
                  {order.notes && order.notes.includes('[STOCK SHORTFALL]') && (
                    <span className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[9px] font-bold align-middle" title="Paid, but stock ran out — source or refund">
                      <AlertTriangle className="h-2.5 w-2.5" /> STOCK
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-900 text-xs">{order.customerName}</p>
                  <p className="text-gray-400 text-[11px]">{order.customerEmail}</p>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">{order.items?.length || 0}</td>
                <td className="px-4 py-3 font-bold text-gray-900">₹{order.grandTotal?.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {order.paymentStatus}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[order.status]}`}>{order.status}</span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => setSelected(selected?.id === order.id ? null : order)}
                    className="flex items-center gap-1 text-blue-600 text-xs font-semibold hover:underline">
                    <Eye className="h-3.5 w-3.5" /> Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {orders.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-400"><Package className="h-10 w-10 mx-auto mb-2 opacity-30" />No orders found</div>
        )}
        {/* Pagination — older orders used to be unreachable (only the latest 20 showed). */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
            <span>Page {pageNo + 1} of {pages} · {total} orders</span>
            <div className="flex gap-2">
              <button onClick={() => goToPage(Math.max(0, pageNo - 1))} disabled={pageNo === 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 font-semibold disabled:opacity-40"><ChevronLeft className="h-3.5 w-3.5" /> Prev</button>
              <button onClick={() => goToPage(Math.min(pages - 1, pageNo + 1))} disabled={pageNo >= pages - 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 font-semibold disabled:opacity-40">Next <ChevronRight className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Order management panel */}
      {selected && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="mt-5 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-4">Manage #{selected.orderNumber}</h3>

          {/* What was ordered and where it goes — the panel used to show only the
              status buttons, so fulfilment needed the database to see the items. */}
          {selected.notes && selected.notes.includes('[STOCK SHORTFALL]') && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <p><strong>Stock ran out for this order.</strong> The lines marked “short” below were not taken from inventory — source them (backorder) or refund the customer.</p>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
            <div className="lg:col-span-2 rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-xs">
                <thead><tr className="bg-gray-50 text-gray-500">
                  <th className="text-left px-3 py-2 font-bold">Item</th><th className="px-3 py-2 font-bold">Qty</th>
                  <th className="text-right px-3 py-2 font-bold">Unit (incl. GST)</th><th className="text-right px-3 py-2 font-bold">Line</th>
                </tr></thead>
                <tbody>
                  {(selected.items || []).map((it) => (
                    <tr key={it.id} className="border-t border-gray-50">
                      <td className="px-3 py-2 text-gray-800">
                        {it.productName}{it.hsnCode ? <span className="text-gray-400"> · HSN {it.hsnCode}</span> : null}
                        {it.stockCommitted === false && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold" title="Not taken from inventory — not enough stock">short</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center font-bold">{it.quantity}{it.unitLabel ? <span className="font-normal text-gray-400"> {unitPlural(it.unitLabel, it.quantity)}</span> : null}</td>
                      <td className="px-3 py-2 text-right">{inr(it.unitPrice)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{inr(Number(it.unitPrice || 0) * Number(it.quantity || 0))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 text-gray-600">
                  {Number(selected.shippingCharge) > 0 && <tr><td colSpan={3} className="px-3 py-1.5 text-right">Delivery</td><td className="px-3 py-1.5 text-right">{inr(selected.shippingCharge)}</td></tr>}
                  {Number(selected.codCharge) > 0 && <tr><td colSpan={3} className="px-3 py-1.5 text-right">COD charge</td><td className="px-3 py-1.5 text-right">{inr(selected.codCharge)}</td></tr>}
                  {Number(selected.discountAmount) > 0 && <tr><td colSpan={3} className="px-3 py-1.5 text-right">Discount{selected.couponCode ? ` (${selected.couponCode})` : ''}</td><td className="px-3 py-1.5 text-right">−{inr(selected.discountAmount)}</td></tr>}
                  <tr className="font-bold text-gray-900"><td colSpan={3} className="px-3 py-2 text-right">Grand total</td><td className="px-3 py-2 text-right">{inr(selected.grandTotal)}</td></tr>
                </tfoot>
              </table>
            </div>
            <div className="rounded-xl border border-gray-100 p-3 text-xs text-gray-700 space-y-1.5">
              <p className="font-bold text-gray-900 text-sm">{selected.customerName}{selected.companyName ? ` · ${selected.companyName}` : ''}</p>
              <p className="flex items-start gap-1.5"><MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gray-400" />
                {[selected.addressLine1, selected.addressLine2, selected.city, selected.state, selected.pincode].filter(Boolean).join(', ')}</p>
              <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-gray-400" /><a href={`tel:${selected.customerPhone}`} className="hover:underline">{selected.customerPhone}</a></p>
              <p className="flex items-center gap-1.5 break-all"><Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" /><a href={`mailto:${selected.customerEmail}`} className="hover:underline">{selected.customerEmail}</a></p>
              {selected.gstin && <p>GSTIN: <span className="font-mono">{selected.gstin}</span></p>}
              <p>{selected.paymentMethod === 'COD' ? 'Cash on delivery' : 'Paid online'} · {selected.deliverySpeed || 'standard'}{selected.deliveryZone ? ` · ${selected.deliveryZone}` : ''}</p>
              {selected.invoiceNumber && <p className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-gray-400" />Invoice {selected.invoiceNumber}</p>}
              {selected.notes && <p className="whitespace-pre-line rounded-lg bg-gray-50 px-2 py-1.5 text-gray-600">{selected.notes}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Update Status</p>
              <div className="flex flex-wrap gap-2">
                {ORDER_STATUSES.map(s => (
                  <button key={s} disabled={updating || selected.status === s}
                    onClick={() => handleStatusChange(selected.id, s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selected.status === s ? STATUS_COLORS[s] + ' opacity-60 cursor-default' : 'bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Add Tracking</p>
              <div className="flex gap-2">
                <input placeholder="Tracking number" value={trackingForm.trackingNumber}
                  onChange={e => setTrackingForm(p => ({ ...p, trackingNumber: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
                <input placeholder="Courier" value={trackingForm.courierName}
                  onChange={e => setTrackingForm(p => ({ ...p, courierName: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
                <button onClick={() => handleStatusChange(selected.id, 'SHIPPED')}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-xs font-bold hover:bg-cyan-700 flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5" /> Ship
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AdminOrders;
