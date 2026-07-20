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
import ImageUploadInput from '@/components/admin/ImageUploadInput';
import { filesApi } from '@/lib/api';

const CATEGORIES = [
  'Safety Equipment','Railway Tools','Maintenance Supplies',
  'Testing & Inspection','PPE & Workwear',
  'Industrial Equipment','Electrical & Electronics',
  'Civil & Construction','IT & Technology','Other',
];
const GST_RATES = ['0','5','12','18','28'];

/* ── CSV helpers ─────────────────────────────────────────────────────────── */
// Full column set — matches the backend ProductRequest DTO exactly.
// Rich text/list fields are supported; in CSV, encode line-separated lists
// (features, benefits, applications, specifications, imageUrls) using a
// literal "\n" between items, or wrap the whole multi-line cell in quotes.
const CSV_HEADERS = [
  'name','category','price','mrp','gstRate','stockQty','minOrderQty',
  'description','imageUrl','badge','featured',
  'tagline','summary','warranty',
  'features','benefits','applications','specifications','imageUrls',
];
// Only name, category and price are mandatory; everything else is optional.
const CSV_REQUIRED = ['name','category','price'];

function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function productsToCSV(products) {
  const rows = [CSV_HEADERS.join(',')];
  products.forEach(p => {
    rows.push(CSV_HEADERS.map(h => csvCell(p[h] ?? '')).join(','));
  });
  return rows.join('\n');
}

// Full RFC-4180-style parser: handles quoted fields containing commas,
// embedded newlines, and escaped "" quotes — so Excel / Google Sheets
// exports (including \r\n line endings) import cleanly.
function parseCSV(text, delimiter = ',') {
  const rows = [];
  let row = [], cur = '', inQ = false;
  // normalise BOM
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += ch;
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === delimiter) {
      row.push(cur); cur = '';
    } else if (ch === '\n' || ch === '\r') {
      // handle \r\n as a single break; ignore lone \r before \n
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      rows.push(row); row = [];
    } else cur += ch;
  }
  // flush last field/row if any content remains
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  // drop fully-empty trailing rows
  return rows.filter(r => r.some(c => c.trim() !== ''));
}

// Canonicalise a header for matching: lowercase, strip spaces/underscores/
// hyphens and anything non-alphanumeric — so "Product Name", "product_name"
// and "NAME " all resolve to the same key.
function normHeader(h) {
  return String(h || '').replace(/^\uFEFF/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Common spreadsheet spellings → our canonical column names. Real-world CSVs
// exported from Excel/Sheets capitalise or rename headers, which previously
// failed hard with "CSV is missing required column(s): name, category, price".
const HEADER_ALIASES = {
  name: 'name', productname: 'name', product: 'name', title: 'name', itemname: 'name',
  category: 'category', productcategory: 'category', cat: 'category', type: 'category',
  price: 'price', sellingprice: 'price', saleprice: 'price', rate: 'price', amount: 'price', unitprice: 'price',
  mrp: 'mrp', listprice: 'mrp', maximumretailprice: 'mrp',
  gstrate: 'gstRate', gst: 'gstRate', tax: 'gstRate', taxrate: 'gstRate',
  stockqty: 'stockQty', stock: 'stockQty', quantity: 'stockQty', qty: 'stockQty', inventory: 'stockQty',
  minorderqty: 'minOrderQty', moq: 'minOrderQty', minimumorderquantity: 'minOrderQty',
  description: 'description', desc: 'description', details: 'description',
  imageurl: 'imageUrl', image: 'imageUrl', photo: 'imageUrl', picture: 'imageUrl', img: 'imageUrl',
  imageurls: 'imageUrls', images: 'imageUrls', gallery: 'imageUrls',
  badge: 'badge', label: 'badge',
  featured: 'featured', isfeatured: 'featured',
  tagline: 'tagline', summary: 'summary', warranty: 'warranty',
  features: 'features', benefits: 'benefits', applications: 'applications',
  specifications: 'specifications', specs: 'specifications',
};

// Detect the delimiter from the header line — Excel in many locales exports
// semicolon-separated "CSV"; tab-separated exports are also common.
export function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const counts = [[',', 0], [';', 0], ['\t', 0]].map(([d]) => {
    let n = 0, inQ = false;
    for (const ch of firstLine) {
      if (ch === '"') inQ = !inQ;
      else if (!inQ && ch === d) n++;
    }
    return [d, n];
  });
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ',';
}

export function csvToProducts(csvText) {
  const delimiter = detectDelimiter(csvText);
  const rows = parseCSV(csvText, delimiter);
  if (rows.length < 2) throw new Error('CSV must have a header row and at least one data row');
  const idx = {};
  rows[0].forEach((h, i) => {
    const canonical = HEADER_ALIASES[normHeader(h)];
    if (canonical && !(canonical in idx)) idx[canonical] = i;
  });
  // make sure the mandatory columns are present
  const missing = CSV_REQUIRED.filter(c => !(c in idx));
  if (missing.length) {
    throw new Error(
      `CSV is missing required column(s): ${missing.join(', ')}. ` +
      `Found headers: ${rows[0].map(h => `"${String(h).trim()}"`).join(', ')}. ` +
      `Tip: headers are matched case-insensitively — "Name", "Product Name", "Price", "Selling Price", "Category" all work. ` +
      `Use "Download Template" for a ready-made file.`
    );
  }

  const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
  const get = (cells, key) => (idx[key] != null ? (cells[idx[key]] ?? '').trim() : '');

  return rows.slice(1).map(cells => ({
    name:           get(cells, 'name'),
    category:       get(cells, 'category') || 'Safety Equipment',
    price:          num(get(cells, 'price')) ?? 0,
    mrp:            get(cells, 'mrp') ? num(get(cells, 'mrp')) : null,
    gstRate:        get(cells, 'gstRate') ? (num(get(cells, 'gstRate')) ?? 18) : 18,
    stockQty:       get(cells, 'stockQty') ? Math.trunc(num(get(cells, 'stockQty')) ?? 0) : 0,
    minOrderQty:    get(cells, 'minOrderQty') ? Math.max(1, Math.trunc(num(get(cells, 'minOrderQty')) ?? 1)) : 1,
    description:    get(cells, 'description'),
    imageUrl:       get(cells, 'imageUrl'),
    badge:          get(cells, 'badge'),
    featured:       ['true', '1', 'yes', 'y'].includes(get(cells, 'featured').toLowerCase()),
    tagline:        get(cells, 'tagline'),
    summary:        get(cells, 'summary'),
    warranty:       get(cells, 'warranty'),
    // list/multiline fields: allow literal "\n" in the cell as an item separator
    features:       get(cells, 'features').replace(/\\n/g, '\n'),
    benefits:       get(cells, 'benefits').replace(/\\n/g, '\n'),
    applications:   get(cells, 'applications').replace(/\\n/g, '\n'),
    specifications: get(cells, 'specifications').replace(/\\n/g, '\n'),
    imageUrls:      get(cells, 'imageUrls').replace(/\\n/g, '\n'),
  }));
}


/* ── Gallery upload — uploads one or more files, appends their URLs ───────── */
const GalleryUploadButton = ({ onUploaded }) => {
  const ref = React.useRef(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');
  const handle = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setBusy(true); setErr('');
    for (const f of files) {
      try {
        const { data } = await filesApi.upload(f);
        onUploaded(data.url);
      } catch (ex) {
        setErr(ex.response?.data?.message || `Upload failed for ${f.name}`);
        break;
      }
    }
    setBusy(false);
  };
  return (
    <div className="mt-2">
      <button type="button" onClick={() => ref.current?.click()} disabled={busy}
        className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-xs font-bold disabled:opacity-60 transition-colors">
        <Upload className="h-3.5 w-3.5"/>{busy ? 'Uploading…' : 'Upload images & add to gallery'}
      </button>
      <input ref={ref} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={handle} className="hidden"/>
      {err && <p className="text-red-400 text-xs mt-1">{err}</p>}
    </div>
  );
};

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
const ProductForm = ({ initial, onSave, onCancel, saving, categories = CATEGORIES }) => {
  const DEFAULTS = {
    name:'', category:'Safety Equipment', price:'', mrp:'', gstRate:'18',
    stockQty:'0', minOrderQty:'1', description:'', imageUrl:'', badge:'', featured:false, sku:'', active:true,
    tagline:'', summary:'', warranty:'', imageUrls:'', features:'', benefits:'', applications:'', specifications:'',
  };
  const [form, setForm] = useState({ ...DEFAULTS, ...(initial || {}) });

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
          <FormInput label="Min Order Qty" fieldKey="minOrderQty" type="number" placeholder="1" form={form} onChange={handleChange} />
          <FormInput label="Badge"        fieldKey="badge"    placeholder="Bestseller / New / 26% OFF" form={form} onChange={handleChange} />
          <div className="col-span-2">
            <ImageUploadInput label="Main Product Image" value={form.imageUrl}
              onChange={(url) => handleChange('imageUrl', url)} />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
              Category <span className="text-red-400">*</span>
            </label>
            <select required value={form.category} onChange={e => handleChange('category', e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500">
              {categories.map(c => <option key={c}>{c}</option>)}
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

          {/* ── Rich product detail (shown on the product detail page) ── */}
          <div className="col-span-2 mt-2 mb-1">
            <p className="text-xs font-bold text-blue-400 uppercase tracking-wide">Product Detail Page Content</p>
            <p className="text-[11px] text-gray-500">These appear on the product page. For list fields, put one item per line.</p>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Tagline</label>
            <input value={form.tagline} onChange={e => handleChange('tagline', e.target.value)}
              placeholder="Short catchy line shown under the product name"
              className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 placeholder-gray-600"/>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Summary</label>
            <textarea value={form.summary} onChange={e => handleChange('summary', e.target.value)}
              rows={2} placeholder="Longer overview shown at the top of the description tab (falls back to Description if empty)"
              className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 resize-y placeholder-gray-600"/>
          </div>

          <div className="col-span-2 md:col-span-1">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Key Features <span className="text-gray-600 normal-case">(one per line)</span></label>
            <textarea value={form.features} onChange={e => handleChange('features', e.target.value)}
              rows={4} placeholder={"Corrosion-resistant coating\nMeets IS 2925 standard\nAdjustable fit"}
              className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 resize-y placeholder-gray-600"/>
          </div>

          <div className="col-span-2 md:col-span-1">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Benefits <span className="text-gray-600 normal-case">(one per line)</span></label>
            <textarea value={form.benefits} onChange={e => handleChange('benefits', e.target.value)}
              rows={4} placeholder={"Reduces workplace injuries\nLong service life\nLowers replacement cost"}
              className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 resize-y placeholder-gray-600"/>
          </div>

          <div className="col-span-2 md:col-span-1">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Applications <span className="text-gray-600 normal-case">(one per line)</span></label>
            <textarea value={form.applications} onChange={e => handleChange('applications', e.target.value)}
              rows={4} placeholder={"Railway maintenance\nConstruction sites\nIndustrial plants"}
              className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 resize-y placeholder-gray-600"/>
          </div>

          <div className="col-span-2 md:col-span-1">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Specifications <span className="text-gray-600 normal-case">(Label: Value per line)</span></label>
            <textarea value={form.specifications} onChange={e => handleChange('specifications', e.target.value)}
              rows={4} placeholder={"Material: High-density polyethylene\nWeight: 350 g\nColour: Yellow"}
              className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 resize-y placeholder-gray-600"/>
          </div>

          <div className="col-span-2 md:col-span-1">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Warranty</label>
            <textarea value={form.warranty} onChange={e => handleChange('warranty', e.target.value)}
              rows={2} placeholder="e.g. 1-year manufacturer warranty against defects"
              className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 resize-y placeholder-gray-600"/>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Gallery Images <span className="text-gray-600 normal-case">(one URL per line — shown as a swipeable gallery on the product page)</span></label>
            <textarea value={form.imageUrls} onChange={e => handleChange('imageUrls', e.target.value)}
              rows={3} placeholder={"https://…/photo-2.jpg\nhttps://…/photo-3.jpg"}
              className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 resize-y placeholder-gray-600"/>
            <GalleryUploadButton onUploaded={(url) => handleChange('imageUrls', (form.imageUrls ? form.imageUrls.replace(/\n+$/,'') + '\n' : '') + url)} />
            {form.imageUrls && form.imageUrls.split('\n').map(u=>u.trim()).filter(Boolean).length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {form.imageUrls.split('\n').map(u=>u.trim()).filter(Boolean).slice(0,8).map((u,i)=>(
                  <img key={i} loading="lazy" decoding="async" src={u} alt="" className="h-14 w-14 object-cover rounded-lg border border-gray-700" onError={e=>{e.target.style.display='none'}}/>
                ))}
              </div>
            )}
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

        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 brand-gradient text-white font-bold rounded-xl text-sm
                       hover:opacity-90 disabled:opacity-60 transition-opacity">
            {saving ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                    : <CheckCircle className="h-4 w-4"/>}
            {saving ? 'Saving…' : initial ? 'Update Product' : 'Publish Product'}
          </button>
          <button type="button" disabled={saving}
            onClick={() => onSave({ ...form, active: false })}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-700 text-gray-200 rounded-xl text-sm font-bold hover:bg-gray-600 transition-colors disabled:opacity-60">
            Save as Draft
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
          if (!r.category) errs.push(`Row ${i+2}: category is required`);
          if (!r.price || r.price <= 0) errs.push(`Row ${i+2}: a valid price (> 0) is required`);
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
        // Build clean payloads matching the backend ProductRequest DTO,
        // carrying ALL fields (including rich detail/list fields).
        const payload = rows.map(row => ({
          name:           row.name,
          category:       row.category || 'Safety Equipment',
          price:          Number(row.price),
          mrp:            row.mrp != null ? Number(row.mrp) : null,
          gstRate:        Number(row.gstRate) || 18,
          stockQty:       Number(row.stockQty) || 0,
          minOrderQty:    Number(row.minOrderQty) || 1,
          description:    row.description || '',
          imageUrl:       row.imageUrl || '',
          badge:          row.badge || '',
          featured:       Boolean(row.featured),
          tagline:        row.tagline || '',
          summary:        row.summary || '',
          warranty:       row.warranty || '',
          features:       row.features || '',
          benefits:       row.benefits || '',
          applications:   row.applications || '',
          specifications: row.specifications || '',
          imageUrls:      row.imageUrls || '',
        }));

        // One transactional request instead of one HTTP call per row.
        const res = await productsApi.bulkCreate(payload);
        const created = res?.data?.created ?? payload.length;
        toast({ title: `Bulk upload complete: ${created} product${created === 1 ? '' : 's'} added` });
        onSuccess(); onClose();
      } catch (err) {
        const msg = err.response?.data?.message
          || err.response?.data?.error
          || err.message
          || 'Upload failed';
        toast({ title: 'Bulk upload failed', description: msg, variant: 'destructive' });
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
        <p className="font-semibold mb-1.5 text-white">CSV columns <span className="text-gray-400 font-normal">(only name, category, price required)</span></p>
        <p className="text-amber-300 break-all">{CSV_HEADERS.join(', ')}</p>
        <p className="text-gray-500 mt-1.5">Numeric: price, mrp, gstRate, stockQty, minOrderQty. featured: true/false. For list fields (features, benefits, applications, specifications, imageUrls) put items on separate lines, or use <span className="text-gray-300">\n</span> between items. Download the template for a ready-made example.</p>
        <p className="text-gray-500 mt-1">Best practice: <span className="text-gray-300">Export</span> your current products first to get a perfectly-formatted file to edit.</p>
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

  // Live category list — admin-defined Catalog categories merged with any
  // legacy categories already used on products; static list as offline fallback.
  const [liveCategories, setLiveCategories] = React.useState(CATEGORIES);
  React.useEffect(() => {
    productsApi.categories()
      .then(r => {
        const merged = [...new Set([...(Array.isArray(r.data) ? r.data : []), ...CATEGORIES])];
        if (merged.length) setLiveCategories(merged);
      })
      .catch(() => {});
  }, []);

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
      minOrderQty: Number(form.minOrderQty)||1,
      description: form.description||'',
      imageUrl:    form.imageUrl||'',
      badge:       form.badge||'',
      featured:    Boolean(form.featured),
      sku:         form.sku||'',
      tagline:        form.tagline||'',
      summary:        form.summary||'',
      warranty:       form.warranty||'',
      imageUrls:      form.imageUrls||'',
      features:       form.features||'',
      benefits:       form.benefits||'',
      applications:   form.applications||'',
      specifications: form.specifications||'',
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
    // Build a correctly-escaped example row that exercises the rich/list fields,
    // so admins can see exactly how multi-line columns should look.
    const example = {
      name: 'Sample Safety Helmet ISI',
      category: 'Safety Equipment',
      price: 480, mrp: 650, gstRate: 18, stockQty: 100, minOrderQty: 1,
      description: 'ISI-marked industrial safety helmet with adjustable harness.',
      imageUrl: 'https://example.com/helmet.jpg',
      badge: 'Bestseller', featured: 'false',
      tagline: 'Certified head protection for every site',
      summary: 'A durable, lightweight helmet built to IS 2925 for railway and construction use.',
      warranty: '1-year manufacturer warranty against defects',
      features: 'Corrosion-resistant shell\nAdjustable ratchet fit\nMeets IS 2925',
      benefits: 'Reduces injury risk\nAll-day comfort\nLong service life',
      applications: 'Railway maintenance\nConstruction sites\nIndustrial plants',
      specifications: 'Material: HDPE\nWeight: 350 g\nColour: Yellow',
      imageUrls: 'https://example.com/helmet-2.jpg\nhttps://example.com/helmet-3.jpg',
    };
    const csv = CSV_HEADERS.join(',') + '\n' + CSV_HEADERS.map(h => csvCell(example[h] ?? '')).join(',');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
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
            categories={liveCategories}
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
