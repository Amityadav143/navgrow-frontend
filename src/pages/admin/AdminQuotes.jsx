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
import { FileText, CheckCircle, Clock, XCircle, Send } from 'lucide-react';
import { quotesApi } from '@/lib/api';
import { usePaginated, useMutation } from '@/hooks/useApi';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_COLORS = {
  NEW: 'bg-blue-100 text-blue-700', REVIEWING: 'bg-amber-100 text-amber-700',
  QUOTED: 'bg-violet-100 text-violet-700', ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700', CLOSED: 'bg-gray-100 text-gray-600',
};
const STATUSES = ['NEW','REVIEWING','QUOTED','ACCEPTED','REJECTED','CLOSED'];

const AdminQuotes = () => {
  const { toast } = useToast();
  const [selected, setSelected] = useState(null);
  const [quotedAmount, setQuotedAmount] = useState('');
  const { items, loading, setFilter, refetch } = usePaginated(quotesApi.list);
  const [updateStatus, { loading: updating }] = useMutation(quotesApi.updateStatus);

  const handleUpdate = async (id, status) => {
    const res = await updateStatus(id, status, quotedAmount ? parseFloat(quotedAmount) : undefined);
    if (res.error) { toast({ title: 'Failed', description: res.error, variant: 'destructive' }); return; }
    toast({ title: 'Quote updated' });
    refetch(); setSelected(null); setQuotedAmount('');
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-white">Quote Requests</h1>
        <select onChange={e => setFilter('status', e.target.value || undefined)}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white focus:outline-none">
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          {loading ? [...Array(5)].map((_,i) => <div key={i} className="h-20 bg-gray-800 animate-pulse rounded-2xl" />) :
          items.map((q) => (
            <button key={q.id} onClick={() => { setSelected(q); setQuotedAmount(q.quotedAmount || ''); }}
              className={`w-full text-left p-4 rounded-2xl border transition-all ${selected?.id===q.id ? 'border-blue-500 bg-blue-950' : 'border-gray-800 bg-gray-800/50 hover:border-blue-400'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">{q.name}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{q.serviceType} · {q.scope}</p>
                  <p className="text-gray-500 text-[11px]">{q.email}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[q.status]}`}>{q.status}</span>
                  {q.estLow && <p className="text-gray-400 text-[10px] mt-1">Est: ₹{Number(q.estLow).toLocaleString('en-IN')}+</p>}
                </div>
              </div>
            </button>
          ))}
          {items.length === 0 && !loading && (
            <div className="text-center py-12 text-gray-500"><FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />No quotes</div>
          )}
        </div>

        <AnimatePresence>
          {selected && (
            <motion.div initial={{ opacity:0, x:10 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:10 }}
              className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
              <h3 className="font-bold text-white text-lg mb-1">{selected.name}</h3>
              <p className="text-gray-400 text-sm mb-4">{selected.email} · {selected.phone}</p>

              {[
                ['Service',   selected.serviceType],
                ['Scope',     selected.scope],
                ['Duration',  selected.duration],
                ['Industry',  selected.industry || '—'],
                ['City',      selected.city || '—'],
                ['Urgency',   selected.urgency || 'standard'],
                ['Add-ons',   selected.addons?.join(', ') || 'None'],
                ['Est. Range',selected.estLow ? `₹${Number(selected.estLow).toLocaleString('en-IN')} – ₹${Number(selected.estHigh).toLocaleString('en-IN')}` : 'N/A'],
                ['Notes',     selected.notes || '—'],
              ].map(([k,v]) => (
                <div key={k} className="flex gap-3 py-2 border-b border-gray-700 last:border-0">
                  <span className="text-gray-500 text-xs w-24 shrink-0">{k}</span>
                  <span className="text-gray-200 text-xs">{v}</span>
                </div>
              ))}

              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5">Quoted Amount (₹)</label>
                  <input type="number" value={quotedAmount} onChange={e => setQuotedAmount(e.target.value)}
                    placeholder="Enter formal quote amount"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5">Update Status</label>
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.map(s => (
                      <button key={s} disabled={updating || selected.status === s}
                        onClick={() => handleUpdate(selected.id, s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selected.status===s ? STATUS_COLORS[s]+' opacity-60 cursor-default' : 'bg-gray-700 text-gray-300 hover:bg-blue-700 hover:text-white'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <a href={`mailto:${selected.email}?subject=Quote for ${encodeURIComponent(selected.serviceType)}&body=Dear ${encodeURIComponent(selected.name)},%0A%0AThank you for your quote request.%0A%0AFor ${encodeURIComponent(selected.serviceType)} (${encodeURIComponent(selected.scope||'')}):%0AQuoted Amount: ₹${quotedAmount || '____'}%0A%0APlease contact us to proceed.%0A%0ARegards,%0ANavgrow Engineering Team`}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-500 transition-colors">
                  <Send className="h-4 w-4" /> Send Quote Email
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminQuotes;
