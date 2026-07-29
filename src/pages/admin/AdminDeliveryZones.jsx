/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 | navgrow.org | info@navgrow.org
 *
 * PROPRIETARY & CONFIDENTIAL — Navgrow Engineering Platform v1.0
 * Unauthorised copying or distribution is strictly prohibited.
 */
/**
 * Admin → Delivery Zones
 *
 * Zones are matched on pincode prefix, longest match winning, so a specific rule
 * ('734' for Siliguri) always beats a broad one ('7' for the eastern region).
 * The tester at the top resolves a real pincode through the live rules, which is
 * the only reliable way to confirm a new prefix does what you expect before it
 * starts quoting customers.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Truck, Save, Trash2, RefreshCw, Loader2, Plus, Search, Info, AlertTriangle,
} from 'lucide-react';
import { deliveryApi } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

const BLANK = {
  name: '', pincodePrefixes: '', serviceable: true, baseCharge: 0, freeAbove: '',
  etaMinDays: 3, etaMaxDays: 7, codAvailable: false, codCharge: 0,
  expressAvailable: false, expressCharge: 0, expressEtaDays: '', priority: 0, note: '', active: true,
};

const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

const AdminDeliveryZones = () => {
  const { toast } = useToast();
  const [zones, setZones]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(null);
  const [draft, setDraft]     = useState(BLANK);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [testPin, setTestPin] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await deliveryApi.zones();
      setZones(Array.isArray(data) ? data : []);
    } catch (e) {
      toast({ title: 'Could not load zones', description: e.response?.data?.message, variant: 'destructive' });
    } finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const edit = (id, k, v) => setZones(zs => zs.map(z => (z.id === id ? { ...z, [k]: v } : z)));

  const payload = (z) => ({
    name: z.name,
    pincodePrefixes: z.pincodePrefixes,
    serviceable: !!z.serviceable,
    baseCharge: num(z.baseCharge) ?? 0,
    freeAbove: num(z.freeAbove),
    etaMinDays: num(z.etaMinDays) ?? 3,
    etaMaxDays: num(z.etaMaxDays) ?? 7,
    codAvailable: !!z.codAvailable,
    codCharge: num(z.codCharge) ?? 0,
    expressAvailable: !!z.expressAvailable,
    expressCharge: num(z.expressCharge) ?? 0,
    expressEtaDays: num(z.expressEtaDays),
    priority: num(z.priority) ?? 0,
    note: z.note || null,
    active: z.active !== false,
  });

  const save = async (z) => {
    setSaving(z.id);
    try {
      await deliveryApi.updateZone(z.id, payload(z));
      toast({ title: `Saved ${z.name}` });
      load();
    } catch (e) {
      toast({ title: 'Save failed', description: e.response?.data?.message, variant: 'destructive' });
    } finally { setSaving(null); }
  };

  const create = async () => {
    if (!draft.name.trim() || !draft.pincodePrefixes.trim()) {
      toast({ title: 'Name and pincode prefixes are required', variant: 'destructive' }); return;
    }
    setSaving('new');
    try {
      await deliveryApi.createZone(payload(draft));
      toast({ title: `Added ${draft.name}` });
      setDraft(BLANK); setShowAdd(false); load();
    } catch (e) {
      toast({ title: 'Could not add zone', description: e.response?.data?.message, variant: 'destructive' });
    } finally { setSaving(null); }
  };

  const remove = async () => {
    try {
      await deliveryApi.deleteZone(confirmDel.id);
      toast({ title: 'Zone deleted' });
      setConfirmDel(null); load();
    } catch (e) {
      toast({ title: 'Delete failed', description: e.response?.data?.message, variant: 'destructive' });
    }
  };

  const runTest = async () => {
    if (!/^[1-9][0-9]{5}$/.test(testPin.trim())) {
      toast({ title: 'Enter a valid 6-digit pincode', variant: 'destructive' }); return;
    }
    setTesting(true);
    try {
      const { data } = await deliveryApi.testZone(testPin.trim(), 0);
      setTestResult(data);
    } catch {
      toast({ title: 'Test failed', variant: 'destructive' });
    } finally { setTesting(false); }
  };

  const Num = ({ label, value, onChange, span = 'md:col-span-1', placeholder }) => (
    <div className={span}>
      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{label}</label>
      <input type="number" value={value ?? ''} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full px-2.5 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500" />
    </div>
  );

  return (
    <div className="p-4 sm:p-6">
      {confirmDel && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-gray-800 rounded-2xl border border-gray-700 p-6 max-w-sm w-full">
            <div className="w-12 h-12 rounded-full bg-red-900/50 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            <p className="text-white font-semibold text-center mb-1">Delete this zone?</p>
            <p className="text-gray-400 text-sm text-center mb-5">
              {confirmDel.name} — pincodes it covered will fall through to a broader zone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDel(null)} className="flex-1 py-2.5 bg-gray-700 text-gray-300 rounded-xl text-sm">Cancel</button>
              <button onClick={remove} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm">Delete</button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Truck className="h-6 w-6 text-amber-400" /> Delivery Zones
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Serviceability, charges and delivery times by pincode</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 px-3.5 py-2 bg-gray-800 border border-gray-700 text-gray-200 rounded-xl text-sm hover:bg-gray-700">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button onClick={() => setShowAdd(v => !v)} className="flex items-center gap-2 px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold">
            <Plus className="h-4 w-4" /> Add zone
          </button>
        </div>
      </div>

      <div className="flex items-start gap-2 bg-blue-950/40 border border-blue-900 text-blue-200 text-sm rounded-xl px-4 py-3 mb-4">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <div className="space-y-1.5">
          <p>
            Prefixes are comma-separated, e.g. <span className="font-mono">70,71,72</span>. The
            <strong> longest matching prefix wins</strong>, so <span className="font-mono">734</span> overrides
            <span className="font-mono"> 73</span>.
          </p>
          <p>
            <strong>To control a single pincode</strong>, add a zone whose prefix is the full six digits
            (e.g. <span className="font-mono">700091</span>). Being the longest match, it overrides every
            broader rule — use it to grant free delivery to a key account, or switch COD off for one area.
          </p>
          <p className="text-blue-300/90">
            <strong>Free above:</strong> <span className="font-mono">0</span> = always free ·
            a value = free at or above that order total · <em>blank</em> = never free.
            Use the tester below to confirm a pincode resolves the way you expect.
          </p>
        </div>
      </div>

      {/* Pincode tester */}
      <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-4 mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Test a pincode</label>
            <input value={testPin} onChange={e => setTestPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={e => { if (e.key === 'Enter') runTest(); }}
              placeholder="734001"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500" />
          </div>
          <button onClick={runTest} disabled={testing}
            className="inline-flex items-center gap-2 px-4 py-2 brand-gradient text-white rounded-xl text-sm font-bold disabled:opacity-60">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Resolve
          </button>
          {testResult && (
            <div className={`flex-1 min-w-[240px] text-sm rounded-xl px-3 py-2 border ${
              testResult.serviceable ? 'bg-green-950/40 border-green-900 text-green-200'
                                     : 'bg-red-950/40 border-red-900 text-red-200'}`}>
              {testResult.serviceable
                ? <>Matched <strong>{testResult.zone}</strong> · {Number(testResult.standardCharge) === 0 ? 'free' : `₹${testResult.standardCharge}`} · {testResult.estimatedBy}</>
                : <>Not serviceable{testResult.zone ? <> — matched <strong>{testResult.zone}</strong></> : ''}</>}
            </div>
          )}
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-gray-800/60 border border-green-800 rounded-2xl p-4 mb-6">
          <h2 className="text-sm font-bold text-white mb-3">New zone</h2>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Name</label>
              <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                className="w-full px-2.5 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white" />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Pincode prefixes</label>
              <input value={draft.pincodePrefixes} onChange={e => setDraft(d => ({ ...d, pincodePrefixes: e.target.value }))}
                placeholder="70,71,72"
                className="w-full px-2.5 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white font-mono" />
            </div>
            <Num label="Charge ₹" value={draft.baseCharge} onChange={v => setDraft(d => ({ ...d, baseCharge: v }))} />
            <Num label="Free above ₹" value={draft.freeAbove} onChange={v => setDraft(d => ({ ...d, freeAbove: v }))} placeholder="blank = never" />
            <Num label="ETA min" value={draft.etaMinDays} onChange={v => setDraft(d => ({ ...d, etaMinDays: v }))} />
            <Num label="ETA max" value={draft.etaMaxDays} onChange={v => setDraft(d => ({ ...d, etaMaxDays: v }))} />
            <Num label="Priority" value={draft.priority} onChange={v => setDraft(d => ({ ...d, priority: v }))} />
            <div className="col-span-2 flex items-end gap-3 text-xs text-gray-300">
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={draft.serviceable} onChange={e => setDraft(d => ({ ...d, serviceable: e.target.checked }))} /> Serviceable</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={draft.codAvailable} onChange={e => setDraft(d => ({ ...d, codAvailable: e.target.checked }))} /> COD</label>
            </div>
            <div className="col-span-2 flex items-end">
              <button onClick={create} disabled={saving === 'new'}
                className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold disabled:opacity-60">
                {saving === 'new' ? 'Adding…' : 'Add zone'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zone list */}
      <div className="space-y-3">
        {loading
          ? [...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-800 animate-pulse rounded-2xl" />)
          : zones.map(z => (
            <div key={z.id} className={`bg-gray-800/60 border rounded-2xl p-4 ${z.serviceable ? 'border-gray-700' : 'border-red-900/60'}`}>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Name</label>
                  <input value={z.name} onChange={e => edit(z.id, 'name', e.target.value)}
                    className="w-full px-2.5 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Pincode prefixes</label>
                  <input value={z.pincodePrefixes} onChange={e => edit(z.id, 'pincodePrefixes', e.target.value)}
                    className="w-full px-2.5 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white font-mono" />
                </div>
                <Num label="Charge ₹"    value={z.baseCharge}   onChange={v => edit(z.id, 'baseCharge', v)} />
                <Num label="Free above ₹" value={z.freeAbove}   onChange={v => edit(z.id, 'freeAbove', v)} placeholder="blank=never, 0=always" />
                <Num label="ETA min"     value={z.etaMinDays}   onChange={v => edit(z.id, 'etaMinDays', v)} />
                <Num label="ETA max"     value={z.etaMaxDays}   onChange={v => edit(z.id, 'etaMaxDays', v)} />
                <Num label="COD ₹"       value={z.codCharge}    onChange={v => edit(z.id, 'codCharge', v)} />
                <Num label="Express ₹"   value={z.expressCharge} onChange={v => edit(z.id, 'expressCharge', v)} />
                <Num label="Express days" value={z.expressEtaDays} onChange={v => edit(z.id, 'expressEtaDays', v)} />
                <Num label="Priority"    value={z.priority}     onChange={v => edit(z.id, 'priority', v)} />
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Note shown to buyers</label>
                  <input value={z.note || ''} onChange={e => edit(z.id, 'note', e.target.value)}
                    className="w-full px-2.5 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white" />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-gray-700 text-xs text-gray-300">
                <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!z.serviceable} onChange={e => edit(z.id, 'serviceable', e.target.checked)} /> Serviceable</label>
                <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!z.codAvailable} onChange={e => edit(z.id, 'codAvailable', e.target.checked)} /> COD</label>
                <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!z.expressAvailable} onChange={e => edit(z.id, 'expressAvailable', e.target.checked)} /> Express</label>
                <label className="flex items-center gap-1.5"><input type="checkbox" checked={z.active !== false} onChange={e => edit(z.id, 'active', e.target.checked)} /> Active</label>
                <div className="ml-auto flex gap-2">
                  <button onClick={() => save(z)} disabled={saving === z.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 brand-gradient text-white rounded-lg text-xs font-bold disabled:opacity-60">
                    {saving === z.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
                  </button>
                  <button onClick={() => setConfirmDel(z)} aria-label={`Delete ${z.name}`}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-red-900/60 text-gray-300 rounded-lg">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default AdminDeliveryZones;
