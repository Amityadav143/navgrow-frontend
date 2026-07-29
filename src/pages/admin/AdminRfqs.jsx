/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 | navgrow.org
 *
 * AdminRfqs — manage the B2B Request-for-Quote pipeline. Staff review incoming
 * RFQs, price each line item, set shipping + payment terms, and send a formal
 * quote to the buyer (who can then accept/reject).
 */
import React, { useState, useEffect } from 'react';
import { FileText, Send, CheckCircle, Clock, Package, Building2, Loader2, IndianRupee } from 'lucide-react';
import { rfqApi } from '@/lib/api';
import { usePaginated, useMutation } from '@/hooks/useApi';
import { useToast } from '@/components/ui/use-toast';

const STATUS_COLORS = {
  SUBMITTED: 'bg-blue-100 text-blue-700',  REVIEWING: 'bg-amber-100 text-amber-700',
  QUOTED:    'bg-violet-100 text-violet-700', ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED:  'bg-red-100 text-red-700',     EXPIRED:  'bg-gray-100 text-gray-600',
  CONVERTED: 'bg-teal-100 text-teal-700',   CANCELLED:'bg-gray-100 text-gray-500',
};
const STATUSES = Object.keys(STATUS_COLORS);

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const AdminRfqs = () => {
  const { toast } = useToast();
  const { items, loading, setFilter, refetch } = usePaginated(rfqApi.list);
  const [selected, setSelected] = useState(null);
  const [prices, setPrices] = useState({});       // itemId -> unit price
  const [shipping, setShipping] = useState('');
  const [terms, setTerms] = useState('100% advance');
  const [validity, setValidity] = useState(15);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Load full detail when an RFQ is selected
  useEffect(() => {
    if (!selected?.id) return;
    rfqApi.detail(selected.id).then(({ data }) => {
      setSelected(data);
      const seed = {};
      (data.items || []).forEach(it => { seed[it.id] = it.quotedUnitPrice || it.listPrice || ''; });
      setPrices(seed);
      setShipping(data.quotedShipping || '');
      setTerms(data.paymentTerms || '100% advance');
      setMessage(data.adminMessage || '');
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  const computed = (() => {
    if (!selected?.items) return { subtotal: 0, gst: 0, total: 0 };
    let subtotal = 0, gst = 0;
    selected.items.forEach(it => {
      const unit = parseFloat(prices[it.id]) || 0;
      const line = unit * it.quantity;
      subtotal += line;
      gst += line * ((it.gstRate || 18) / 100);
    });
    const ship = parseFloat(shipping) || 0;
    return { subtotal, gst, total: subtotal + gst + ship };
  })();

  const sendQuote = async () => {
    const lines = (selected.items || [])
      .filter(it => prices[it.id] !== '' && prices[it.id] != null)
      .map(it => ({ itemId: it.id, unitPrice: parseFloat(prices[it.id]), gstRate: it.gstRate || 18 }));
    if (lines.length === 0) { toast({ title: 'Add at least one price', variant: 'destructive' }); return; }
    setSending(true);
    try {
      await rfqApi.quote(selected.id, {
        lines, shipping: parseFloat(shipping) || 0,
        adminMessage: message, paymentTerms: terms, validityDays: Number(validity) || 15,
      });
      toast({ title: '✓ Quote sent to buyer' });
      setSelected(null); refetch();
    } catch (e) {
      toast({ title: 'Failed to send quote', description: e?.response?.data?.message, variant: 'destructive' });
    } finally { setSending(false); }
  };

  const setStatus = async (id, status) => {
    try { await rfqApi.updateStatus(id, { status }); toast({ title: `Marked ${status}` }); refetch(); }
    catch { toast({ title: 'Failed', variant: 'destructive' }); }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-400" /> RFQ Pipeline
          </h1>
          <p className="text-gray-400 text-sm mt-1">Review requests, price line items, and send formal quotes.</p>
        </div>
        <select onChange={e => setFilter('status', e.target.value || undefined)}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white focus:outline-none">
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* List */}
        <div className="space-y-3">
          {loading ? [...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-800 animate-pulse rounded-2xl" />) :
            items.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
                No RFQs yet.
              </div>
            ) : items.map(r => (
              <button key={r.id} onClick={() => setSelected(r)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${selected?.id === r.id ? 'border-blue-500 bg-blue-950' : 'border-gray-800 bg-gray-800/50 hover:border-blue-400'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-blue-300">{r.rfqNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[r.status]}`}>{r.status}</span>
                    </div>
                    <p className="font-semibold text-white text-sm mt-1">{r.buyerName} {r.company && <span className="text-gray-400">· {r.company}</span>}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{(r.items || []).length} item(s) · {r.deliveryCity || '—'}</p>
                  </div>
                  {r.quotedTotal && <span className="text-green-400 font-bold text-sm shrink-0">{inr(r.quotedTotal)}</span>}
                </div>
              </button>
            ))}
        </div>

        {/* Detail / pricing */}
        <div className="lg:sticky lg:top-6 h-fit">
          {!selected ? (
            <div className="border border-gray-800 rounded-2xl p-10 text-center text-gray-500">
              Select an RFQ to review and price it.
            </div>
          ) : (
            <div className="border border-gray-800 rounded-2xl bg-gray-800/30 p-5 space-y-4">
              {/* Buyer */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-blue-300">{selected.rfqNumber}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[selected.status]}`}>{selected.status}</span>
                </div>
                <p className="text-white font-bold mt-2">{selected.buyerName}</p>
                <p className="text-gray-400 text-sm">{selected.buyerEmail} · {selected.buyerPhone}</p>
                {selected.company && <p className="text-gray-400 text-sm flex items-center gap-1.5 mt-1"><Building2 className="h-3.5 w-3.5" />{selected.company} {selected.gstin && `· GSTIN ${selected.gstin}`}</p>}
                {selected.notes && <p className="text-gray-300 text-xs bg-gray-900/60 rounded-lg p-2.5 mt-2">{selected.notes}</p>}
              </div>

              {/* Line items + pricing */}
              <div className="space-y-2.5">
                {(selected.items || []).map(it => (
                  <div key={it.id} className="bg-gray-900/50 rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium leading-snug">{it.productName}</p>
                        <p className="text-gray-500 text-xs">Qty: {it.quantity}{it.sku && ` · ${it.sku}`} · GST {it.gstRate || 18}%</p>
                        {it.specification && <p className="text-amber-300/80 text-xs mt-1">Spec: {it.specification}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center bg-gray-800 rounded-lg border border-gray-700 px-2">
                        <IndianRupee className="h-3.5 w-3.5 text-gray-500" />
                        <input type="number" value={prices[it.id] ?? ''} placeholder="Unit price"
                          onChange={e => setPrices(p => ({ ...p, [it.id]: e.target.value }))}
                          className="w-24 bg-transparent text-white text-sm px-1.5 py-1.5 focus:outline-none" />
                      </div>
                      <span className="text-gray-500 text-xs">× {it.quantity} =</span>
                      <span className="text-white text-sm font-semibold">{inr((parseFloat(prices[it.id]) || 0) * it.quantity)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="bg-gray-900/60 rounded-xl p-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-400"><span>Subtotal</span><span>{inr(computed.subtotal)}</span></div>
                <div className="flex justify-between text-gray-400"><span>GST</span><span>{inr(computed.gst)}</span></div>
                <div className="flex items-center justify-between text-gray-400">
                  <span>Shipping</span>
                  <input type="number" value={shipping} placeholder="0"
                    onChange={e => setShipping(e.target.value)}
                    className="w-24 bg-gray-800 border border-gray-700 rounded-lg text-white text-right text-sm px-2 py-1 focus:outline-none" />
                </div>
                <div className="flex justify-between text-white font-bold text-base pt-1.5 border-t border-gray-700">
                  <span>Total</span><span className="text-green-400">{inr(computed.total)}</span>
                </div>
              </div>

              {/* Terms */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-400 font-semibold">Payment Terms</label>
                  <select value={terms} onChange={e => setTerms(e.target.value)}
                    className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm px-2 py-2 focus:outline-none">
                    <option>100% advance</option>
                    <option>50% advance, 50% on delivery</option>
                    <option>Net 15</option>
                    <option>Net 30</option>
                    <option>Against PO</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-semibold">Valid (days)</label>
                  <input type="number" value={validity} onChange={e => setValidity(e.target.value)}
                    className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm px-2 py-2 focus:outline-none" />
                </div>
              </div>

              <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2}
                placeholder="Message to buyer (delivery timeline, certifications, etc.)"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg text-white text-sm px-3 py-2 focus:outline-none resize-none" />

              {/* Actions */}
              <div className="flex gap-2">
                <button onClick={sendQuote} disabled={sending}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sending ? 'Sending…' : 'Send Quote'}
                </button>
                <button onClick={() => setStatus(selected.id, 'REVIEWING')}
                  className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold rounded-xl text-sm">
                  Reviewing
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminRfqs;
