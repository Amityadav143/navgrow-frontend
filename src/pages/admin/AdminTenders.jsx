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
import { Plus, Edit2, Trash2, X, CheckCircle, AlertTriangle, Tag } from 'lucide-react';
import { tendersApi } from '@/lib/api';
import { usePaginated, useMutation } from '@/hooks/useApi';
import { useToast } from '@/components/ui/use-toast';

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

const AdminTenders = () => {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [confirm,  setConfirm]  = useState(null);
  const [form, setForm] = useState({ title:'', description:'', imageUrl:'', active:true });
  const ch = useCallback((k,v) => setForm(p => ({...p,[k]:v})), []);

  const { items, loading, refetch } = usePaginated(tendersApi.list, { size: 50 });
  const [create, {loading:creating}] = useMutation(tendersApi.create);
  const [update, {loading:updating}] = useMutation(tendersApi.update);
  const [remove]                      = useMutation(tendersApi.delete);

  const openEdit = (item) => {
    setEditing(item);
    setForm({ title: item.title||'', description: item.description||'', imageUrl: item.imageUrl||item.image||'', active: item.active!==false });
    setShowForm(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const res = editing ? await update(editing.id, form) : await create(form);
    if (res.error) { toast({ title:'Failed', description:res.error, variant:'destructive' }); return; }
    toast({ title: editing ? '✓ Updated' : '✓ Created' });
    setShowForm(false); setEditing(null);
    setForm({ title:'', description:'', imageUrl:'', active:true });
    refetch();
  };

  const handleDelete = (id, title) => setConfirm({
    msg: `Delete "${title}"? This cannot be undone.`,
    onConfirm: async () => {
      await remove(id); setConfirm(null); refetch();
      toast({ title: '✓ Deleted' });
    },
  });

  return (
    <div className="p-6">
      {confirm && <ConfirmDialog message={confirm.msg} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)}/>}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Tenders</h1>
          <p className="text-gray-400 text-sm mt-0.5">{items.length} entries</p>
        </div>
        <button onClick={() => { setShowForm(f=>!f); setEditing(null); }}
          className="flex items-center gap-2 px-4 py-2 brand-gradient text-white font-bold rounded-xl text-sm hover:opacity-90">
          <Plus className="h-4 w-4"/> Add Tender
        </button>
      </div>

      <AnimatePresence>
        {(showForm || editing) && (
          <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}}
            className="bg-gray-800 rounded-2xl border border-gray-700 p-5 mb-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-lg">{editing ? 'Edit' : 'Add'} Tender</h3>
              <button onClick={()=>{setShowForm(false);setEditing(null);}} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400"><X className="h-4 w-4"/></button>
            </div>
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Title *</label>
                <input required value={form.title} onChange={e=>ch('title',e.target.value)} placeholder="Title"
                  className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 placeholder-gray-600"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Image URL</label>
                <input value={form.imageUrl} onChange={e=>ch('imageUrl',e.target.value)} placeholder="https://…"
                  className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"/>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-900 rounded-xl border border-gray-700 self-end">
                <input type="checkbox" id="active-ck" checked={form.active} onChange={e=>ch('active',e.target.checked)} className="w-4 h-4 accent-blue-500"/>
                <label htmlFor="active-ck" className="text-sm text-gray-300 cursor-pointer">Active / Published</label>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Description</label>
                <textarea value={form.description} onChange={e=>ch('description',e.target.value)} rows={3}
                  placeholder="Description…"
                  className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 resize-y"/>
              </div>
              {form.imageUrl && (
                <div className="col-span-2">
                  <img loading="lazy" decoding="async" src={form.imageUrl} alt="" className="h-20 rounded-xl object-cover"
                    onError={e=>{e.target.style.display='none'}}/>
                </div>
              )}
              <div className="col-span-2 flex gap-3 pt-2">
                <button type="submit" disabled={creating||updating}
                  className="flex items-center gap-2 px-6 py-2.5 brand-gradient text-white font-bold rounded-xl text-sm disabled:opacity-60">
                  {(creating||updating) ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <CheckCircle className="h-4 w-4"/>}
                  {editing ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={()=>{setShowForm(false);setEditing(null);}}
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
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Image','Title','Status','Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? [...Array(4)].map((_,i) => (
                    <tr key={i} className="border-b">
                      {[...Array(4)].map((_,j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 animate-pulse rounded w-20"/></td>)}
                    </tr>
                  ))
                : items.map(item => (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
                      <td className="px-4 py-3">
                        {(item.imageUrl || item.image)
                          ? <img loading="lazy" decoding="async" src={item.imageUrl||item.image} alt="" className="w-12 h-12 rounded-xl object-cover bg-gray-100" onError={e=>{e.target.style.display='none'}}/>
                          : <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center"><Tag className="h-5 w-5 text-gray-300"/></div>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900 text-xs">{item.title||item.name}</p>
                        {item.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${item.active!==false?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>
                          {item.active!==false?'Active':'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={()=>openEdit(item)}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                            <Edit2 className="h-3.5 w-3.5"/>
                          </button>
                          <button onClick={()=>handleDelete(item.id, item.title||item.name||'this item')}
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
        {items.length===0 && !loading && (
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
