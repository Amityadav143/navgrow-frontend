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
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit2, Trash2, Tag, ToggleLeft, ToggleRight, X,
  CheckCircle, AlertCircle, Copy, Check, Search, AlertTriangle,
  Calendar,
} from 'lucide-react';
import { couponsApi } from '@/lib/api';
import { usePaginated, useMutation } from '@/hooks/useApi';
import { useToast } from '@/components/ui/use-toast';

const TYPES = [
  { value: 'PERCENTAGE', label: '% Percentage off' },
  { value: 'FLAT',       label: '₹ Flat amount off' },
  { value: 'FREE_SHIP',  label: '🚚 Free shipping' },
];

/* ── Confirm dialog ──────────────────────────────────────────────────────── */
const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
    <motion.div initial={{scale:.9,opacity:0}} animate={{scale:1,opacity:1}}
      className="bg-gray-800 rounded-2xl border border-gray-700 p-6 max-w-sm w-full shadow-2xl">
      <div className="w-12 h-12 rounded-full bg-red-900/50 flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="h-6 w-6 text-red-400"/>
      </div>
      <p className="text-white font-semibold text-center mb-5">{message}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2.5 bg-gray-700 text-gray-300 rounded-xl font-semibold text-sm">Cancel</button>
        <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm">Confirm</button>
      </div>
    </motion.div>
  </div>
);

/* ── DateInput — shows calendar picker  ─────────────────────────────────── */
const DateInput = ({ label, value, onChange }) => (
  <div>
    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
      <Calendar className="inline h-3 w-3 mr-1"/>{label}
    </label>
    <input type="date" value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white
                 focus:outline-none focus:border-blue-500 [color-scheme:dark]"/>
  </div>
);

/* ── CouponInput — DEFINED OUTSIDE to prevent cursor-jump bug ─────────── */
const CouponInput = ({ label, fieldKey, type='text', required, placeholder, form, onChange }) => (
  <div>
    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
      {label}{required && <span className="text-red-400 ml-1">*</span>}
    </label>
    <input
      required={required}
      type={type}
      value={form[fieldKey] ?? ''}
      onChange={e => onChange(fieldKey, e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white
                 focus:outline-none focus:border-blue-500 placeholder-gray-600"
    />
  </div>
);

/* ── Coupon form ─────────────────────────────────────────────────────────── */
const CouponForm = ({ initial, onSave, onCancel, saving }) => {
  const [form, setForm] = useState(initial ? {
    code:        initial.code || '',
    description: initial.description || '',
    couponType:  initial.couponType || 'PERCENTAGE',
    value:       initial.value?.toString() || '',
    minOrder:    initial.minOrderAmount?.toString() || '',
    maxDiscount: initial.maxDiscount?.toString() || '',
    usageLimit:  initial.usageLimit?.toString() || '',
    validFrom:   initial.validFrom ? initial.validFrom.slice(0,10) : '',
    validUntil:  initial.validUntil ? initial.validUntil.slice(0,10) : '',
    active:      initial.active ?? true,
  } : {
    code:'', description:'', couponType:'PERCENTAGE', value:'', minOrder:'',
    maxDiscount:'', usageLimit:'', validFrom:'', validUntil:'', active:true,
  });

  const handleChange = useCallback((key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const genCode = useCallback(() => {
    setForm(prev => ({ ...prev, code: 'NG' + Math.random().toString(36).slice(2,8).toUpperCase() }));
  }, []);

  return (
    <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}}
      className="bg-gray-800 rounded-2xl border border-amber-700/50 p-5 mb-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white text-lg flex items-center gap-2">
          <Tag className="h-5 w-5 text-amber-400"/>{initial ? 'Edit Coupon' : 'Create Coupon'}
        </h3>
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400"><X className="h-4 w-4"/></button>
      </div>

      <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Code + Generate */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Coupon Code *</label>
            <div className="flex gap-2">
              <input required value={form.code}
                onChange={e => handleChange('code', e.target.value.toUpperCase())}
                placeholder="NAVGROW10"
                style={{ textTransform:'uppercase' }}
                className="flex-1 px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white
                           font-mono uppercase focus:outline-none focus:border-blue-500 placeholder-gray-600"/>
              <button type="button" onClick={genCode}
                className="px-3 py-2.5 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-500 whitespace-nowrap">
                Generate
              </button>
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Discount Type *</label>
            <select value={form.couponType} onChange={e => handleChange('couponType', e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none">
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {form.couponType !== 'FREE_SHIP' && (
            <CouponInput label={form.couponType==='PERCENTAGE'?'Discount %':'Flat Amount (₹)'} fieldKey="value"
              type="number" required placeholder={form.couponType==='PERCENTAGE'?'10':'200'}
              form={form} onChange={handleChange}/>
          )}

          <CouponInput label="Min Order Amount (₹)" fieldKey="minOrder" type="number"
            placeholder="2000 (blank=no minimum)" form={form} onChange={handleChange}/>

          {form.couponType === 'PERCENTAGE' && (
            <CouponInput label="Max Discount Cap (₹)" fieldKey="maxDiscount" type="number"
              placeholder="500" form={form} onChange={handleChange}/>
          )}

          <CouponInput label="Usage Limit (total)" fieldKey="usageLimit" type="number"
            placeholder="100 (blank = unlimited)" form={form} onChange={handleChange}/>

          {/* Date pickers with calendar — FIX 3 */}
          <DateInput label="Valid From" value={form.validFrom}
            onChange={v => handleChange('validFrom', v)}/>
          <DateInput label="Valid Until" value={form.validUntil}
            onChange={v => handleChange('validUntil', v)}/>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Description (internal note)</label>
            <input value={form.description} onChange={e => handleChange('description', e.target.value)}
              placeholder="e.g. First order discount for new users"
              className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white
                         focus:outline-none focus:border-blue-500 placeholder-gray-600"/>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3 p-3 bg-gray-900 rounded-xl border border-gray-700">
            <input type="checkbox" id="coupon-active" checked={form.active}
              onChange={e => handleChange('active', e.target.checked)}
              className="w-4 h-4 rounded accent-blue-500"/>
            <label htmlFor="coupon-active" className="text-sm text-gray-300 cursor-pointer font-medium">
              Active (visible to customers)
            </label>
          </div>
        </div>

        {/* Preview */}
        {form.code && (
          <div className="p-3.5 bg-amber-900/30 border border-amber-700/50 rounded-xl flex items-center gap-3">
            <Tag className="h-5 w-5 text-amber-400 shrink-0"/>
            <div>
              <p className="text-amber-300 font-bold text-sm font-mono">{form.code}</p>
              <p className="text-amber-400 text-xs mt-0.5">
                {form.couponType==='PERCENTAGE' ? `${form.value}% off` : form.couponType==='FLAT' ? `₹${form.value} off` : 'Free shipping'}
                {form.minOrder ? ` · Min ₹${form.minOrder}` : ''}
                {form.maxDiscount ? ` · Max ₹${form.maxDiscount}` : ''}
                {form.validUntil ? ` · Expires ${new Date(form.validUntil).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}` : ''}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 brand-gradient text-white font-bold rounded-xl text-sm
                       hover:opacity-90 disabled:opacity-60">
            {saving ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                    : <CheckCircle className="h-4 w-4"/>}
            {saving ? 'Saving…' : initial ? 'Update Coupon' : 'Create Coupon'}
          </button>
          <button type="button" onClick={onCancel}
            className="px-5 py-2.5 bg-gray-700 text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-600">
            Cancel
          </button>
        </div>
      </form>
    </motion.div>
  );
};

/* ── Coupon row ──────────────────────────────────────────────────────────── */
const CouponRow = ({ coupon, onEdit, onDelete, onToggle }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(coupon.code);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  const isExpired = coupon.validUntil && new Date(coupon.validUntil) < new Date();
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <code className="text-sm font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg font-mono">{coupon.code}</code>
          <button onClick={copy} className="text-gray-400 hover:text-blue-600" title="Copy">
            {copied ? <Check className="h-3.5 w-3.5 text-green-500"/> : <Copy className="h-3.5 w-3.5"/>}
          </button>
        </div>
        {coupon.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{coupon.description}</p>}
      </td>
      <td className="px-4 py-3 text-xs text-gray-700">
        {coupon.couponType==='PERCENTAGE' ? `${coupon.value}% off` : coupon.couponType==='FLAT' ? `₹${coupon.value} off` : 'Free shipping'}
        {coupon.maxDiscount ? ` (max ₹${coupon.maxDiscount})` : ''}
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">{coupon.minOrderAmount ? `₹${coupon.minOrderAmount}` : '—'}</td>
      <td className="px-4 py-3 text-xs text-gray-500">{coupon.usageCount||0}/{coupon.usageLimit||'∞'}</td>
      <td className="px-4 py-3">
        {isExpired
          ? <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-600 rounded-full">Expired</span>
          : coupon.validUntil
          ? <span className="text-xs text-gray-500">{new Date(coupon.validUntil).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>
          : <span className="text-xs text-gray-400">No expiry</span>
        }
      </td>
      <td className="px-4 py-3">
        <button onClick={() => onToggle(coupon.id)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
            coupon.active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}>
          {coupon.active ? <ToggleRight className="h-3.5 w-3.5"/> : <ToggleLeft className="h-3.5 w-3.5"/>}
          {coupon.active ? 'Active' : 'Disabled'}
        </button>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(coupon)} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100" title="Edit">
            <Edit2 className="h-3.5 w-3.5"/>
          </button>
          <button onClick={() => onDelete(coupon.id, coupon.code)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100" title="Delete">
            <Trash2 className="h-3.5 w-3.5"/>
          </button>
        </div>
      </td>
    </tr>
  );
};

/* ── Main AdminCoupons ───────────────────────────────────────────────────── */
const AdminCoupons = () => {
  const { toast } = useToast();
  const [showForm,  setShowForm]  = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [confirm,   setConfirm]   = useState(null);

  const { items, loading, refetch } = usePaginated(couponsApi.list, { size: 100 });
  const [create, { loading: creating }] = useMutation(couponsApi.create);
  const [update, { loading: updating }] = useMutation(couponsApi.update);
  const [toggle]  = useMutation(couponsApi.toggle);
  const [remove]  = useMutation(couponsApi.delete);

  const handleSave = async (form) => {
    // Build payload — convert date strings to ISO datetime expected by Spring
    const toISO = (d) => d ? `${d}T00:00:00` : null;
    const payload = {
      code:           form.code,
      description:    form.description || '',
      couponType:     form.couponType,
      value:          form.couponType !== 'FREE_SHIP' ? parseFloat(form.value) : 0,
      minOrderAmount: form.minOrder    ? parseFloat(form.minOrder)    : 0,
      maxDiscount:    form.maxDiscount ? parseFloat(form.maxDiscount) : null,
      usageLimit:     form.usageLimit  ? parseInt(form.usageLimit)    : null,
      validFrom:      toISO(form.validFrom),
      validUntil:     toISO(form.validUntil),
      active:         Boolean(form.active),
    };

    let res;
    if (editing) {
      res = await update(editing.id, payload);
    } else {
      res = await create(payload);
    }

    if (res.error) {
      toast({ title: 'Failed to save coupon', description: res.error, variant: 'destructive' });
      return;
    }
    toast({ title: editing ? '✓ Coupon updated' : '✓ Coupon created' });
    setShowForm(false); setEditing(null); refetch();
  };

  const handleToggle = async (id) => {
    await toggle(id); refetch();
  };

  const handleDelete = (id, code) => {
    setConfirm({
      msg: `Delete coupon "${code}"? This cannot be undone.`,
      onConfirm: async () => {
        await remove(id);
        toast({ title: '✓ Coupon deleted' });
        setConfirm(null); refetch();
      },
    });
  };

  const active  = items.filter(c => c.active && (!c.validUntil || new Date(c.validUntil) > new Date()));
  const expired = items.filter(c => c.validUntil && new Date(c.validUntil) <= new Date());
  const disabled= items.filter(c => !c.active);

  return (
    <div className="p-6">
      {confirm && <ConfirmDialog message={confirm.msg} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)}/>}

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Coupons & Discounts</h1>
          <p className="text-gray-400 text-sm mt-0.5">{active.length} active · {disabled.length} disabled · {expired.length} expired</p>
        </div>
        <button onClick={() => { setShowForm(f=>!f); setEditing(null); }}
          className="flex items-center gap-2 px-4 py-2 brand-gradient text-white font-bold rounded-xl text-sm hover:opacity-90">
          <Plus className="h-4 w-4"/> Create Coupon
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label:'Total Coupons',     value: items.length,                                    col:'text-blue-400' },
          { label:'Active',            value: active.length,                                   col:'text-green-400' },
          { label:'Disabled/Expired',  value: disabled.length + expired.length,                col:'text-amber-400' },
          { label:'Total Redemptions', value: items.reduce((s,c) => s+(c.usageCount||0), 0),   col:'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-800 rounded-xl p-3.5 border border-gray-700">
            <p className={`text-2xl font-extrabold ${s.col}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {(showForm || editing) && (
          <CouponForm
            initial={editing}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditing(null); }}
            saving={creating || updating}
          />
        )}
      </AnimatePresence>

      {/* Coupons table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Code','Discount','Min Order','Usage','Expires','Status','Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? [...Array(3)].map((_,i) => (
                    <tr key={i} className="border-b">
                      {[...Array(7)].map((_,j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 animate-pulse rounded w-20"/></td>)}
                    </tr>
                  ))
                : items.map(c => (
                    <CouponRow key={c.id} coupon={c}
                      onEdit={c => { setEditing(c); setShowForm(false); }}
                      onDelete={handleDelete}
                      onToggle={handleToggle}
                    />
                  ))
              }
            </tbody>
          </table>
        </div>
        {items.length === 0 && !loading && (
          <div className="text-center py-16 text-gray-400">
            <Tag className="h-12 w-12 mx-auto mb-3 opacity-20"/>
            <p className="font-semibold">No coupons created yet</p>
            <p className="text-sm mt-1">Click "Create Coupon" to add your first discount code</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCoupons;
