import React, { useState, useRef } from 'react';
import {
  Plus, Edit2, Trash2, Package, Search, CheckCircle,
  Download, Upload, FileText, X, AlertCircle, RefreshCw,
  Image, Tag, DollarSign, BarChart2, Eye, EyeOff
} from 'lucide-react';
import { productsApi } from '@/lib/api';
import { usePaginated, useMutation } from '@/hooks/useApi';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = [
  'Safety Equipment', 'Railway Tools', 'Maintenance Supplies',
  'Testing & Inspection', 'PPE & Workwear',
  'Industrial Equipment', 'Electrical & Electronics',
  'Civil & Construction', 'IT & Technology', 'Other',
];

const GST_RATES = ['0', '5', '12', '18', '28'];

/* ── CSV helpers ─────────────────────────────────────────────────────────── */
const CSV_HEADERS = [
  'name','category','price','mrp','gstRate','stockQty',
  'description','imageUrl','badge','featured','tagline','sku',
];

function productsToCSV(products) {
  const rows = [CSV_HEADERS.join(',')];
  products.forEach(p => {
    rows.push(CSV_HEADERS.map(h => {
      const v = p[h] ?? '';
      return typeof v === 'string' && (v.includes(',') || v.includes('"') || v.includes('\n'))
        ? `"${v.replace(/"/g, '""')}"`
        : v;
    }).join(','));
  });
  return rows.join('\n');
}

function csvToProducts(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map((line, i) => {
    const vals = [];
    let cur = ''; let inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { vals.push(cur); cur = ''; }
      else cur += ch;
    }
    vals.push(cur);
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = vals[idx]?.trim() ?? ''; });
    return {
      name:        obj.name,
      category:    obj.category || 'Safety Equipment',
      price:       parseFloat(obj.price) || 0,
      mrp:         obj.mrp ? parseFloat(obj.mrp) : null,
      gstRate:     parseInt(obj.gstRate) || 18,
      stockQty:    parseInt(obj.stockQty) || 0,
      description: obj.description || '',
      imageUrl:    obj.imageUrl || '',
      badge:       obj.badge || '',
      featured:    obj.featured === 'true' || obj.featured === '1',
      tagline:     obj.tagline || '',
      sku:         obj.sku || '',
    };
  });
}

/* ── Product form ───────────────────────────────────────────────────────── */
const ProductForm = ({ initial, onSave, onCancel, saving }) => {
  const [form, setForm] = useState(initial || {
    name: '', category: 'Safety Equipment', price: '', mrp: '', gstRate: '18',
    stockQty: '0', description: '', imageUrl: '', badge: '', featured: false,
    tagline: '', sku: '',
  });
  const ch = (k) => (e) => setForm(p => ({
    ...p, [k]: e.type === 'checkbox' ? e.target.checked : e.target.value
  }));

  const Input = ({ k, label, type='text', req, ph, full }) => (
    <div className={full ? 'col-span-2' : ''}>
      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
        {label}{req && <span className="text-red-400 ml-1">*</span>}
      </label>
      <input required={req} type={type} value={form[k]} onChange={ch(k)} placeholder={ph}
        className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white
                   focus:outline-none focus:border-blue-500 placeholder-gray-600 transition-colors" />
    </div>
  );

  return (
    <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }}
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
          <Input k="name"     label="Product Name"       req ph="e.g. Safety Helmet ISI" full />
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Category *</label>
            <select required value={form.category} onChange={ch('category')}
              className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <Input k="price"    label="Price (₹)" type="number" req ph="480" />
          <Input k="mrp"      label="MRP (₹)"    type="number"    ph="650 (optional)" />
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">GST Rate *</label>
            <select value={form.gstRate} onChange={ch('gstRate')}
              className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none">
              {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
            </select>
          </div>
          <Input k="stockQty" label="Stock Qty"  type="number"    ph="100" />
          <Input k="sku"      label="SKU"                         ph="NGP-0001 (optional)" />
          <Input k="badge"    label="Badge"                       ph="Bestseller / New (optional)" />
          <Input k="tagline"  label="Tagline"                     ph="Short selling line" full />
          <Input k="imageUrl" label="Image URL"                   ph="https://…" full />
          <div className="col-span-2">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Description</label>
            <textarea value={form.description} onChange={ch('description')} rows={3}
              placeholder="Full product description…"
              className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white
                         focus:outline-none focus:border-blue-500 resize-none" />
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-900 rounded-xl border border-gray-700">
            <input type="checkbox" id="featured" checked={form.featured} onChange={ch('featured')}
              className="w-4 h-4 rounded accent-blue-500" />
            <label htmlFor="featured" className="text-sm text-gray-300 font-medium cursor-pointer">
              Featured Product (shown on homepage)
            </label>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 brand-gradient text-white font-bold rounded-xl text-sm hover:opacity-90 disabled:opacity-60">
            {saving
              ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
              : <CheckCircle className="h-4 w-4"/>}
            {saving ? 'Saving…' : initial ? 'Update Product' : 'Create Product'}
          </button>
          <button type="button" onClick={onCancel}
            className="px-6 py-2.5 bg-gray-700 text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-600 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </motion.div>
  );
};

/* ── Bulk upload panel ──────────────────────────────────────────────────── */
const BulkUploadPanel = ({ onClose, onSuccess }) => {
  const { toast } = useToast();
  const [file, setFile]     = useState(null);
  const [preview, setPreview] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState([]);
  const fileRef = useRef();

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setErrors([]);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const rows = csvToProducts(ev.target.result);
        const errs = [];
        rows.forEach((r, i) => {
          if (!r.name) errs.push(`Row ${i+2}: name is required`);
          if (!r.price || r.price <= 0) errs.push(`Row ${i+2}: valid price required`);
        });
        setErrors(errs);
        setPreview(rows.slice(0, 5));
      } catch (err) {
        setErrors([err.message]);
        setPreview([]);
      }
    };
    reader.readAsText(f);
  };

  const handleUpload = async () => {
    if (!preview.length || errors.length) return;
    setUploading(true);
    let success = 0, fail = 0;
    // Re-parse full file
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const rows = csvToProducts(ev.target.result);
        for (const row of rows) {
          try { await productsApi.create(row); success++; }
          catch { fail++; }
        }
        toast({ title: `Bulk upload complete: ${success} added, ${fail} failed` });
        onSuccess();
        onClose();
      } catch (err) {
        toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
      } finally {
        setUploading(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }}
      className="bg-gray-800 rounded-2xl border border-amber-700/50 p-6 mb-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white text-lg flex items-center gap-2">
          <Upload className="h-5 w-5 text-amber-400"/> Bulk Upload Products
        </h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400"><X className="h-4 w-4"/></button>
      </div>

      <div className="bg-gray-900 rounded-xl p-4 mb-4 text-sm text-gray-300">
        <p className="font-semibold mb-1.5 text-white">CSV Format</p>
        <code className="text-xs text-green-400 block break-all">
          name,category,price,mrp,gstRate,stockQty,description,imageUrl,badge,featured,tagline,sku
        </code>
        <p className="text-xs text-gray-500 mt-2">required: name, category, price · all others optional</p>
      </div>

      <div className="flex gap-3 mb-4">
        <button onClick={() => fileRef.current.click()}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors">
          <FileText className="h-4 w-4"/> Choose CSV File
        </button>
        <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden"/>
        {file && <span className="text-sm text-gray-300 self-center">{file.name}</span>}
      </div>

      {errors.length > 0 && (
        <div className="bg-red-950/50 border border-red-800 rounded-xl p-3 mb-4">
          <p className="text-red-400 font-bold text-xs mb-1.5">Validation Errors:</p>
          {errors.slice(0, 5).map((e, i) => <p key={i} className="text-red-300 text-xs">{e}</p>)}
        </div>
      )}

      {preview.length > 0 && !errors.length && (
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2 font-semibold">Preview (first {preview.length} rows):</p>
          <div className="overflow-x-auto rounded-xl border border-gray-700">
            <table className="w-full text-xs text-gray-300">
              <thead><tr className="bg-gray-900">
                {['Name','Category','Price','MRP','Stock'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-bold text-gray-400">{h}</th>
                ))}
              </tr></thead>
              <tbody>{preview.map((r, i) => (
                <tr key={i} className="border-t border-gray-700/50">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2 text-gray-400">{r.category}</td>
                  <td className="px-3 py-2 text-green-400">₹{r.price}</td>
                  <td className="px-3 py-2 text-gray-400">{r.mrp || '—'}</td>
                  <td className="px-3 py-2">{r.stockQty}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {preview.length > 0 && !errors.length && (
        <button onClick={handleUpload} disabled={uploading}
          className="flex items-center gap-2 px-6 py-2.5 btn-gold rounded-xl text-sm font-bold disabled:opacity-60">
          {uploading
            ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
            : <Upload className="h-4 w-4"/>}
          {uploading ? 'Uploading…' : 'Upload All Products'}
        </button>
      )}
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

  const { items, loading, total, setFilter, refetch } = usePaginated(
    productsApi.list, { size: 20 }
  );
  const [create, { loading: creating }] = useMutation(productsApi.create);
  const [update, { loading: updating }] = useMutation(productsApi.update);
  const [remove]                        = useMutation(productsApi.delete);
  const [toggle]                        = useMutation(
    (id) => import('@/lib/api').then(m => m.productsApi.updateStock(id, -1))
  );

  const handleSave = async (form) => {
    const data = {
      ...form,
      price:    parseFloat(form.price),
      mrp:      form.mrp ? parseFloat(form.mrp) : null,
      stockQty: parseInt(form.stockQty) || 0,
      gstRate:  parseInt(form.gstRate) || 18,
    };
    const res = editing ? await update(editing.id, data) : await create(data);
    if (res.error) { toast({ title: 'Failed', description: res.error, variant: 'destructive' }); return; }
    toast({ title: editing ? '✓ Product updated' : '✓ Product created' });
    setShowForm(false); setEditing(null); refetch();
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const res = await remove(id);
    if (res.error) { toast({ title: 'Delete failed', description: res.error, variant: 'destructive' }); return; }
    toast({ title: '✓ Product deleted' });
    refetch();
  };

  const handleDownloadCSV = () => {
    const csv = productsToCSV(items);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `navgrow-products-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `✓ Downloaded ${items.length} products as CSV` });
  };

  const handleDownloadTemplate = () => {
    const csv = CSV_HEADERS.join(',') + '\nSample Safety Helmet,Safety Equipment,480,650,18,100,Product description here,https://image-url.com,Bestseller,false,Your Safety Partner,NGP-001';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'navgrow-products-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Products</h1>
          <p className="text-gray-400 text-sm mt-0.5">{total} products in catalogue</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleDownloadTemplate} title="Download blank CSV template"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-xs font-bold transition-colors">
            <FileText className="h-3.5 w-3.5"/> Template
          </button>
          <button onClick={handleDownloadCSV} title="Export all products as CSV"
            className="flex items-center gap-2 px-3.5 py-2 bg-green-700 hover:bg-green-600 text-white rounded-xl text-xs font-bold transition-colors">
            <Download className="h-3.5 w-3.5"/> Export CSV
          </button>
          <button onClick={() => { setShowBulk(b=>!b); setShowForm(false); setEditing(null); }}
            className="flex items-center gap-2 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-colors">
            <Upload className="h-3.5 w-3.5"/> Bulk Upload
          </button>
          <button onClick={() => { setShowForm(f=>!f); setEditing(null); setShowBulk(false); }}
            className="flex items-center gap-2 px-4 py-2 brand-gradient text-white font-bold rounded-xl text-sm hover:opacity-90">
            <Plus className="h-4 w-4"/> Add Product
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label:'Total Products', value:total, icon:Package, color:'text-blue-400' },
          { label:'In Stock', value:items.filter(p=>p.stockQty>0).length, icon:CheckCircle, color:'text-green-400' },
          { label:'Low Stock (<10)', value:items.filter(p=>p.stockQty>0&&p.stockQty<10).length, icon:AlertCircle, color:'text-amber-400' },
          { label:'Out of Stock', value:items.filter(p=>p.stockQty<=0).length, icon:X, color:'text-red-400' },
        ].map(s=>(
          <div key={s.label} className="bg-gray-800 rounded-xl p-3.5 border border-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`h-4 w-4 ${s.color}`}/>
              <span className="text-xs text-gray-400 font-medium">{s.label}</span>
            </div>
            <p className="text-2xl font-extrabold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"/>
          <input value={search}
            onChange={e => { setSearch(e.target.value); setFilter('q', e.target.value || undefined); }}
            placeholder="Search products…"
            className="pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white
                       placeholder-gray-500 focus:outline-none focus:border-blue-500 w-56 transition-colors"/>
        </div>
        <select value={catFilter}
          onChange={e => { setCatFilter(e.target.value); setFilter('category', e.target.value || undefined); }}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white focus:outline-none">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <button onClick={() => { setSearch(''); setCatFilter(''); setFilter('q',undefined); setFilter('category',undefined); }}
          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-sm transition-colors flex items-center gap-1.5">
          <RefreshCw className="h-3.5 w-3.5"/> Reset
        </button>
      </div>

      {/* Forms */}
      <AnimatePresence>
        {showBulk && <BulkUploadPanel onClose={()=>setShowBulk(false)} onSuccess={refetch}/>}
        {(showForm || editing) && (
          <ProductForm
            initial={editing}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditing(null); }}
            saving={creating || updating}
          />
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Product','Category','Price / MRP','Stock','Status','Featured','Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? [...Array(6)].map((_,i) => (
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
                            ? <img src={p.imageUrl} alt={p.name}
                                className="w-10 h-10 rounded-xl object-cover bg-gray-100 border border-gray-200"
                                onError={e=>{e.target.style.display='none';}}/>
                            : <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><Package className="h-4 w-4 text-blue-300"/></div>
                          }
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 text-xs leading-snug truncate max-w-[160px]">{p.name}</p>
                            {p.badge && <span className="text-[10px] font-bold text-amber-600">{p.badge}</span>}
                            {p.sku && <p className="text-[10px] text-gray-400 font-mono">{p.sku}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{p.category}</td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-gray-900 text-xs">₹{p.price?.toLocaleString('en-IN')}</p>
                        {p.mrp && p.mrp > p.price && <p className="text-[10px] text-gray-400 line-through">₹{p.mrp?.toLocaleString('en-IN')}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                          p.stockQty <= 0 ? 'bg-red-50 text-red-700' :
                          p.stockQty < 10 ? 'bg-amber-50 text-amber-700' :
                          'bg-green-50 text-green-700'
                        }`}>{p.stockQty}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                          p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>{p.active ? 'Active' : 'Hidden'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {p.featured
                          ? <span className="text-amber-500 text-xs font-bold">★ Yes</span>
                          : <span className="text-gray-400 text-xs">—</span>}
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
            <p className="font-semibold">No products found</p>
            <p className="text-sm mt-1">Add your first product or upload a CSV file</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminProducts;
