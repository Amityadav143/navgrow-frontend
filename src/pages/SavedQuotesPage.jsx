/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 · navgrow.org · info@navgrow.org
 *
 * PROPRIETARY & CONFIDENTIAL — Navgrow Engineering Platform v1.0
 *
 * SavedQuotesPage — buyers track multiple RFQ quotes and compare them
 * side by side (totals, status, line items), then accept the one they want.
 * Quote references are saved locally so a returning buyer sees them again.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Plus, X, CheckCircle2, Clock, XCircle, Search,
  IndianRupee, Package, ArrowRight, Loader2, Trash2,
} from 'lucide-react';
import PageHero from '@/components/PageHero';
import { rfqApi } from '@/lib/api';
import { track } from '@/lib/analytics';
import useSeo from '@/hooks/useSeo';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import RequireAuth from '@/components/RequireAuth';

const SAVED_KEY_BASE = 'ng_saved_quotes';
/** Quotes are per-account: a shared device must not leak one user's to another. */
const keyFor = (user) => (user?.id ? `${SAVED_KEY_BASE}:${user.id}` : SAVED_KEY_BASE);

const STATUS_META = {
  SUBMITTED: { label: 'Submitted', icon: Clock,        cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  REVIEWING: { label: 'Reviewing', icon: Clock,        cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  QUOTED:    { label: 'Quoted',    icon: FileText,     cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  ACCEPTED:  { label: 'Accepted',  icon: CheckCircle2, cls: 'bg-green-50 text-green-700 border-green-200' },
  REJECTED:  { label: 'Declined',  icon: XCircle,      cls: 'bg-red-50 text-red-700 border-red-200' },
  EXPIRED:   { label: 'Expired',   icon: XCircle,      cls: 'bg-gray-100 text-gray-500 border-gray-200' },
  CANCELLED: { label: 'Cancelled', icon: XCircle,      cls: 'bg-gray-100 text-gray-500 border-gray-200' },
};

const money = (v) => (v == null ? '—' : `₹${Number(v).toLocaleString('en-IN')}`);

const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META.SUBMITTED;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${m.cls}`}>
      <Icon className="h-3.5 w-3.5" /> {m.label}
    </span>
  );
};

const SavedQuotesPage = () => {
  const { user } = useAuth();
  useSeo({
    title: 'Saved Quotes — Compare Your RFQs | Navgrow Engineering',
    description: 'Track and compare your Navgrow Engineering quotation requests side by side. View line items, totals, and status, and accept the quote that works best for you.',
    path: '/saved-quotes',
    keywords: 'compare quotes, RFQ tracking, B2B quotation comparison, engineering quote',
  });

  const { toast } = useToast();
  const [refs, setRefs] = useState([]);          // saved rfq numbers
  const [quotes, setQuotes] = useState({});      // number -> quote data
  const [loading, setLoading] = useState({});    // number -> bool
  const [input, setInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [accepting, setAccepting] = useState('');

  // Load saved references on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(keyFor(user)) || '[]');
      if (Array.isArray(saved)) setRefs(saved);
    } catch { /* ignore */ }
  }, []);

  const persist = useCallback((list) => {
    setRefs(list);
    try { localStorage.setItem(keyFor(user), JSON.stringify(list)); } catch { /* ignore */ }
  }, []);

  const fetchQuote = useCallback(async (num) => {
    setLoading((l) => ({ ...l, [num]: true }));
    try {
      const { data } = await rfqApi.track(num);
      setQuotes((q) => ({ ...q, [num]: data }));
    } catch {
      setQuotes((q) => ({ ...q, [num]: { error: true, rfqNumber: num } }));
    } finally {
      setLoading((l) => ({ ...l, [num]: false }));
    }
  }, []);

  // Fetch any refs we don't have data for yet
  useEffect(() => {
    refs.forEach((num) => {
      if (!quotes[num] && !loading[num]) fetchQuote(num);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refs]);

  const addQuote = async (e) => {
    e?.preventDefault();
    const num = input.trim().toUpperCase();
    if (!num) return;
    if (refs.includes(num)) { setInput(''); return; }
    setAdding(true);
    try {
      const { data } = await rfqApi.track(num);
      setQuotes((q) => ({ ...q, [num]: data }));
      persist([...refs, num]);
      setInput('');
      try { track('quote_compare_add', { label: num }); } catch {}
    } catch {
      toast({ title: 'Quote not found', description: `We couldn't find quote ${num}. Check the number and try again.`, variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  const removeQuote = (num) => {
    persist(refs.filter((r) => r !== num));
    setQuotes((q) => { const c = { ...q }; delete c[num]; return c; });
  };

  const acceptQuote = async (num) => {
    const q = quotes[num];
    if (!q || !q.id) return;
    setAccepting(num);
    try {
      await rfqApi.accept(q.id);
      setQuotes((prev) => ({ ...prev, [num]: { ...prev[num], status: 'ACCEPTED' } }));
      try { track('rfq_accept', { label: num, value: Number(q.quotedTotal) || undefined }); } catch {}
      toast({ title: '✓ Quote accepted', description: 'Our team will reach out to finalise your order.' });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Please try again or contact us at +91 89270 70972.';
      // If the quote expired server-side, reflect that in the UI.
      if (/expired/i.test(msg)) {
        setQuotes((prev) => ({ ...prev, [num]: { ...prev[num], status: 'EXPIRED' } }));
      }
      toast({ title: 'Could not accept', description: msg, variant: 'destructive' });
    } finally {
      setAccepting('');
    }
  };

  const rejectQuote = async (num) => {
    const q = quotes[num];
    if (!q || !q.id) return;
    const reason = window.prompt('Optionally, tell us why you\'re declining (helps us improve our quotes):', '') ?? '';
    setAccepting(num);
    try {
      await rfqApi.reject(q.id, reason);
      setQuotes((prev) => ({ ...prev, [num]: { ...prev[num], status: 'REJECTED' } }));
      try { track('rfq_reject', { label: num }); } catch {}
      toast({ title: 'Quote declined', description: 'Thanks for letting us know. Reach out anytime if your needs change.' });
    } catch {
      toast({ title: 'Could not decline', description: 'Please try again or contact us at +91 89270 70972.', variant: 'destructive' });
    } finally {
      setAccepting('');
    }
  };

  // ── Quote validity helpers ──────────────────────────────────────────────
  // Days left until a quote expires (negative = already expired). null if no validity set.
  const daysLeft = (q) => {
    if (!q?.quoteValidUntil) return null;
    const ms = new Date(q.quoteValidUntil).getTime() - Date.now();
    return Math.ceil(ms / 86400000);
  };
  // A quote is effectively expired if it was quoted but its validity date has passed.
  const isExpired = (q) => {
    if (q?.status === 'EXPIRED') return true;
    if (q?.status !== 'QUOTED') return false;
    const d = daysLeft(q);
    return d != null && d < 0;
  };

  const loaded = refs.map((n) => quotes[n]).filter((q) => q && !q.error);
  const quotedOnes = loaded.filter((q) => q.quotedTotal != null);
  const cheapest = quotedOnes.length
    ? quotedOnes.reduce((a, b) => (Number(a.quotedTotal) <= Number(b.quotedTotal) ? a : b)).rfqNumber
    : null;

  return (
    <>
      <PageHero
        title="Saved Quotes"
        subtitle="Track your quotation requests and compare them side by side."
        breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Saved Quotes' }]}
      />

      <section className="section-padding bg-gray-50/70 min-h-[60vh]">
        <div className="container mx-auto px-4">

          {/* Add a quote */}
          <div className="max-w-xl mx-auto mb-10">
            <form onSubmit={addQuote} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter a quote number, e.g. RFQ-2024-0001"
                  className="w-full pl-10 pr-3 py-3 rounded-xl border-2 border-gray-200 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <button type="submit" disabled={adding}
                className="px-5 py-3 brand-gradient text-white font-bold rounded-xl text-sm flex items-center gap-2 disabled:opacity-60">
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add
              </button>
            </form>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Your quote numbers are saved on this device so you can compare them anytime.
            </p>
          </div>

          {/* Empty state */}
          {refs.length === 0 && (
            <div className="text-center py-16 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-extrabold text-gray-900 mb-2">No saved quotes yet</h3>
              <p className="text-sm text-gray-500 mb-6">
                Add a quote number above to track it, or request a new quote from the shop or any product page.
              </p>
              <a href="/shop"
                className="inline-flex items-center gap-2 px-5 py-2.5 brand-gradient text-white font-bold rounded-xl text-sm">
                Browse products <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          )}

          {/* Comparison grid */}
          {refs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {refs.map((num) => {
                const q = quotes[num];
                const isLoading = loading[num];
                const isBest = num === cheapest && quotedOnes.length > 1;
                return (
                  <motion.div key={num}
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    className={`relative bg-white rounded-2xl border-2 p-5 ${isBest ? 'border-green-300 shadow-lg shadow-green-100' : 'border-gray-100'}`}>

                    {isBest && (
                      <span className="absolute -top-2.5 left-5 px-2.5 py-0.5 rounded-full bg-green-600 text-white text-[11px] font-bold">
                        Lowest quote
                      </span>
                    )}

                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-xs text-gray-400 font-semibold">Quote</p>
                        <p className="font-mono font-extrabold text-gray-900">{num}</p>
                      </div>
                      <button onClick={() => removeQuote(num)} aria-label="Remove quote"
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {isLoading && (
                      <div className="py-10 flex justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                      </div>
                    )}

                    {!isLoading && q?.error && (
                      <div className="py-6 text-center">
                        <XCircle className="h-7 w-7 text-red-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Couldn't load this quote.</p>
                        <button onClick={() => fetchQuote(num)} className="text-xs text-blue-600 font-bold mt-1">Retry</button>
                      </div>
                    )}

                    {!isLoading && q && !q.error && (
                      <>
                        <div className="mb-3"><StatusBadge status={q.status} /></div>

                        {/* Totals */}
                        <div className="rounded-xl bg-gray-50 p-3 mb-3 space-y-1.5">
                          <Row label="Items" value={`${q.items?.length || 0}`} icon={Package} />
                          {q.quotedSubtotal != null && <Row label="Subtotal" value={money(q.quotedSubtotal)} />}
                          {q.quotedGst != null && <Row label="GST" value={money(q.quotedGst)} />}
                          {q.quotedShipping != null && <Row label="Shipping" value={money(q.quotedShipping)} />}
                          <div className="pt-1.5 border-t border-gray-200 flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-900">Quoted total</span>
                            <span className="text-lg font-extrabold text-blue-700">{money(q.quotedTotal)}</span>
                          </div>
                        </div>

                        {/* Line items */}
                        {q.items?.length > 0 && (
                          <div className="mb-4 max-h-32 overflow-auto pr-1">
                            {q.items.slice(0, 5).map((it, i) => (
                              <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                                <span className="text-gray-600 truncate pr-2">{it.productName} × {it.quantity}</span>
                                <span className="text-gray-400 shrink-0">{it.quotedUnitPrice != null ? money(it.quotedUnitPrice) : '—'}</span>
                              </div>
                            ))}
                            {q.items.length > 5 && <p className="text-[11px] text-gray-400 pt-1">+{q.items.length - 5} more</p>}
                          </div>
                        )}

                        {/* Quote validity countdown */}
                        {q.status === 'QUOTED' && q.quoteValidUntil && (() => {
                          const d = daysLeft(q);
                          if (d == null) return null;
                          if (d < 0) return (
                            <div className="mb-3 text-xs font-semibold text-gray-500 bg-gray-100 rounded-lg px-3 py-2 flex items-center gap-1.5">
                              <XCircle className="h-3.5 w-3.5" /> This quote expired on {new Date(q.quoteValidUntil).toLocaleDateString('en-IN')}
                            </div>
                          );
                          const urgent = d <= 3;
                          return (
                            <div className={`mb-3 text-xs font-semibold rounded-lg px-3 py-2 flex items-center gap-1.5 ${urgent ? 'text-amber-700 bg-amber-50' : 'text-gray-500 bg-gray-50'}`}>
                              <Clock className="h-3.5 w-3.5" />
                              {d === 0 ? 'Valid until end of today' : `Valid for ${d} more day${d === 1 ? '' : 's'}`}
                              <span className="text-gray-400 font-normal">· until {new Date(q.quoteValidUntil).toLocaleDateString('en-IN')}</span>
                            </div>
                          );
                        })()}

                        {/* Actions */}
                        {q.status === 'QUOTED' && !isExpired(q) && (
                          <div className="space-y-2">
                            <button onClick={() => acceptQuote(num)} disabled={accepting === num}
                              className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-colors">
                              {accepting === num ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                              Accept this quote
                            </button>
                            <button onClick={() => rejectQuote(num)} disabled={accepting === num}
                              className="w-full py-2 bg-white hover:bg-gray-50 text-gray-500 hover:text-red-600 font-semibold rounded-xl text-xs border border-gray-200 hover:border-red-200 flex items-center justify-center gap-1.5 disabled:opacity-60 transition-colors">
                              <XCircle className="h-3.5 w-3.5" /> Decline
                            </button>
                          </div>
                        )}
                        {q.status === 'QUOTED' && isExpired(q) && (
                          <a href="/contact"
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
                            Request a fresh quote
                          </a>
                        )}
                        {q.status === 'ACCEPTED' && (
                          <div className="w-full py-2.5 bg-green-50 text-green-700 font-bold rounded-xl text-sm flex items-center justify-center gap-2">
                            <CheckCircle2 className="h-4 w-4" /> Accepted
                          </div>
                        )}
                        {q.status === 'REJECTED' && (
                          <div className="w-full py-2.5 bg-gray-50 text-gray-500 font-bold rounded-xl text-sm flex items-center justify-center gap-2">
                            <XCircle className="h-4 w-4" /> Declined
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Comparison hint */}
          {quotedOnes.length > 1 && (
            <p className="text-center text-sm text-gray-500 mt-8">
              Comparing {quotedOnes.length} quotes — the lowest quoted total is highlighted in green.
            </p>
          )}
        </div>
      </section>
    </>
  );
};

const Row = ({ label, value, icon: Icon }) => (
  <div className="flex items-center justify-between text-xs">
    <span className="text-gray-500 flex items-center gap-1.5">
      {Icon && <Icon className="h-3.5 w-3.5 text-gray-400" />}{label}
    </span>
    <span className="font-semibold text-gray-700">{value}</span>
  </div>
);

// Saved quotes are account data, so the page is gated rather than merely hidden.
const GuardedSavedQuotesPage = () => (
  <RequireAuth
    title="Sign in to see your saved quotes"
    message="Your saved quotations are tied to your account so you can pick them up on any device.">
    <SavedQuotesPage />
  </RequireAuth>
);

export default GuardedSavedQuotesPage;
