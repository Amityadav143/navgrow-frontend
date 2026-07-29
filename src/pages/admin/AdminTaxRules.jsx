/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 | navgrow.org | info@navgrow.org
 *
 * PROPRIETARY & CONFIDENTIAL — Navgrow Engineering Platform v1.0
 * Unauthorised copying or distribution is strictly prohibited.
 */
/**
 * Admin → Tax Rules
 *
 * GST is not one rate across the catalogue — protective garments sit at 12%
 * while tooling and instruments sit at 18% — so the office sets the HSN/SAC
 * code and rate per category here. New and bulk-imported products inherit the
 * rule for their category; a product with its own code always keeps it.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Percent, Plus, Save, Trash2, RefreshCw, Loader2, AlertCircle, CheckCircle, Info,
} from 'lucide-react';
import { taxRulesApi } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

const GST_SLABS = ['0', '5', '12', '18', '28'];
const BLANK = { category: '', hsnCode: '', gstRate: '18', description: '', active: true };

const AdminTaxRules = () => {
  const { toast } = useToast();
  const [rules, setRules]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [draft, setDraft]     = useState(BLANK);
  const [saving, setSaving]   = useState(null);   // id | 'new'
  const [confirmDel, setConfirmDel] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data } = await taxRulesApi.list();
      setRules(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load tax rules.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const editField = (id, key, value) =>
    setRules(rs => rs.map(r => (r.id === id ? { ...r, [key]: value } : r)));

  const saveRule = async (rule) => {
    setSaving(rule.id);
    try {
      await taxRulesApi.update(rule.id, {
        category: rule.category,
        hsnCode: rule.hsnCode || null,
        gstRate: Number(rule.gstRate),
        description: rule.description || null,
        active: rule.active !== false,
      });
      toast({ title: `Saved ${rule.category}` });
      load();
    } catch (e) {
      toast({ title: 'Save failed', description: e.response?.data?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const createRule = async () => {
    if (!draft.category.trim()) { toast({ title: 'Category is required', variant: 'destructive' }); return; }
    setSaving('new');
    try {
      await taxRulesApi.create({
        category: draft.category.trim(),
        hsnCode: draft.hsnCode || null,
        gstRate: Number(draft.gstRate),
        description: draft.description || null,
        active: true,
      });
      toast({ title: `Added ${draft.category.trim()}` });
      setDraft(BLANK);
      load();
    } catch (e) {
      toast({ title: 'Could not add rule', description: e.response?.data?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const removeRule = async () => {
    if (!confirmDel) return;
    try {
      await taxRulesApi.remove(confirmDel.id);
      toast({ title: 'Rule deleted' });
      setConfirmDel(null);
      load();
    } catch (e) {
      toast({ title: 'Delete failed', description: e.response?.data?.message || 'Please try again.', variant: 'destructive' });
    }
  };

  const applyRule = async (rule, onlyMissing) => {
    setSaving(rule.id);
    try {
      const { data } = await taxRulesApi.apply(rule.id, onlyMissing);
      toast({
        title: `${data.updated} of ${data.matched} product${data.matched === 1 ? '' : 's'} updated`,
        description: onlyMissing ? 'Only products without their own code were changed.'
                                 : 'Every product in this category now uses this rule.',
      });
    } catch (e) {
      toast({ title: 'Could not apply', description: e.response?.data?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      {confirmDel && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-gray-800 rounded-2xl border border-gray-700 p-6 max-w-sm w-full">
            <p className="text-white font-semibold text-center mb-1">Delete this tax rule?</p>
            <p className="text-gray-400 text-sm text-center mb-5">
              {confirmDel.category} — products keep their current codes; only the default is removed.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDel(null)} className="flex-1 py-2.5 bg-gray-700 text-gray-300 rounded-xl text-sm">Cancel</button>
              <button onClick={removeRule} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm">Delete</button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Percent className="h-6 w-6 text-amber-400" /> Tax Rules
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">HSN/SAC code and GST rate for each product category</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3.5 py-2 bg-gray-800 border border-gray-700 text-gray-200 rounded-xl text-sm hover:bg-gray-700">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="flex items-start gap-2 bg-blue-950/40 border border-blue-900 text-blue-200 text-sm rounded-xl px-4 py-3 mb-6">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <p>
          A product's own HSN code always takes priority. These rules fill in the gaps for new and
          bulk-imported products, and let you push a rate change across a whole category.
          Have your tax advisor confirm any code before billing on it.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-950/40 border border-red-900 text-red-300 text-sm rounded-xl px-4 py-3 mb-4">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}

      {/* Existing rules */}
      <div className="space-y-3">
        {loading
          ? [...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-800 animate-pulse rounded-2xl" />)
          : rules.length === 0
            ? (
              <div className="text-center py-14 text-gray-500 bg-gray-800/40 rounded-2xl border border-gray-800">
                <Percent className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="font-semibold">No tax rules yet</p>
                <p className="text-sm mt-1">Add one below to set a default rate for a category.</p>
              </div>
            )
            : rules.map(r => (
              <div key={r.id} className="bg-gray-800/60 border border-gray-700 rounded-2xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Category</label>
                    <input value={r.category} onChange={e => editField(r.id, 'category', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">HSN / SAC</label>
                    <input value={r.hsnCode || ''} onChange={e => editField(r.id, 'hsnCode', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">GST Rate</label>
                    <select value={String(Number(r.gstRate))} onChange={e => editField(r.id, 'gstRate', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500">
                      {GST_SLABS.map(s => <option key={s} value={s}>{s}%</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Note</label>
                    <input value={r.description || ''} onChange={e => editField(r.id, 'description', e.target.value)}
                      placeholder="What this covers"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500" />
                  </div>
                  <div className="md:col-span-2 flex gap-2">
                    <button onClick={() => saveRule(r)} disabled={saving === r.id}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 brand-gradient text-white rounded-xl text-sm font-bold disabled:opacity-60">
                      {saving === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
                    </button>
                    <button onClick={() => setConfirmDel(r)} aria-label={`Delete rule for ${r.category}`}
                      className="px-3 py-2 bg-gray-700 hover:bg-red-900/60 text-gray-300 rounded-xl">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-700">
                  <span className="text-xs text-gray-400">Apply to products in this category:</span>
                  <button onClick={() => applyRule(r, true)} disabled={saving === r.id}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-xs font-semibold disabled:opacity-60">
                    Fill missing only
                  </button>
                  <button onClick={() => applyRule(r, false)} disabled={saving === r.id}
                    className="px-3 py-1.5 bg-amber-900/50 hover:bg-amber-900 text-amber-200 rounded-lg text-xs font-semibold disabled:opacity-60">
                    Overwrite all
                  </button>
                </div>
              </div>
            ))}
      </div>

      {/* Add a rule */}
      <div className="mt-6 bg-gray-800/60 border border-gray-700 rounded-2xl p-4">
        <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4 text-green-400" /> Add a category rule
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Category</label>
            <input value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))}
              placeholder="e.g. Electrical Fittings"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">HSN / SAC</label>
            <input value={draft.hsnCode} onChange={e => setDraft(d => ({ ...d, hsnCode: e.target.value }))}
              placeholder="8536"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">GST Rate</label>
            <select value={draft.gstRate} onChange={e => setDraft(d => ({ ...d, gstRate: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500">
              {GST_SLABS.map(s => <option key={s} value={s}>{s}%</option>)}
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Note</label>
            <input value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
              placeholder="What this covers"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500" />
          </div>
          <div className="md:col-span-2">
            <button onClick={createRule} disabled={saving === 'new'}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold disabled:opacity-60">
              {saving === 'new' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTaxRules;
