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
/**
 * Admin → Catalogue Leads
 * Every visitor who downloads the company catalogue is captured here with the
 * name, mobile, email and requirement they provided. The sales team can filter
 * by status, follow up, and move a lead through its lifecycle.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileDown, Mail, Phone, Building2, MapPin, Clock, Trash2, X,
  CheckCircle, User, MessageSquare, TrendingUp, Users, Download, AlertTriangle,
} from 'lucide-react';
import { catalogueApi } from '@/lib/api';
import { usePaginated, useMutation } from '@/hooks/useApi';
import { useToast } from '@/components/ui/use-toast';

const STATUS_COLORS = {
  NEW: 'bg-blue-100 text-blue-700',
  CONTACTED: 'bg-amber-100 text-amber-700',
  QUALIFIED: 'bg-violet-100 text-violet-700',
  CONVERTED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-600',
};
const STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'CLOSED'];

const fmtDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '' : dt.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const StatCard = ({ icon: Icon, label, value, tint }) => (
  <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-4 flex items-center gap-3">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tint}`}>
      <Icon className="h-5 w-5" />
    </div>
    <div className="min-w-0">
      <p className="text-2xl font-extrabold text-white leading-none">{value ?? '—'}</p>
      <p className="text-[11px] text-gray-400 mt-1">{label}</p>
    </div>
  </div>
);

const AdminCatalogueLeads = () => {
  const { toast } = useToast();
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState('');
  const [confirmDel, setConfirmDel] = useState(null);
  const [stats, setStats] = useState(null);

  const { items, loading, setFilter, refetch } = usePaginated(catalogueApi.listLeads);
  const [updateLead, { loading: updating }] = useMutation(catalogueApi.updateLead);
  const [removeLead] = useMutation(catalogueApi.deleteLead);

  const loadStats = useCallback(() => {
    catalogueApi.leadStats().then((r) => setStats(r.data)).catch(() => {});
  }, []);
  useEffect(() => { loadStats(); }, [loadStats]);

  const handleStatus = async (id, status) => {
    const res = await updateLead(id, { status, notes: notes || undefined });
    if (res.error) { toast({ title: 'Failed', description: res.error, variant: 'destructive' }); return; }
    toast({ title: `Lead marked ${status.toLowerCase()}` });
    refetch(); loadStats();
    setSelected((s) => (s ? { ...s, status } : s));
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    const res = await removeLead(confirmDel.id);
    if (res.error) { toast({ title: 'Failed', description: res.error, variant: 'destructive' }); return; }
    toast({ title: 'Lead deleted' });
    setConfirmDel(null); setSelected(null); refetch(); loadStats();
  };

  const exportCsv = () => {
    if (!items.length) { toast({ title: 'Nothing to export' }); return; }
    const head = ['Name', 'Mobile', 'Email', 'Company', 'City', 'Requirement', 'Status', 'Date'];
    const rows = items.map((l) => [l.name, l.mobile, l.email, l.company || '', l.city || '',
      (l.requirement || '').replace(/\s+/g, ' '), l.status, fmtDate(l.createdAt)]);
    const csv = [head, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `navgrow-catalogue-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="p-6">
      {/* Delete confirmation */}
      <AnimatePresence>
        {confirmDel && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
              className="bg-gray-800 rounded-2xl border border-gray-700 p-6 max-w-sm w-full shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-red-900/50 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <p className="text-white font-semibold text-center mb-1">Delete this lead?</p>
              <p className="text-gray-400 text-sm text-center mb-5">{confirmDel.name} · {confirmDel.email}</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDel(null)} className="flex-1 py-2.5 bg-gray-700 text-gray-300 rounded-xl text-sm">Cancel</button>
                <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <FileDown className="h-6 w-6 text-amber-400" /> Catalogue Leads
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">People who downloaded the company catalogue</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv}
            className="flex items-center gap-2 px-3.5 py-2 bg-gray-800 border border-gray-700 text-gray-200 rounded-xl text-sm hover:bg-gray-700">
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <select onChange={(e) => setFilter('status', e.target.value || undefined)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white focus:outline-none">
            <option value="">All Status</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Users} label="Total leads" value={stats?.total} tint="bg-blue-900/50 text-blue-300" />
        <StatCard icon={TrendingUp} label="Last 7 days" value={stats?.last7Days} tint="bg-amber-900/50 text-amber-300" />
        <StatCard icon={Clock} label="New / unactioned" value={stats?.new} tint="bg-violet-900/50 text-violet-300" />
        <StatCard icon={CheckCircle} label="Converted" value={stats?.converted} tint="bg-green-900/50 text-green-300" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* List */}
        <div className="space-y-3">
          {loading
            ? [...Array(5)].map((_, i) => <div key={i} className="h-20 bg-gray-800 animate-pulse rounded-2xl" />)
            : items.length === 0
              ? (
                <div className="text-center py-16 text-gray-500 bg-gray-800/40 rounded-2xl border border-gray-800">
                  <FileDown className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="font-semibold">No catalogue leads yet</p>
                  <p className="text-sm mt-1">They'll appear here as visitors download the catalogue.</p>
                </div>
              )
              : items.map((l) => (
                <button key={l.id} onClick={() => { setSelected(l); setNotes(l.adminNotes || ''); }}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${selected?.id === l.id ? 'border-amber-500 bg-amber-950/30' : 'border-gray-800 bg-gray-800/50 hover:border-amber-400'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{l.name}</p>
                      <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{l.mobile}</span>
                        <span className="inline-flex items-center gap-1 truncate"><Mail className="h-3 w-3" />{l.email}</span>
                      </p>
                      {l.requirement && <p className="text-gray-500 text-xs mt-1.5 line-clamp-1">{l.requirement}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${STATUS_COLORS[l.status] || 'bg-gray-100 text-gray-600'}`}>{l.status}</span>
                      <span className="text-[10px] text-gray-500">{fmtDate(l.createdAt)}</span>
                    </div>
                  </div>
                </button>
              ))}
        </div>

        {/* Detail */}
        <div className="lg:sticky lg:top-6 self-start">
          {selected ? (
            <motion.div key={selected.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="brand-gradient text-white px-5 py-4 flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-lg leading-tight">{selected.name}</h3>
                  <p className="text-white/80 text-xs mt-0.5">Lead · {fmtDate(selected.createdAt)}</p>
                </div>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-white/20"><X className="h-4 w-4" /></button>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    [User, 'Name', selected.name],
                    [Phone, 'Mobile', selected.mobile],
                    [Mail, 'Email', selected.email],
                    [Building2, 'Company', selected.company || '—'],
                    [MapPin, 'City', selected.city || '—'],
                  ].map(([Icon, label, val]) => (
                    <div key={label} className="flex items-start gap-2.5">
                      <Icon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">{label}</p>
                        <p className="text-sm text-gray-900 break-words">{val}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Requirement</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 whitespace-pre-wrap">{selected.requirement || '—'}</p>
                </div>

                {/* quick actions */}
                <div className="flex flex-wrap gap-2">
                  <a href={`tel:${selected.mobile}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100"><Phone className="h-3.5 w-3.5" /> Call</a>
                  <a href={`https://wa.me/${selected.mobile.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-100">WhatsApp</a>
                  <a href={`mailto:${selected.email}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-700 rounded-lg text-xs font-semibold hover:bg-violet-100"><Mail className="h-3.5 w-3.5" /> Email</a>
                </div>

                {/* notes */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Internal Notes</p>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                    placeholder="Add a follow-up note…"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-y" />
                </div>

                {/* status */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Update Status</p>
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.map((s) => (
                      <button key={s} disabled={updating} onClick={() => handleStatus(selected.id, s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${selected.status === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <button onClick={() => setConfirmDel(selected)}
                    className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-semibold">
                    <Trash2 className="h-3.5 w-3.5" /> Delete lead
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="hidden lg:flex flex-col items-center justify-center text-center py-20 text-gray-500 bg-gray-800/40 rounded-2xl border border-gray-800">
              <FileDown className="h-12 w-12 mb-3 opacity-20" />
              <p className="font-semibold">Select a lead</p>
              <p className="text-sm mt-1">Choose a lead on the left to view details and follow up.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCatalogueLeads;
