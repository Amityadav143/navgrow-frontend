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
import React, { useState, useRef, useCallback } from 'react';
import {
  Plus, Edit2, Trash2, Package, Search, CheckCircle,
  Download, Upload, FileText, X, AlertCircle, RefreshCw,
  Image, Tag, DollarSign, BarChart2, Eye, EyeOff, AlertTriangle,
} from 'lucide-react';
import { productsApi } from '@/lib/api';
import { usePaginated, useMutation } from '@/hooks/useApi';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = [
  'Safety Equipment','Railway Tools','Maintenance Supplies',
  'Testing & Inspection','PPE & Workwear',
  'Industrial Equipment','Electrical & Electronics',
  'Civil & Construction','IT & Technology','Other',
];
const GST_RATES = ['0','5','12','18','28'];

/* ── CSV helpers ─────────────────────────────────────────────────────────── */
const CSV_HEADERS = [
  'name','category','price','mrp','gstRate','stockQty',
  'description','imageUrl','badge','featured','sku',
];
function productsToCSV(products) {
  const rows = [CSV_HEADERS.join(',')];
  products.forEach(p => {
    rows.push(CSV_HEADERS.map(h => {
      const v = p[h] ?? '';
      return typeof v==='string' && (v.includes(',')||v.includes('"')||v.includes('\n'))
        ? `"${v.replace(/"/g,'""')}"` : v;
    }).join(','));
  });
  return rows.join('\n');
}
function csvToProducts(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row');
  const headers = lines[0].split(',').map(h=>h.trim().replace(/^"|"$/g,''));
  return lines.slice(1).map((line, i) => {
    const vals = []; let cur=''; let inQ=false;
    for (const ch of line) {
      if (ch==='"') { inQ=!inQ; }
      else if (ch===','&&!inQ) { vals.push(cur); cur=''; }
      else cur+=ch;
    }
    vals.push(cur);
    const obj = {};
    headers.forEach((h,idx) => { obj[h]=vals[idx]?.trim()??''; });
    return {
      name:       obj.name,
      category:   obj.category||'Safety Equipment',
      price:      parseFloat(obj.price)||0,
      mrp:        obj.mrp ? parseFloat(obj.mrp) : null,
      gstRate:    parseInt(obj.gstRate)||18,
      stockQty:   parseInt(obj.stockQty)||0,
      description:obj.description||'',
      imageUrl:   obj.imageUrl||'',
      badge:      obj.badge||'',
      featured:   obj.featured==='true'||obj.featured==='1',
      sku:        obj.sku||'',
    };
  });
}

/* ── Confirm dialog ──────────────────────────────────────────────────────── */
const ConfirmDialog = ({ message, onConfirm, onCancel, danger=true }) => (
  <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
    <motion.div initial={{scale:.9,opacity:0}} animate={{scale:1,opacity:1}}
      className="bg-gray-800 rounded-2xl border border-gray-700 p-6 max-w-sm w-full shadow-2xl">
      <div className={`w-12 h-12 rounded-full ${danger?'bg-red-900/50':'bg-amber-900/50'} flex items-center justify-center mx-auto mb-4`}>
        <AlertTriangle className={`h-6 w-6 ${danger?'text-red-400':'text-amber-400'}`}/>
      </div>
      <p className="text-white font-semibold text-center mb-5 leading-relaxed">{message}</p>
      <div className="flex gap-3">
        <button onClick={onCancel}
          className="flex-1 py-2.5 bg-gray-700 text-gray-300 rounded-xl font-semibold text-sm hover:bg-gray-600">
          Cancel
        </button>
        <button onClick={onConfirm}
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm text-white ${danger?'bg-red-600 hover:bg-red-700':'bg-amber-600 hover:bg-amber-700'}`}>
          Confirm
        </button>
      </div>
    </motion.div>
  </div>
);

/* ── Shared input component — DEFINED OUTSIDE form to prevent cursor bug ── */
// Props: form, onChange, dark (true for admin dark theme)
const FormInput = ({ label, fieldKey, type='text', required, placeholder, form, onChange, full=false }) => (
  <div className={full?'col-span-2':''}>
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
                 focus:outline-none focus:border-blue-500 placeholder-gray-600 transition-colors"
    />
  </div>
);

/* ── Product form — Input defined OUTSIDE to fix cursor jump bug ─────────── */
const ProductForm = ({ initial, onSave, onCancel, saving }) => {
  const [form, setForm] = useState(initial || {
    name:'', category:'Safety Equipment', price:'', mrp:'', gstRate:'18',
    stockQty:'0', description:'', imageUrl:'', badge:'', featured:false, sku:'',
  });

  // Stable onChange handler — won't recreate on each render
  const handleChange = useCallback((key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleCheckbox = useCallback((key, checked) => {
    setForm(prev => ({ ...prev, [key]: checked }));
  }, []);

  return (
    <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}}
      className="bg-gray-800 rounded-2xl border border-gray-700 p-6 mb-5 shadow-xl">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-white text-lg flex items-center gap-2">
          {initial ? <Edit2 className="h-5 w-5 text-blue-400"/> : <Plus className="h-5 w-5 text-green-400"/>}
          {initial ? 'Edit Product' : 'Add New Product'}
        </h3>
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 transition-colors">
          <X className="h-4 w-4"/>
        </button>
      </div>

      <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput label="Product Name" fieldKey="name"     required placeholder="e.g. Safety Helmet ISI" form={form} onChange={handleChange} full />
          <FormInput label="SKU"          fieldKey="sku"      placeholder="NGP-001"        form={form} onChange={handleChange} />
          <FormInput label="Price (₹)"    fieldKey="price"    required type="number" placeholder="480" form={form} onChange={handleChange} />
          <FormInput label="MRP (₹)"      fieldKey="mrp"      type="number" placeholder="650" form={form} onChange={handleChange} />
          <FormInput label="Stock Qty"    fieldKey="stockQty" type="number" placeholder="100" form={form} onChange={handleChange} />
          <FormInput label="Badge"        fieldKey="badge"    placeholder="Bestseller / New / 26% OFF" form={form} onChange={handleChange} />
          <FormInput label="Image URL"    fieldKey="imageUrl" placeholder="https://…" form={form} onChange={handleChange} full />

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
              Category <span className="text-red-400">*</span>
            </label>
            <select required value={form.category} onChange={e => handleChange('category', e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* GST Rate */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">GST Rate</label>
            <select value={form.gstRate} onChange={e => handleChange('gstRate', e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500">
              {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
            </select>
          </div>

          {/* Description */}
          <div className="col-span-2">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => handleChange('description', e.target.value)}
              rows={3} placeholder="Detailed product description…"
              className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white
                         focus:outline-none focus:border-blue-500 resize-y placeholder-gray-600"/>
          </div>

          {/* Featured toggle */}
          <div className="col-span-2 flex items-center gap-3 p-3 bg-gray-900 rounded-xl border border-gray-700">
            <input type="checkbox" id="featured-check" checked={form.featured}
              onChange={e => handleCheckbox('featured', e.target.checked)}
              className="w-4 h-4 rounded accent-blue-500"/>
            <label htmlFor="featured-check" className="text-sm text-gray-300 font-medium cursor-pointer">
              Featured product (shown on homepage shop preview)
            </label>
          </div>

          {/* Image preview */}
          {form.imageUrl && (
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Image Preview</label>
              <img loading="lazy" decoding="async" src={form.imageUrl} alt="Preview" className="h-24 w-24 object-cover rounded-xl border border-gray-700"
                onError={e => { e.target.style.display='none'; }}/>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 brand-gradient text-white font-bold rounded-xl text-sm
                       hover:opacity-90 disabled:opacity-60 transition-opacity">
            {saving ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                    : <CheckCircle className="h-4 w-4"/>}
            {saving ? 'Saving…' : initial ? 'Update Product' : 'Create Product'}
          </button>
          <button type="button" onClick={onCancel}
            className="px-5 py-2.5 bg-gray-700 text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-600 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </motion.div>
  );
};

/* ── Bulk upload panel ───────────────────────────────────────────────────── */
const BulkUploadPanel = ({ onClose, onSuccess }) => {
  const { toast } = useToast();
  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors]   = useState([]);
  const fileRef = useRef();

  const handleFile = (e) => {
    const f = e.target.files[0]; if (!f) return;
    setFile(f); setErrors([]);
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const rows = csvToProducts(ev.target.result);
        const errs = [];
        rows.forEach((r,i) => {
          if (!r.name) errs.push(`Row ${i+2}: name is required`);
          if (!r.price || r.price <= 0) errs.push(`Row ${i+2}: valid price required`);
        });
        setErrors(errs); setPreview(rows.slice(0,5));
      } catch (err) { setErrors([err.message]); setPreview([]); }
    };
    reader.readAsText(f);
  };

  const handleUpload = async () => {
    if (!preview.length || errors.length) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const rows = csvToProducts(ev.target.result);
        let success=0, fail=0;
        for (const row of rows) {
          try {
            // Build clean payload matching backend ProductRequest DTO
            const payload = {
              name:        row.name,
              category:    row.category || 'Safety Equipment',
              price:       Number(row.price),
              mrp:         row.mrp ? Number(row.mrp) : null,
              gstRate:     Number(row.gstRate) || 18,
              stockQty:    Number(row.stockQty) || 0,
              description: row.description || '',
              imageUrl:    row.imageUrl || '',
              badge:       row.badge || '',
              featured:    Boolean(row.featured),
              sku:         row.sku || '',
            };
            await productsApi.create(payload);
            success++;
          } catch (err) {
            console.warn('Product upload failed:', row.name, err.response?.data);
            fail++;
          }
        }
        toast({ title: `Bulk upload done: ${success} added${fail ? `, ${fail} failed` : ''}`,
                variant: fail > 0 ? 'destructive' : 'default' });
        if (success > 0) { onSuccess(); onClose(); }
      } catch (err) {
        toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
      } finally { setUploading(false); }
    };
    reader.readAsText(file);
  };

  return (
    <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}}
      className="bg-gray-800 rounded-2xl border border-amber-700/50 p-6 mb-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white text-lg flex items-center gap-2">
          <Upload className="h-5 w-5 text-amber-400"/> Bulk Upload Products
        </h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400"><X className="h-4 w-4"/></button>
      </div>

      {/* Format hint */}
      <div className="bg-gray-900 rounded-xl p-4 mb-4 text-xs font-mono">
        <p className="font-semibold mb-1.5 text-white">CSV Format (required columns)</p>
        <p className="text-amber-300 break-all">{CSV_HEADERS.join(', ')}</p>
        <p className="text-gray-500 mt-1.5">All numeric fields must be numbers. featured: true/false.</p>
      </div>

      <div className="flex gap-3 mb-4">
        <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden"/>
        <button onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700">
          <FileText className="h-4 w-4"/> Choose CSV File
        </button>
        {file && <span className="text-sm text-gray-400 self-center">{file.name}</span>}
      </div>

      {errors.length > 0 && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-3 mb-3">
          <p className="text-red-400 font-bold text-xs mb-1.5">Validation Issues ({errors.length})</p>
          {errors.slice(0,5).map((e,i) => <p key={i} className="text-red-300 text-xs">{e}</p>)}
          {errors.length > 5 && <p className="text-red-400 text-xs mt-1">…and {errors.length-5} more</p>}
        </div>
      )}

      {preview.length > 0 && errors.length === 0 && (
        <div className="mb-4">
          <p className="text-sm font-bold text-white mb-2">Preview (first {preview.length} rows)</p>
          <div className="overflow-x-auto rounded-xl border border-gray-700">
            <table className="text-xs text-gray-300 min-w-full">
              <thead>
                <tr className="bg-gray-700">
                  {['name','category','price','stock','featured'].map(h =>
                    <th key={h} className="px-3 py-2 text-left font-bold text-gray-400">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.map((r,i) => (
                  <tr key={i} className="border-t border-gray-700/50">
                    <td className="px-3 py-1.5">{r.name}</td>
                    <td className="px-3 py-1.5">{r.category}</td>
                    <td className="px-3 py-1.5">₹{r.price}</td>
                    <td className="px-3 py-1.5">{r.stockQty}</td>
                    <td className="px-3 py-1.5">{r.featured?'Yes':'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <button onClick={handleUpload}
        disabled={!preview.length || errors.length > 0 || uploading}
        className="flex items-center gap-2 px-5 py-2.5 brand-gradient text-white font-bold rounded-xl text-sm
                   hover:opacity-90 disabled:opacity-50 transition-opacity">
        {uploading ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                   : <Upload className="h-4 w-4"/>}
        {uploading ? 'Uploading…' : `Upload ${preview.length} Products`}
      </button>
    </motion.div>
  );
};

/* ── Main AdminProducts ─────────────────────────────────────────────────── */
const AdminProducts = () => {
  const { toast } = useToast();
  const [showForm,   setShowForm]   = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [showBulk,   setShowBulk]   = useState(false);
  const [search,     setSearch]     = useState('');
  const [catFilter,  setCatFilter]  = useState('');
  const [confirm,    setConfirm]    = useState(null); // { msg, onConfirm }

  const { items, loading, setFilter, refetch } = usePaginated(productsApi.list, { size: 50 });
  const [create, { loading: creating }] = useMutation(productsApi.create);
  const [update, { loading: updating }] = useMutation(productsApi.update);
  const [remove]                        = useMutation(productsApi.delete);

  const handleSave = async (form) => {
    const payload = {
      name:        form.name,
      category:    form.category,
      price:       Number(form.price),
      mrp:         form.mrp ? Number(form.mrp) : null,
      gstRate:     Number(form.gstRate)||18,
      stockQty:    Number(form.stockQty)||0,
      description: form.description||'',
      imageUrl:    form.imageUrl||'',
      badge:       form.badge||'',
      featured:    Boolean(form.featured),
      sku:         form.sku||'',
    };

    const action = () => editing ? update(editing.id, payload) : create(payload);

    const res = await action();
    if (res.error) {
      toast({ title:'Failed', description: res.error, variant:'destructive' }); return;
    }
    toast({ title: editing ? '✓ Product updated' : '✓ Product created' });
    setShowForm(false); setEditing(null); refetch();
  };

  const handleDelete = (id, name) => {
    setConfirm({
      msg: `Delete "${name}"? This cannot be undone.`,
      onConfirm: async () => {
        await remove(id);
        toast({ title: '✓ Product deleted' });
        setConfirm(null); refetch();
      },
    });
  };

  const handleDownloadCSV = () => {
    const csv = productsToCSV(items);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `navgrow-products-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    toast({ title: `✓ Downloaded ${items.length} products` });
  };

  const handleDownloadTemplate = () => {
    const csv = CSV_HEADERS.join(',') + '\nSample Safety Helmet,Safety Equipment,480,650,18,100,Product description,https://image-url.com,Bestseller,false,NGP-001';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'products-template.csv';
    a.click();
  };

  // Stat cards
  const active   = items.filter(p => p.active !== false);
  const featured = items.filter(p => p.featured);
  const lowStock = items.filter(p => (p.stockQty ?? 0) < 10);

  return (
    <div className="p-6">
      {confirm && (
        <ConfirmDialog message={confirm.msg} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)}/>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Products</h1>
          <p className="text-gray-400 text-sm mt-0.5">{items.length} products in catalogue</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownloadTemplate} title="Download blank CSV template"
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold hover:bg-gray-600 transition-colors">
            <FileText className="h-3.5 w-3.5"/> Template
          </button>
          <button onClick={handleDownloadCSV} title="Export all products as CSV"
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold hover:bg-gray-600 transition-colors">
            <Download className="h-3.5 w-3.5"/> Export CSV
          </button>
          <button onClick={() => { setShowBulk(b=>!b); setShowForm(false); setEditing(null); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors">
            <Upload className="h-3.5 w-3.5"/> Bulk Upload
          </button>
          <button onClick={() => { setShowForm(f=>!f); setEditing(null); setShowBulk(false); }}
            className="flex items-center gap-2 px-4 py-2 brand-gradient text-white font-bold rounded-xl text-sm hover:opacity-90">
            <Plus className="h-4 w-4"/> Add Product
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label:'Total Products', value: items.length,   col:'text-blue-400' },
          { label:'Active',         value: active.length,  col:'text-green-400' },
          { label:'Featured',       value: featured.length,col:'text-amber-400' },
          { label:'Low Stock (<10)',value: lowStock.length, col:'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-800 rounded-xl p-3.5 border border-gray-700">
            <p className={`text-2xl font-extrabold ${s.col}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"/>
          <input value={search} placeholder="Search products…"
            onChange={e => { setSearch(e.target.value); setFilter('q', e.target.value||undefined); }}
            className="pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white
                       placeholder-gray-500 focus:outline-none focus:border-blue-500 w-full"/>
        </div>
        <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setFilter('category', e.target.value||undefined); }}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white focus:outline-none">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        {(search || catFilter) && (
          <button onClick={() => { setSearch(''); setCatFilter(''); setFilter('q',undefined); setFilter('category',undefined); }}
            className="px-3 py-2 bg-gray-700 text-gray-400 rounded-xl text-sm hover:bg-gray-600 flex items-center gap-1.5">
            <X className="h-3.5 w-3.5"/> Clear
          </button>
        )}
      </div>

      <AnimatePresence>
        {showBulk && <BulkUploadPanel onClose={() => setShowBulk(false)} onSuccess={refetch}/>}
        {(showForm || editing) && (
          <ProductForm
            initial={editing}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditing(null); }}
            saving={creating || updating}
          />
        )}
      </AnimatePresence>

      {/* Products table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Product','Category','Price','Stock','Featured','Status','Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? [...Array(5)].map((_,i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {[...Array(7)].map((_,j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 animate-pulse rounded w-24"/></td>
                      ))}
                    </tr>
                  ))
                : items.map(p => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.imageUrl
                            ? <img src={p.imageUrl} alt={p.name} loading="lazy"
                                className="w-10 h-10 rounded-xl object-cover bg-gray-100"
                                onError={e => { e.target.style.display='none'; }}/>
                            : <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                                <Package className="h-5 w-5 text-gray-300"/>
                              </div>
                          }
                          <div>
                            <p className="font-semibold text-gray-900 text-xs">{p.name}</p>
                            <p className="text-[10px] text-gray-400">{p.sku || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{p.category}</td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-gray-900 text-xs">₹{p.price?.toLocaleString('en-IN')}</p>
                        {p.mrp && <p className="text-[10px] text-gray-400 line-through">₹{p.mrp?.toLocaleString('en-IN')}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold ${(p.stockQty??0)<10?'text-red-600':'text-green-600'}`}>{p.stockQty??0}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs ${p.featured?'text-amber-600 font-bold':'text-gray-400'}`}>{p.featured?'★ Yes':'—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${p.active!==false?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>
                          {p.active!==false?'Active':'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditing(p); setShowForm(false); setShowBulk(false); }}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="Edit">
                            <Edit2 className="h-3.5 w-3.5"/>
                          </button>
                          <button onClick={() => handleDelete(p.id, p.name)}
                            className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors" title="Delete">
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
            <Package className="h-12 w-12 mx-auto mb-3 opacity-20"/>
            <p className="font-semibold">No products yet</p>
            <p className="text-sm mt-1">Add your first product or upload a CSV file</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminProducts;
