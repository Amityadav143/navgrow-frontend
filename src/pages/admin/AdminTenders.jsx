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
 * AdminTenders — aligned with the backend Tender model.
 *
 * The previous form sent { title, description, imageUrl, active } while the
 * API required refNumber and knew nothing about imageUrl/active — every save
 * returned 400 Bad Request. The form now covers the full tender shape
 * (reference auto-generates when left blank) and adds the requested fields:
 * apply link, organization, location, category, value range, deadline,
 * document and image (with device upload).
 */
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit2, Trash2, X, CheckCircle, AlertTriangle, Tag,
  Calendar, ExternalLink, Star, Building2, MapPin, FileText,
} from 'lucide-react';
import { tendersApi } from '@/lib/api';
import { useMutation } from '@/hooks/useApi';
import { useToast } from '@/components/ui/use-toast';
import ImageUploadInput from '@/components/admin/ImageUploadInput';

const STATUSES = ['OPEN', 'CLOSED', 'AWARDED', 'CANCELLED'];
const STATUS_STYLES = {
  OPEN:      'bg-green-100 text-green-700',
  CLOSED:    'bg-gray-100 text-gray-500',
  AWARDED:   'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-red-100 text-red-600',
};

const EMPTY_FORM = {
  refNumber: '', title: '', description: '', organization: '', location: '',
  category: '', deadline: '', valueMin: '', valueMax: '',
  applyLink: '', documentUrl: '', imageUrl: '', status: 'OPEN', featured: false,
};

const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
    <motion.div initial={{scale:.9,opacity:0}} animate={{scale:1,opacity:1}}
      className="bg-gray-800 rounded-2xl border border-gray-700 p-6 max-w-sm w-full shadow-2xl">
      <div className="w-12 h-12 rounded-full bg-red-900/50 flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="h-6 w-6 text-red-400"/>
      </div>
      <p className="text-white font-semibold text-center mb-5">{message}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2.5 bg-gray-700 text-gray-300 rounded-xl text-sm">Cancel</button>
        <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm">Confirm</button>
      </div>
    </motion.div>
  </div>
);

const Field = ({ label, k, form, ch, type='text', placeholder, required, hint, full }) => (
  <div className={full ? 'md:col-span-2' : ''}>
    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
      {label}{required && <span className="text-red-400 ml-1">*</span>}
      {hint && <span className="text-gray-600 normal-case font-medium ml-1.5">{hint}</span>}
    </label>
    <input required={required} type={type} value={form[k] ?? ''} onChange={e => ch(k, e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 placeholder-gray-600 [color-scheme:dark]"/>
  </div>
);

const AdminTenders = () => {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [confirm,  setConfirm]  = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const ch = useCallback((k, v) => setForm(p => ({ ...p, [k]: v })), []);

  const [create, {loading:creating}] = useMutation(tendersApi.create);
  const [update, {loading:updating}] = useMutation(tendersApi.update);
  const [remove]                     = useMutation(tendersApi.delete);

  // /tenders/manage returns every status; the public /tenders hides anything
  // that is not OPEN, which made closed tenders vanish from the panel.
  const refetch = useCallback(() => {
    setLoading(true);
    tendersApi.manage()
      .then(r => setItems(Array.isArray(r.data) ? r.data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);
  React.useEffect(() => { refetch(); }, [refetch]);

  const openEdit = (t) => {
    setEditing(t);
    setForm({
      refNumber:   t.refNumber   || '',
      title:       t.title       || '',
      description: t.description || '',
      organization:t.organization|| '',
      location:    t.location    || '',
      category:    t.category    || '',
      deadline:    t.deadline ? String(t.deadline).slice(0, 10) : '',
      valueMin:    t.valueMin ?? '',
      valueMax:    t.valueMax ?? '',
      applyLink:   t.applyLink   || '',
      documentUrl: t.documentUrl || '',
      imageUrl:    t.imageUrl    || '',
      status:      t.status      || 'OPEN',
      featured:    !!t.featured,
    });
    setShowForm(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      valueMin: form.valueMin !== '' ? Number(form.valueMin) : null,
      valueMax: form.valueMax !== '' ? Number(form.valueMax) : null,
      deadline: form.deadline || null,
    };
    const res = editing ? await update(editing.id, payload) : await create(payload);
    if (res.error) { toast({ title: 'Failed', description: res.error, variant: 'destructive' }); return; }
    toast({ title: editing ? '✓ Tender updated' : `✓ Tender created (${res.data?.refNumber || 'ref assigned'})` });
    setShowForm(false); setEditing(null); setForm(EMPTY_FORM);
    refetch();
  };

  const handleDelete = (id, title) => setConfirm({
    msg: `Delete "${title}"? This cannot be undone.`,
    onConfirm: async () => {
      await remove(id); setConfirm(null); refetch();
      toast({ title: '✓ Deleted' });
    },
  });

  const fmtMoney = (v) => v != null && v !== '' ? `₹${Number(v).toLocaleString('en-IN')}` : null;

  return (
    <div className="p-6">
      {confirm && <ConfirmDialog message={confirm.msg} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)}/>}

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Tenders</h1>
          <p className="text-gray-400 text-sm mt-0.5">{items.filter(t => t.status === 'OPEN').length} open · {items.length} total</p>
        </div>
        <button onClick={() => { setShowForm(f => !f); setEditing(null); setForm(EMPTY_FORM); }}
          className="flex items-center gap-2 px-4 py-2 brand-gradient text-white font-bold rounded-xl text-sm hover:opacity-90">
          <Plus className="h-4 w-4"/> Add Tender
        </button>
      </div>

      <AnimatePresence>
        {(showForm || editing) && (
          <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}
            className="bg-gray-800 rounded-2xl border border-gray-700 p-6 mb-5 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                {editing ? <Edit2 className="h-5 w-5 text-blue-400"/> : <Plus className="h-5 w-5 text-green-400"/>}
                {editing ? 'Edit Tender' : 'Add Tender'}
              </h3>
              <button onClick={() => { setShowForm(false); setEditing(null); }}
                className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400"><X className="h-4 w-4"/></button>
            </div>
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Title" k="title" form={form} ch={ch} required placeholder="e.g. Supply of Modified Hand Brake Assemblies" full/>
              <Field label="Reference Number" k="refNumber" form={form} ch={ch}
                placeholder="Leave blank to auto-generate (NAV-TND-…)"
                hint="(optional — auto-generated when blank)"/>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Status</label>
                <select value={form.status} onChange={e => ch('status', e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500">
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <Field label="Issuing Organization" k="organization" form={form} ch={ch} placeholder="e.g. NF Railway / GeM / Wabtec"/>
              <Field label="Location" k="location" form={form} ch={ch} placeholder="e.g. Siliguri, WB"/>
              <Field label="Category" k="category" form={form} ch={ch} placeholder="e.g. Mechanical / Civil / Supply"/>
              <Field label="Submission Deadline" k="deadline" form={form} ch={ch} type="date"/>
              <Field label="Value From (₹)" k="valueMin" form={form} ch={ch} type="number" placeholder="500000"/>
              <Field label="Value To (₹)" k="valueMax" form={form} ch={ch} type="number" placeholder="2500000"/>
              <Field label="Apply Link" k="applyLink" form={form} ch={ch}
                placeholder="https://gem.gov.in/… or https://ireps.gov.in/…"
                hint="(shown as an “Apply” button on the website)" full/>
              <Field label="Tender Document URL" k="documentUrl" form={form} ch={ch}
                placeholder="https://… (PDF of the tender notice)" full/>
              <div className="md:col-span-2">
                <ImageUploadInput label="Tender Image / Banner" value={form.imageUrl}
                  onChange={(url) => ch('imageUrl', url)} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => ch('description', e.target.value)} rows={3}
                  placeholder="Scope of work, eligibility, EMD details…"
                  className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 resize-y placeholder-gray-600"/>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-900 rounded-xl border border-gray-700">
                <input type="checkbox" id="tender-featured" checked={form.featured}
                  onChange={e => ch('featured', e.target.checked)} className="w-4 h-4 accent-amber-500"/>
                <label htmlFor="tender-featured" className="text-sm text-gray-300 cursor-pointer font-medium flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 text-amber-400"/> Featured (shown in the homepage tender banner)
                </label>
              </div>
              <div className="md:col-span-2 flex gap-3 pt-2">
                <button type="submit" disabled={creating || updating}
                  className="flex items-center gap-2 px-6 py-2.5 brand-gradient text-white font-bold rounded-xl text-sm disabled:opacity-60">
                  {(creating || updating)
                    ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                    : <CheckCircle className="h-4 w-4"/>}
                  {(creating || updating) ? 'Saving…' : editing ? 'Update Tender' : 'Create Tender'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }}
                  className="px-5 py-2.5 bg-gray-700 text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-600">
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Tender','Reference','Deadline','Value','Status','Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? [...Array(4)].map((_, i) => (
                    <tr key={i} className="border-b">
                      {[...Array(6)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 animate-pulse rounded w-20"/></td>)}
                    </tr>
                  ))
                : items.map(t => (
                    <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
                      <td className="px-4 py-3 max-w-sm">
                        <div className="flex items-start gap-3">
                          {t.imageUrl
                            ? <img loading="lazy" decoding="async" src={t.imageUrl} alt="" className="w-11 h-11 rounded-xl object-cover bg-gray-100 shrink-0" onError={e=>{e.target.style.display='none'}}/>
                            : <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center shrink-0"><Tag className="h-5 w-5 text-gray-300"/></div>}
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 text-xs leading-snug flex items-center gap-1.5">
                              {t.featured && <Star className="h-3 w-3 text-amber-500 shrink-0"/>}
                              <span className="line-clamp-2">{t.title}</span>
                            </p>
                            <div className="flex flex-wrap gap-2 mt-1 text-[10px] text-gray-400">
                              {t.organization && <span className="flex items-center gap-0.5"><Building2 className="h-2.5 w-2.5"/>{t.organization}</span>}
                              {t.location && <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5"/>{t.location}</span>}
                              {t.category && <span>{t.category}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-500 whitespace-nowrap">{t.refNumber}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3"/>
                          {t.deadline ? new Date(t.deadline).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {fmtMoney(t.valueMin) ? `${fmtMoney(t.valueMin)}${fmtMoney(t.valueMax) ? ' – ' + fmtMoney(t.valueMax) : '+'}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${STATUS_STYLES[t.status] || 'bg-gray-100 text-gray-500'}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {t.applyLink && (
                            <a href={t.applyLink} target="_blank" rel="noopener noreferrer" title="Open apply link"
                              className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                              <ExternalLink className="h-3.5 w-3.5"/>
                            </a>
                          )}
                          {t.documentUrl && (
                            <a href={t.documentUrl} target="_blank" rel="noopener noreferrer" title="Tender document"
                              className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
                              <FileText className="h-3.5 w-3.5"/>
                            </a>
                          )}
                          <button onClick={() => openEdit(t)} title="Edit"
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                            <Edit2 className="h-3.5 w-3.5"/>
                          </button>
                          <button onClick={() => handleDelete(t.id, t.title)} title="Delete"
                            className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                            <Trash2 className="h-3.5 w-3.5"/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
        {items.length === 0 && !loading && (
          <div className="text-center py-16 text-gray-400">
            <Tag className="h-12 w-12 mx-auto mb-3 opacity-20"/>
            <p className="font-semibold">No tenders yet</p>
            <p className="text-sm mt-1">Click "Add Tender" to create the first entry</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTenders;
