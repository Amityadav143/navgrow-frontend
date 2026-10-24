/**
 * © 2024–2026 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 | navgrow.org | info@navgrow.org
 *
 * PROPRIETARY & CONFIDENTIAL
 * This file is part of the Navgrow Engineering Platform.
 * Unauthorised copying, modification, distribution, or use is prohibited
 * without prior written consent of Navgrow Engineering Service Pvt. Ltd.
 *
 * Licensed for: navgrow.org (Production Deployment Only)
 */
/**
 * Admin → Reviews
 * Customer reviews wait here until the team approves them; only approved
 * reviews appear on product pages and count towards a product's rating.
 * There was no screen for this before, so submitted reviews could never be
 * published. Reviews from buyers with a confirmed order are marked
 * "Verified purchase".
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, CheckCircle, Trash2, ExternalLink, ShieldCheck, Mail, Clock, AlertTriangle, Loader2, RefreshCw,
} from 'lucide-react';
import { reviewsApi } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

const fmtDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '' : dt.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const Stars = ({ n }) => (
  <span className="inline-flex items-center gap-0.5" aria-label={`${n} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Star key={i} className={`h-3.5 w-3.5 ${i <= n ? 'text-amber-400 fill-amber-400' : 'text-gray-600'}`} />
    ))}
  </span>
);

const AdminReviews = () => {
  const { toast } = useToast();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState('');
  const [confirmDel, setConfirmDel] = useState(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const load = useCallback(() => {
    setLoading(true); setFailed(false);
    reviewsApi.pending()
      .then(({ data }) => setList(Array.isArray(data) ? data : []))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => (verifiedOnly ? list.filter((r) => r.verified) : list), [list, verifiedOnly]);
  const verifiedCount = list.filter((r) => r.verified).length;
  const lowCount = list.filter((r) => Number(r.rating) <= 2).length;

  const approve = async (r) => {
    setBusy(r.id);
    try {
      await reviewsApi.approve(r.id);
      setList((l) => l.filter((x) => x.id !== r.id));
      toast({ title: 'Review published', description: `${r.reviewerName}'s review now shows on ${r.productName || 'the product page'}.` });
    } catch (err) {
      toast({ title: 'Could not approve', description: err?.response?.data?.message || 'Please try again.', variant: 'destructive' });
    } finally { setBusy(''); }
  };

  const remove = async () => {
    const r = confirmDel;
    if (!r) return;
    setBusy(r.id);
    try {
      await reviewsApi.remove(r.id);
      setList((l) => l.filter((x) => x.id !== r.id));
      toast({ title: 'Review deleted' });
      setConfirmDel(null);
    } catch (err) {
      toast({ title: 'Could not delete', description: err?.response?.data?.message || 'Please try again.', variant: 'destructive' });
    } finally { setBusy(''); }
  };

  return (
    <div className="p-4 sm:p-6">
      <AnimatePresence>
        {confirmDel && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
              className="bg-gray-800 rounded-2xl border border-gray-700 p-6 max-w-sm w-full shadow-2xl" role="dialog" aria-modal="true">
              <div className="w-12 h-12 rounded-full bg-red-900/50 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <p className="text-white font-semibold text-center mb-1">Delete this review?</p>
              <p className="text-gray-400 text-sm text-center mb-5">{confirmDel.reviewerName} · {confirmDel.productName}</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDel(null)} className="flex-1 py-2.5 bg-gray-700 text-gray-300 rounded-xl text-sm">Cancel</button>
                <button onClick={remove} disabled={busy === confirmDel.id}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm disabled:opacity-60">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Star className="h-6 w-6 text-amber-400" /> Reviews
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Approve customer reviews before they appear on product pages</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-200 cursor-pointer select-none">
            <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} className="accent-amber-500" />
            Verified purchases only
          </label>
          <button onClick={load} className="flex items-center gap-2 px-3.5 py-2 bg-gray-800 border border-gray-700 text-gray-200 rounded-xl text-sm hover:bg-gray-700">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 max-w-2xl">
        {[
          [Clock, 'Waiting for approval', list.length, 'bg-amber-900/50 text-amber-300'],
          [ShieldCheck, 'Verified purchases', verifiedCount, 'bg-green-900/50 text-green-300'],
          [AlertTriangle, '1–2 star (read first)', lowCount, 'bg-red-900/50 text-red-300'],
        ].map(([Icon, label, value, tint]) => (
          <div key={label} className="bg-gray-800/60 border border-gray-700 rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tint}`}><Icon className="h-5 w-5" /></div>
            <div className="min-w-0">
              <p className="text-2xl font-extrabold text-white leading-none">{loading ? '—' : value}</p>
              <p className="text-[11px] text-gray-400 mt-1">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-gray-800 animate-pulse rounded-2xl" />)}</div>
      ) : failed ? (
        <div className="text-center py-16 text-gray-400 bg-gray-800/40 rounded-2xl border border-gray-800">
          <p className="font-semibold">Couldn't load reviews.</p>
          <button onClick={load} className="mt-2 text-sm font-bold text-amber-400 hover:text-amber-300">Try again</button>
        </div>
      ) : shown.length === 0 ? (
        <div className="text-center py-16 text-gray-500 bg-gray-800/40 rounded-2xl border border-gray-800">
          <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-semibold">{verifiedOnly && list.length ? 'No verified-purchase reviews waiting' : 'All caught up'}</p>
          <p className="text-sm mt-1">New reviews appear here for approval.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {shown.map((r) => (
            <motion.div key={r.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800/60 border border-gray-700 rounded-2xl p-4 flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {r.productSlug ? (
                    <a href={`/shop/${r.productSlug}`} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-bold text-blue-300 hover:text-blue-200 inline-flex items-center gap-1 max-w-full">
                      <span className="truncate">{r.productName}</span> <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  ) : <span className="text-xs font-bold text-gray-400">{r.productName || 'Product removed'}</span>}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Stars n={Number(r.rating) || 0} />
                    {r.verified && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-900/50 text-green-300 text-[10px] font-bold">
                        <ShieldCheck className="h-3 w-3" /> Verified purchase
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-gray-500 whitespace-nowrap">{fmtDate(r.createdAt)}</span>
              </div>

              {r.title && <p className="text-sm font-semibold text-white mt-3">{r.title}</p>}
              <p className="text-sm text-gray-300 mt-1 whitespace-pre-wrap break-words">{r.body || <span className="italic text-gray-500">No written review — rating only.</span>}</p>

              <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-gray-700/70 flex-wrap">
                <p className="text-xs text-gray-400 min-w-0">
                  <span className="font-semibold text-gray-200">{r.reviewerName}</span>
                  {r.reviewerEmail && (
                    <a href={`mailto:${r.reviewerEmail}`} className="ml-2 inline-flex items-center gap-1 hover:text-gray-200">
                      <Mail className="h-3 w-3" />{r.reviewerEmail}
                    </a>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setConfirmDel(r)} disabled={busy === r.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-300 hover:bg-red-900/40 disabled:opacity-50">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                  <button onClick={() => approve(r)} disabled={busy === r.id}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-green-600 hover:bg-green-700 text-white disabled:opacity-50">
                    {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />} Approve
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminReviews;
