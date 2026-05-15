import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Search, Filter, ChevronDown, Truck, Eye } from 'lucide-react';
import { ordersApi } from '@/lib/api';
import { usePaginated, useMutation } from '@/hooks/useApi';
import { useToast } from '@/components/ui/use-toast';

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
  const { items: orders, loading, params, setFilter, refetch } = usePaginated(ordersApi.list);
  const [updateStatus, { loading: updating }] = useMutation(ordersApi.updateStatus);

  const handleStatusChange = async (orderId, newStatus) => {
    const res = await updateStatus(orderId, newStatus,
      selected?.id === orderId ? trackingForm : undefined);
    if (res.error) { toast({ title: 'Failed', description: res.error, variant: 'destructive' }); return; }
    toast({ title: 'Order updated', description: `Status changed to ${newStatus}` });
    refetch();
    setSelected(null);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-white">Orders</h1>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input placeholder="Search email…" onChange={e => setFilter('q', e.target.value)}
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
        <table className="w-full text-sm">
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
                <td className="px-4 py-3 font-mono text-xs font-bold text-blue-600">#{order.orderNumber}</td>
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

        {orders.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-400"><Package className="h-10 w-10 mx-auto mb-2 opacity-30" />No orders found</div>
        )}
      </div>

      {/* Order management panel */}
      {selected && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="mt-5 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-4">Manage #{selected.orderNumber}</h3>
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
