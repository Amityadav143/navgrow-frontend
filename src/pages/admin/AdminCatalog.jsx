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
 * AdminCatalog — one place to manage the site's taxonomies:
 * product categories, services, gallery categories and news categories.
 * Product categories feed the product form + shop filters immediately.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit2, Trash2, X, CheckCircle, AlertTriangle,
  Layers, Package, Wrench, Image as ImageIcon, Newspaper, GripVertical,
} from 'lucide-react';
import { catalogApi } from '@/lib/api';
import { useMutation } from '@/hooks/useApi';
import { useToast } from '@/components/ui/use-toast';
import ImageUploadInput from '@/components/admin/ImageUploadInput';

const TYPES = [
  { key: 'PRODUCT_CATEGORY', label: 'Product Categories', icon: Package,
    hint: 'Used in the shop filters and the product form’s category dropdown.' },
  { key: 'SERVICE', label: 'Services', icon: Wrench,
    hint: 'Additional services offered — shown alongside the built-in service pages.' },
  { key: 'GALLERY_CATEGORY', label: 'Gallery Categories', icon: ImageIcon,
    hint: 'Category filters for the photo gallery.' },
  { key: 'NEWS_CATEGORY', label: 'News Categories', icon: Newspaper,
    hint: 'Categories available when writing articles.' },
];

const EMPTY = { name: '', slug: '', description: '', icon: '', imageUrl: '', sortOrder: 0, active: true };

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

const AdminCatalog = () => {
  const { toast } = useToast();
  const [tab, setTab]         = useState('PRODUCT_CATEGORY');
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [confirm, setConfirm]   = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const ch = useCallback((k, v) => setForm(p => ({ ...p, [k]: v })), []);

  const [create, {loading:creating}] = useMutation(catalogApi.create);
  const [update, {loading:updating}] = useMutation(catalogApi.update);
  const [remove]                     = useMutation(catalogApi.delete);

  const refetch = useCallback(() => {
    setLoading(true);
    catalogApi.manage(tab)
      .then(r => setItems(Array.isArray(r.data) ? r.data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [tab]);
  useEffect(() => { refetch(); setShowForm(false); setEditing(null); }, [refetch]);

  const activeType = TYPES.find(t => t.key === tab);

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name || '', slug: item.slug || '', description: item.description || '',
      icon: item.icon || '', imageUrl: item.imageUrl || '',
      sortOrder: item.sortOrder ?? 0, active: item.active !== false,
    });
    setShowForm(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = { ...form, itemType: tab, sortOrder: Number(form.sortOrder) || 0 };
    const res = editing ? await update(editing.id, payload) : await create(payload);
    if (res.error) { toast({ title: 'Failed', description: res.error, variant: 'destructive' }); return; }
    toast({ title: editing ? '✓ Updated' : `✓ ${activeType?.label.replace(/ies$/, 'y').replace(/s$/, '')} created` });
    setShowForm(false); setEditing(null); setForm(EMPTY);
    refetch();
  };

  const handleDelete = (id, name) => setConfirm({
    msg: `Delete "${name}"? Existing content keeps its label; it just stops being offered as an option.`,
    onConfirm: async () => { await remove(id); setConfirm(null); refetch(); toast({ title: '✓ Deleted' }); },
  });

  const toggleActive = async (item) => {
    const res = await update(item.id, { itemType: tab, name: item.name, active: !item.active });
    if (res.error) { toast({ title: 'Failed', description: res.error, variant: 'destructive' }); return; }
    refetch();
  };

  return (
    <div className="p-4 sm:p-6">
      {confirm && <ConfirmDialog message={confirm.msg} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)}/>}

      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Layers className="h-6 w-6 text-blue-400"/> Categories & Services
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Manage the lists that power dropdowns and filters across the site</p>
        </div>
        <button onClick={() => { setShowForm(f => !f); setEditing(null); setForm(EMPTY); }}
          className="flex items-center gap-2 px-4 py-2 brand-gradient text-white font-bold rounded-xl text-sm hover:opacity-90">
          <Plus className="h-4 w-4"/> Add {activeType?.label.replace(/ies$/, 'y').replace(/s$/, '')}
        </button>
      </div>

      {/* Type tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {TYPES.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                tab === t.key ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              <Icon className="h-3.5 w-3.5"/>{t.label}
            </button>
          );
        })}
      </div>
      <p className="text-gray-500 text-xs mb-4">{activeType?.hint}</p>

      <AnimatePresence>
        {(showForm || editing) && (
          <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}
            className="bg-gray-800 rounded-2xl border border-gray-700 p-6 mb-5 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                {editing ? <Edit2 className="h-5 w-5 text-blue-400"/> : <Plus className="h-5 w-5 text-green-400"/>}
                {editing ? 'Edit' : 'Add'} — {activeType?.label}
              </h3>
              <button onClick={() => { setShowForm(false); setEditing(null); }}
                className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400"><X className="h-4 w-4"/></button>
            </div>
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Name <span className="text-red-400">*</span></label>
                <input required value={form.name} onChange={e => ch('name', e.target.value)}
                  placeholder={tab === 'SERVICE' ? 'e.g. Solar Panel Installation' : 'e.g. Hydraulic Tools'}
                  className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 placeholder-gray-600"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                  Slug <span className="text-gray-600 normal-case font-medium">(optional — auto-generated)</span>
                </label>
                <input value={form.slug} onChange={e => ch('slug', e.target.value)} placeholder="url-friendly-slug"
                  className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-blue-500 placeholder-gray-600"/>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => ch('description', e.target.value)} rows={2}
                  placeholder="Short description (shown on service cards / tooltips)…"
                  className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 resize-y placeholder-gray-600"/>
              </div>
              {tab === 'SERVICE' && (
                <div className="md:col-span-2">
                  <ImageUploadInput label="Service Image" value={form.imageUrl}
                    onChange={(url) => ch('imageUrl', url)} />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Sort Order</label>
                <input type="number" value={form.sortOrder} onChange={e => ch('sortOrder', e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"/>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-900 rounded-xl border border-gray-700 self-end">
                <input type="checkbox" id="cat-active" checked={form.active}
                  onChange={e => ch('active', e.target.checked)} className="w-4 h-4 accent-green-500"/>
                <label htmlFor="cat-active" className="text-sm text-gray-300 cursor-pointer font-medium">
                  Active (offered as an option on the site)
                </label>
              </div>
              <div className="md:col-span-2 flex gap-3 pt-1">
                <button type="submit" disabled={creating || updating}
                  className="flex items-center gap-2 px-6 py-2.5 brand-gradient text-white font-bold rounded-xl text-sm disabled:opacity-60">
                  {(creating || updating)
                    ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                    : <CheckCircle className="h-4 w-4"/>}
                  {(creating || updating) ? 'Saving…' : editing ? 'Update' : 'Create'}
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
        {loading
          ? <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-100 animate-pulse rounded-xl"/>)}</div>
          : items.length === 0
            ? (
              <div className="text-center py-16 text-gray-400">
                <Layers className="h-12 w-12 mx-auto mb-3 opacity-20"/>
                <p className="font-semibold">Nothing here yet</p>
                <p className="text-sm mt-1">Add your first {activeType?.label.toLowerCase().replace(/ies$/, 'y').replace(/s$/, '')} above</p>
              </div>
            )
            : (
              <ul className="divide-y divide-gray-50">
                {items.map(item => (
                  <li key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group">
                    <GripVertical className="h-4 w-4 text-gray-200 shrink-0"/>
                    {item.imageUrl && <img loading="lazy" decoding="async" src={item.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover bg-gray-100 shrink-0" onError={e=>{e.target.style.display='none'}}/>}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                        {item.name}
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${item.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {item.active ? 'Active' : 'Hidden'}
                        </span>
                      </p>
                      <p className="text-[11px] text-gray-400 font-mono">/{item.slug}{item.description ? ` · ${item.description.slice(0, 60)}` : ''}</p>
                    </div>
                    <span className="text-[10px] text-gray-300 font-bold shrink-0">#{item.sortOrder}</span>
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => toggleActive(item)} title={item.active ? 'Hide' : 'Activate'}
                        className={`p-1.5 rounded-lg transition-colors ${item.active ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                        <CheckCircle className="h-3.5 w-3.5"/>
                      </button>
                      <button onClick={() => openEdit(item)} title="Edit"
                        className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                        <Edit2 className="h-3.5 w-3.5"/>
                      </button>
                      <button onClick={() => handleDelete(item.id, item.name)} title="Delete"
                        className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                        <Trash2 className="h-3.5 w-3.5"/>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
      </div>
    </div>
  );
};

export default AdminCatalog;
