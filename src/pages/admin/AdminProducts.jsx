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
import {
  Plus, Edit2, Trash2, Package, Search, CheckCircle,
  Download, Upload, FileText, X, AlertTriangle,
  BellRing, Loader2, Send, ChevronDown, MapPin, RotateCcw,
} from 'lucide-react';
import { productsApi, catalogApi, stockNotifyApi, deliveryApi } from '@/lib/api';
import { parseRules, matchesPincode } from '@/lib/pincodeRules';
import { usePaginated, useMutation } from '@/hooks/useApi';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import ImageUploadInput from '@/components/admin/ImageUploadInput';
import VariantEditor from '@/components/admin/VariantEditor';
import { initOptionsState, optionsPayload, validateOptions, summarizeRows } from '@/lib/variantEditor';
import { filesApi } from '@/lib/api';
import { GST_RATES, gstLabel } from '@/lib/gst';
import { googleListingProblems } from '@/lib/productSchema';
import ProductImportPanel from '@/components/admin/ProductImportPanel';
import { exportWorkbook, templateWorkbook, fetchAllProducts, apiErrorMessage } from '@/lib/productImport';
import { downloadBlob, datedName, XLSX_TYPE } from '@/lib/download';

const CATEGORIES = [
  'Safety Equipment','Railway Tools','Maintenance Supplies',
  'Testing & Inspection','PPE & Workwear',
  'Industrial Equipment','Electrical & Electronics',
  'Civil & Construction','IT & Technology','Other',
];

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

/* ── Limited delivery area — sell a product only within chosen pincodes ──── */
// Exact pincodes (734001), prefixes (734* → every pincode starting 734) or
// ranges (734001-734015). Validated live here; the server re-validates and
// enforces it at checkout and order creation.
const DeliveryAreaEditor = ({ form, onChange }) => {
  const [zones, setZones] = React.useState([]);
  const [testPin, setTestPin] = React.useState('');
  const parsed = React.useMemo(() => parseRules(form.allowedPincodes), [form.allowedPincodes]);
  const on = !!form.deliveryRestricted;

  React.useEffect(() => {
    if (!on || zones.length) return;
    deliveryApi.zones()
      .then(({ data }) => setZones(Array.isArray(data) ? data.filter(z => z.active !== false && z.pincodePrefixes) : []))
      .catch(() => {});
  }, [on, zones.length]);

  const addZone = (id) => {
    const z = zones.find(x => String(x.id) === String(id));
    if (!z) return;
    const merged = parseRules(`${form.allowedPincodes || ''}, ${z.pincodePrefixes}`).normalized;
    onChange('allowedPincodes', merged);
    if (!form.deliveryAreaNote) onChange('deliveryAreaNote', `${z.name} only`);
  };

  const testValid = /^[1-9]\d{5}$/.test(testPin);
  const testOk = testValid && matchesPincode(form.allowedPincodes, testPin);

  return (
    <div className={`col-span-2 rounded-xl border p-4 transition-colors ${on ? 'border-indigo-500/60 bg-indigo-950/30' : 'border-gray-700 bg-gray-900'}`}>
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={on} onChange={e => onChange('deliveryRestricted', e.target.checked)}
          className="w-4 h-4 mt-0.5 rounded accent-indigo-500" />
        <span>
          <span className="text-sm text-white font-semibold flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-indigo-400" /> Deliver only to selected pincodes
          </span>
          <span className="block text-[11px] text-gray-400 mt-0.5">
            For perishable, oversized, hazardous or locally-installed items. Buyers elsewhere can't check out this
            product — they're offered a quote instead. Leave off to sell everywhere your delivery zones reach.
          </span>
        </span>
      </label>

      {on && (
        <div className="mt-4 space-y-3">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Allowed pincodes</label>
              {zones.length > 0 && (
                <select value="" onChange={e => addZone(e.target.value)}
                  className="px-2 py-1 bg-gray-800 border border-gray-700 rounded-lg text-[11px] text-gray-200 focus:outline-none">
                  <option value="">+ Add a delivery zone's pincodes…</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name} ({z.pincodePrefixes.split(',').length})</option>)}
                </select>
              )}
            </div>
            <textarea value={form.allowedPincodes || ''} onChange={e => onChange('allowedPincodes', e.target.value)}
              rows={3} placeholder={'734001, 734003, 7340*\n734101-734105'}
              className={`w-full px-3 py-2.5 bg-gray-900 border rounded-xl text-sm text-white font-mono focus:outline-none resize-y placeholder-gray-600 ${parsed.invalid.length ? 'border-red-500' : 'border-gray-700 focus:border-indigo-500'}`} />
            <p className="text-[11px] text-gray-500 mt-1">
              Exact pincode <code className="text-gray-300">734001</code> · prefix <code className="text-gray-300">734*</code> (all pincodes starting 734) ·
              range <code className="text-gray-300">734001-734015</code>. Separate with commas or new lines.
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[11px]">
              {parsed.valid.length > 0 ? (
                <span className="text-emerald-400 font-semibold">
                  ✓ {parsed.exact} pincode{parsed.exact === 1 ? '' : 's'} · {parsed.prefixes} prefix{parsed.prefixes === 1 ? '' : 'es'} · {parsed.ranges} range{parsed.ranges === 1 ? '' : 's'}
                </span>
              ) : (
                <span className="text-amber-400 font-semibold">Add at least one pincode, prefix or range.</span>
              )}
              {parsed.invalid.length > 0 && (
                <span className="text-red-400 font-semibold">✗ Not valid: {parsed.invalid.slice(0, 6).join(', ')}{parsed.invalid.length > 6 ? '…' : ''}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Shown to customers</label>
              <input value={form.deliveryAreaNote || ''} maxLength={255}
                onChange={e => onChange('deliveryAreaNote', e.target.value)}
                placeholder="e.g. Siliguri & Jalpaiguri only"
                className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 placeholder-gray-600" />
              <p className="text-[11px] text-gray-500 mt-1">Blank → we show a short list of the pincodes.</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Test a pincode</label>
              <div className="flex items-center gap-2">
                <input value={testPin} inputMode="numeric" placeholder="734001"
                  onChange={e => setTestPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-28 px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-indigo-500 placeholder-gray-600" />
                {testValid && (
                  <span className={`text-xs font-bold ${testOk ? 'text-emerald-400' : 'text-red-400'}`}>
                    {testOk ? '✓ Can be delivered' : '✗ Outside the area'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Product form — Input defined OUTSIDE to fix cursor jump bug ─────────── */
const ProductForm = ({ initial, onSave, onCancel, saving, categories = CATEGORIES }) => {
  const DEFAULTS = {
    name:'', category:'Safety Equipment', price:'', mrp:'', gstRate:'18', hsnCode:'',
    stockQty:'0', minOrderQty:'1', deliveryCharge:'', description:'', imageUrl:'', badge:'', featured:false, sku:'', active:true,
    tagline:'', summary:'', warranty:'', imageUrls:'', features:'', benefits:'', applications:'', specifications:'',
    deliveryRestricted:false, allowedPincodes:'', deliveryAreaNote:'',
    // Options & price range (e.g. cement by brand / grade / pack size) and bulk prices
    optionsEnabled:false, optionAxes:[{ name:'', values:'' }], optionRows:[], unitLabel:'', priceTiers:'',
  };
  // API nulls would turn controlled inputs uncontrolled — fall back to defaults.
  const cleanInitial = Object.fromEntries(Object.entries(initial || {}).filter(([, v]) => v !== null && v !== undefined));
  const [form, setForm] = useState(() => ({
    ...DEFAULTS, ...cleanInitial, ...(initial ? initOptionsState(initial) : {}),
    // The stock this form started from — the server applies only the change to
    // the live stock, so units sold while the form is open aren't put back.
    stockQtyBase: initial?.id != null && initial?.stockQty != null ? Number(initial.stockQty) : null,
  }));

  // Stable onChange handler — won't recreate on each render
  const handleChange = useCallback((key, value) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      // Turning options on: fixed bulk prices can't apply to every option — keep
      // only a percentage discount (each option gets its own fixed prices).
      if (key === 'optionsEnabled' && value && prev.priceTiers && !/^(\s*\d+\s*:\s*[\d.]+%\s*,?)+$/.test(prev.priceTiers)) {
        next.priceTiers = '';
      }
      return next;
    });
  }, []);
  // Presets (Cement, TMT…) suggest the GST rate and HSN code; an HSN already typed is kept.
  const suggestTax = useCallback(({ gstRate, hsnCode }) => {
    setForm(prev => ({ ...prev, gstRate: gstRate || prev.gstRate, hsnCode: prev.hsnCode || hsnCode || '' }));
  }, []);
  const optionSummary = form.optionsEnabled ? summarizeRows(form.optionRows) : null;

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
          <FormInput label="SKU"          fieldKey="sku"      placeholder="Blank = auto (NGP-…)" form={form} onChange={handleChange} />
          {form.optionsEnabled ? (
            <div className="col-span-2 md:col-span-1 rounded-xl border border-blue-900/60 bg-gray-900 px-3 py-2.5 text-xs text-gray-300">
              <p className="font-bold text-white">Price, MRP &amp; stock are set per option</p>
              <p className="text-gray-400 mt-0.5">
                {optionSummary?.min != null
                  ? `Range ₹${optionSummary.min.toLocaleString('en-IN')} – ₹${optionSummary.max.toLocaleString('en-IN')} · ${optionSummary.count} options · ${optionSummary.stock.toLocaleString('en-IN')} in stock`
                  : 'Fill the price table in "Sold in options" below.'}
              </p>
            </div>
          ) : (
          <>
          <FormInput label="Price (₹)"    fieldKey="price"    required type="number" placeholder="480" form={form} onChange={handleChange} />
          <FormInput label="MRP (₹)"      fieldKey="mrp"      type="number" placeholder="650" form={form} onChange={handleChange} />
          <FormInput label="Stock Qty"    fieldKey="stockQty" type="number" placeholder="100" form={form} onChange={handleChange} />
          </>
          )}
          <FormInput label="Min Order Qty" fieldKey="minOrderQty" type="number" placeholder="1" form={form} onChange={handleChange} />
          <FormInput label="Delivery Charge / unit (₹)" fieldKey="deliveryCharge" type="number" placeholder="Blank = zone default" form={form} onChange={handleChange} />
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
              {GST_RATES.map(r => <option key={r} value={r}>{gstLabel(r)}</option>)}
              {form.gstRate !== '' && form.gstRate != null && !GST_RATES.includes(String(form.gstRate)) && (
                <option value={String(form.gstRate)}>{form.gstRate}%</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">HSN / SAC Code</label>
            <input value={form.hsnCode} onChange={e => handleChange('hsnCode', e.target.value)}
              placeholder="Leave blank to use the category default"
              className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500" />
            <p className="text-[11px] text-gray-500 mt-1">Printed on the GST invoice. Blank inherits this category's tax rule.</p>
          </div>

          {/* Options & price range (brand / grade / size…) and bulk prices */}
          <VariantEditor form={form} onChange={handleChange} onSuggestTax={suggestTax} />

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

          {/* Limited delivery area */}
          <DeliveryAreaEditor form={form} onChange={handleChange} />

          {/* Visibility */}
          <div className="col-span-2 flex items-center gap-3 p-3 bg-gray-900 rounded-xl border border-gray-700">
            <input type="checkbox" id="active-check" checked={form.active !== false}
              onChange={e => handleCheckbox('active', e.target.checked)}
              className="w-4 h-4 rounded accent-green-500"/>
            <label htmlFor="active-check" className="text-sm text-gray-300 font-medium cursor-pointer">
              Visible in the shop <span className="text-gray-500 text-xs">(untick to keep it as a hidden draft)</span>
            </label>
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
            {saving ? 'Saving…' : initial ? 'Save Changes' : (form.active !== false ? 'Publish Product' : 'Save Product')}
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

/* ── Back-in-stock demand panel — pent-up demand captured from out-of-stock ── */
const StockRequestsPanel = () => {
  const { toast } = useToast();
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen]       = useState(false);
  const [notifying, setNotifying] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    stockNotifyApi.demand()
      .then(r => setRows(Array.isArray(r.data) ? r.data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const total = rows.reduce((s, r) => s + Number(r.count || 0), 0);

  const notify = async (slug, name) => {
    setNotifying(slug);
    try {
      const { data } = await stockNotifyApi.notify(slug);
      toast({ title: '✓ Customers notified', description: `${data?.emailsSent ?? 0} email(s) sent for "${name}".` });
      load();
    } catch (err) {
      toast({ title: 'Failed', description: err?.response?.data?.message || 'Could not send notifications.', variant: 'destructive' });
    } finally { setNotifying(null); }
  };

  if (!loading && rows.length === 0) return null; // nothing waiting — stay out of the way

  return (
    <div className="mb-6 rounded-2xl border border-blue-800/40 bg-blue-950/30 overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-blue-900/20 transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center"><BellRing className="h-4 w-4 text-blue-400"/></div>
          <div>
            <p className="text-white font-bold text-sm">Back-in-Stock Requests</p>
            <p className="text-gray-400 text-[11px]">
              {loading ? 'Loading…' : `${total} customer${total===1?'':'s'} waiting across ${rows.length} product${rows.length===1?'':'s'}`}
            </p>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open?'rotate-180':''}`}/>
      </button>
      {open && (
        <div className="px-4 pb-4">
          <p className="text-[11px] text-gray-500 mb-2">Pent-up demand — restock a product, then notify everyone waiting with one click.</p>
          <div className="space-y-1.5">
            {rows.map(r => (
              <div key={r.productSlug} className="flex items-center gap-3 bg-gray-900/60 rounded-xl px-3 py-2">
                <span className="w-7 h-7 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{r.count}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-semibold truncate">{r.productName || r.productSlug}</p>
                  <p className="text-gray-500 text-[11px] truncate">/{r.productSlug}</p>
                </div>
                <button onClick={() => notify(r.productSlug, r.productName || r.productSlug)} disabled={notifying===r.productSlug}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-green-600 hover:bg-green-700 text-white disabled:opacity-60">
                  {notifying===r.productSlug ? <Loader2 className="h-3 w-3 animate-spin"/> : <Send className="h-3 w-3"/>}
                  Notify all
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Main AdminProducts ─────────────────────────────────────────────────── */
const AdminProducts = () => {
  const { toast } = useToast();
  const [showForm,   setShowForm]   = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [showBulk,   setShowBulk]   = useState(false);
  const [importing,  setImporting]  = useState(false);   // a bulk import is saving — keep its panel open
  const [exporting,  setExporting]  = useState(false);
  const [search,     setSearch]     = useState('');
  const [catFilter,  setCatFilter]  = useState('');
  const [confirm,    setConfirm]    = useState(null); // { msg, onConfirm }

  // Live category list — admin-defined Catalog categories merged with any
  // legacy categories already used on products; static list as offline fallback.
  const [liveCategories, setLiveCategories] = React.useState(CATEGORIES);
  React.useEffect(() => {
    // Pull from BOTH sources so newly-added admin categories (which may have no
    // products yet) and categories already in use on products all appear.
    Promise.allSettled([
      productsApi.categories(),                 // derived from existing products
      catalogApi.list('PRODUCT_CATEGORY'),      // admin-managed taxonomy
    ]).then(([fromProducts, fromCatalog]) => {
      const a = fromProducts.status === 'fulfilled' && Array.isArray(fromProducts.value.data) ? fromProducts.value.data : [];
      const b = fromCatalog.status === 'fulfilled' && Array.isArray(fromCatalog.value.data) ? fromCatalog.value.data.map(c => c.name).filter(Boolean) : [];
      const merged = [...new Set([...b, ...a, ...CATEGORIES])];
      if (merged.length) setLiveCategories(merged);
    });
  }, []);

  // Admin list shows EVERYTHING (drafts + removed products too), unlike the shop.
  const { items, total, loading, setFilter, refetch } = usePaginated(productsApi.manage, { size: 50 });
  const [statusFilter, setStatusFilter] = useState('');
  const [create, { loading: creating }] = useMutation(productsApi.create);
  const [update, { loading: updating }] = useMutation(productsApi.update);
  const [remove]                        = useMutation(productsApi.delete);

  // One mapping for every save path (form, draft, restore) so no field is ever
  // silently dropped again (HSN, visibility and 0% GST used to be lost here).
  const toPayload = (form) => ({
    name:        form.name,
    sku:         (form.sku || '').trim() || undefined,
    category:    form.category,
    // Sold in options: the product price is the lowest option price (the server
    // recomputes it from the options anyway).
    price:       form.optionsEnabled ? (summarizeRows(form.optionRows).min ?? 0) : Number(form.price),
    mrp:         form.mrp !== '' && form.mrp != null ? Number(form.mrp) : null,
    gstRate:     form.gstRate !== '' && form.gstRate != null && Number.isFinite(Number(form.gstRate)) ? Number(form.gstRate) : 18,
    hsnCode:     (form.hsnCode || '').trim() || undefined,
    stockQty:    Number(form.stockQty)||0,
    stockQtyBase: form.stockQtyBase != null && form.stockQtyBase !== '' ? Number(form.stockQtyBase) : undefined,
    minOrderQty: Number(form.minOrderQty)||1,
    deliveryCharge: form.deliveryCharge !== '' && form.deliveryCharge != null ? Number(form.deliveryCharge) : null,
    deliveryRestricted: Boolean(form.deliveryRestricted),
    allowedPincodes:    form.allowedPincodes || '',
    deliveryAreaNote:   (form.deliveryAreaNote || '').trim(),
    description: form.description||'',
    imageUrl:    form.imageUrl||'',
    badge:       form.badge||'',
    featured:    Boolean(form.featured),
    active:      form.active !== false,
    tagline:        form.tagline||'',
    summary:        form.summary||'',
    warranty:       form.warranty||'',
    imageUrls:      form.imageUrls||'',
    features:       form.features||'',
    benefits:       form.benefits||'',
    applications:   form.applications||'',
    specifications: form.specifications||'',
    // Options & bulk prices — only from the edit form (a quick "restore" sends
    // none, so the server keeps them as they are).
    ...(form.optionsEnabled !== undefined ? optionsPayload(form) : {}),
  });

  const handleSave = async (form) => {
    const optionErrors = validateOptions(form);
    if (optionErrors.length) {
      toast({ title: 'Check the options & prices', description: optionErrors.slice(0, 3).join(' '), variant: 'destructive' });
      return;
    }
    const payload = toPayload(form);
    if (payload.deliveryRestricted) {
      const pr = parseRules(payload.allowedPincodes);
      if (pr.invalid.length) {
        toast({ title: 'Check the pincode list', description: `Not valid: ${pr.invalid.slice(0, 6).join(', ')}. Use 734001, 734* or 734001-734015.`, variant: 'destructive' });
        return;
      }
      if (!pr.valid.length) {
        toast({ title: 'Add delivery pincodes', description: 'Limited delivery is on — list at least one pincode, prefix or range (or switch it off).', variant: 'destructive' });
        return;
      }
      payload.allowedPincodes = pr.normalized;
    }

    const action = () => editing ? update(editing.id, payload) : create(payload);

    const res = await action();
    if (res.error) {
      toast({ title:'Failed', description: res.error, variant:'destructive' }); return;
    }
    toast({ title: editing ? '✓ Product updated' : (payload.active ? '✓ Product published' : '✓ Saved as draft (hidden from the shop)') });
    // Restocked a sold-out product? Nudge the admin to tell the people waiting.
    const newStock = form.optionsEnabled ? summarizeRows(form.optionRows).stock : payload.stockQty;
    if (editing && Number(editing.stockQty ?? 0) <= 0 && newStock > 0) {
      setTimeout(() => toast({
        title: '📦 Back in stock',
        description: 'If customers asked to be notified, click "Notify all" in the Back-in-Stock Requests panel at the top of this page.',
      }), 600);
    }
    setShowForm(false); setEditing(null); refetch();
  };

  // Bring a draft / deactivated product back into the shop.
  const handleRestore = async (p) => {
    // stockQtyBase = the listed figure, so a list loaded a while ago can't put
    // back stock that has sold since.
    const res = await update(p.id, toPayload({ ...p, active: true, stockQtyBase: p.stockQty }));
    if (res.error) { toast({ title: 'Failed', description: res.error, variant: 'destructive' }); return; }
    toast({ title: `✓ "${p.name}" is live in the shop again` });
    refetch();
  };

  const handleDelete = (id, name) => {
    setConfirm({
      msg: `Remove "${name}" from the shop? It's kept as an inactive product — you can restore it any time.`,
      onConfirm: async () => {
        await remove(id);
        toast({ title: '✓ Product removed from the shop' });
        setConfirm(null); refetch();
      },
    });
  };

  // Every product (not just this page), one row per option — the same sheet
  // the bulk upload reads, so it can be edited in Excel and uploaded back.
  const handleExport = async () => {
    setExporting(true);
    try {
      const all = await fetchAllProducts(productsApi.manage);
      downloadBlob(exportWorkbook(all), datedName('navgrow-products', 'xlsx'), XLSX_TYPE);
      toast({ title: `✓ Exported ${all.length} product${all.length === 1 ? '' : 's'}`, description: 'Edit it in Excel and upload it with Bulk upload to update prices, stock or details.' });
    } catch (err) {
      toast({ title: 'Export failed', description: apiErrorMessage(err), variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    downloadBlob(templateWorkbook(), 'navgrow-products-template.xlsx', XLSX_TYPE);
  };

  // Stat cards
  const active   = items.filter(p => p.active !== false);
  const featured = items.filter(p => p.featured);
  const lowStock = items.filter(p => (p.stockQty ?? 0) < 10);

  return (
    <div className="p-4 sm:p-6">
      {confirm && (
        <ConfirmDialog message={confirm.msg} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)}/>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Products</h1>
          <p className="text-gray-400 text-sm mt-0.5">{total || items.length} products in catalogue (incl. drafts)</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleDownloadTemplate} title="Excel template with examples (incl. a product sold in options) and a how-to sheet"
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold hover:bg-gray-600 transition-colors">
            <FileText className="h-3.5 w-3.5"/> Template
          </button>
          <button onClick={handleExport} disabled={exporting} title="Export every product (one row per option) to Excel"
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold hover:bg-gray-600 transition-colors disabled:opacity-60">
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Download className="h-3.5 w-3.5"/>} Export
          </button>
          <button onClick={() => { if (!importing) setShowBulk(b=>!b); setShowForm(false); setEditing(null); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors">
            <Upload className="h-3.5 w-3.5"/> Bulk upload / update
          </button>
          <button onClick={() => { setShowForm(f=>!f); setEditing(null); if (!importing) setShowBulk(false); }}
            className="flex items-center gap-2 px-4 py-2 brand-gradient text-white font-bold rounded-xl text-sm hover:opacity-90">
            <Plus className="h-4 w-4"/> Add Product
          </button>
        </div>
      </div>

      {/* Back-in-stock pent-up demand (only appears when customers are waiting) */}
      <StockRequestsPanel />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label:'Products (this page)', value: items.length,   col:'text-blue-400' },
          { label:'Live in shop',   value: active.length,  col:'text-green-400' },
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
          {liveCategories.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setFilter('status', e.target.value||undefined); }}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white focus:outline-none">
          <option value="">All statuses</option>
          <option value="active">Live in shop</option>
          <option value="inactive">Drafts / removed</option>
          <option value="outofstock">Out of stock</option>
          <option value="lowstock">Low stock (&lt;10)</option>
          <option value="restricted">Limited delivery area</option>
          <option value="options">Sold in options</option>
        </select>
        {(search || catFilter || statusFilter) && (
          <button onClick={() => { setSearch(''); setCatFilter(''); setStatusFilter(''); setFilter('q',undefined); setFilter('category',undefined); setFilter('status',undefined); }}
            className="px-3 py-2 bg-gray-700 text-gray-400 rounded-xl text-sm hover:bg-gray-600 flex items-center gap-1.5">
            <X className="h-3.5 w-3.5"/> Clear
          </button>
        )}
      </div>

      <AnimatePresence>
        {showBulk && (
          <ProductImportPanel key="bulk"
            onClose={() => { if (!importing) setShowBulk(false); }}
            onBusyChange={setImporting}
            onDone={refetch}/>
        )}
        {(showForm || editing) && (
          <ProductForm
            key={editing?.id || 'new'}
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
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 text-xs">{p.name}</p>
                            <p className="text-[10px] text-gray-400">{p.sku || '—'}</p>
                            {/* What keeps this product out of Google's product results (photo, price). */}
                            {p.active !== false && googleListingProblems(p).map(msg => (
                              <span key={msg} title="Google shows products with a price and a photo in its product results and Shopping tab."
                                className="inline-flex items-center gap-1 mt-0.5 mr-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-bold">
                                <AlertTriangle className="h-2.5 w-2.5"/> {msg}
                              </span>
                            ))}
                            {p.deliveryRestricted && (
                              <span title={p.allowedPincodes || ''}
                                className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                                <MapPin className="h-2.5 w-2.5"/> {p.deliveryAreaNote || 'Limited delivery area'}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{p.category}</td>
                      <td className="px-4 py-3">
                        {p.hasVariants && Number(p.priceMax) > Number(p.price) ? (
                          <p className="font-bold text-gray-900 text-xs whitespace-nowrap">₹{p.price?.toLocaleString('en-IN')} – ₹{Number(p.priceMax).toLocaleString('en-IN')}</p>
                        ) : (
                          <p className="font-bold text-gray-900 text-xs">₹{p.price?.toLocaleString('en-IN')}</p>
                        )}
                        {p.hasVariants && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold">
                            {(p.variants || []).filter(v => v.active !== false).length} options
                          </span>
                        )}
                        {!p.hasVariants && p.mrp && <p className="text-[10px] text-gray-400 line-through">₹{p.mrp?.toLocaleString('en-IN')}</p>}
                        {p.priceTiers && <span className="block text-[10px] text-emerald-600 font-semibold">Bulk prices</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold ${(p.stockQty??0)<10?'text-red-600':'text-green-600'}`}>{p.stockQty??0}</span>
                        {(p.stockQty??0) <= 0 && <span className="block text-[10px] text-red-500 font-semibold">Out · RFQ only</span>}
                        {/* Sold in options: the total can look healthy while some options are sold out. */}
                        {p.hasVariants && (() => {
                          const act = (p.variants || []).filter(v => v.active !== false);
                          const out = act.filter(v => Number(v.stockQty || 0) < Math.max(1, Number(v.minOrderQty || p.minOrderQty || 1))).length;
                          return out > 0 && out < act.length
                            ? <span className="block text-[10px] text-amber-600 font-semibold">{out} of {act.length} options out</span> : null;
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs ${p.featured?'text-amber-600 font-bold':'text-gray-400'}`}>{p.featured?'★ Yes':'—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${p.active!==false?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>
                          {p.active!==false?'Live':'Draft / hidden'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {/* Always visible on touch screens (there's no hover on a phone). */}
                        <div className="flex gap-1.5 sm:opacity-60 sm:group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditing(p); setShowForm(false); if (!importing) setShowBulk(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="Edit" aria-label={`Edit ${p.name}`}>
                            <Edit2 className="h-3.5 w-3.5"/>
                          </button>
                          {p.active === false ? (
                            <button onClick={() => handleRestore(p)}
                              className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors" title="Publish / restore to shop" aria-label={`Publish ${p.name}`}>
                              <RotateCcw className="h-3.5 w-3.5"/>
                            </button>
                          ) : (
                            <button onClick={() => handleDelete(p.id, p.name)}
                              className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors" title="Remove from shop" aria-label={`Remove ${p.name}`}>
                              <Trash2 className="h-3.5 w-3.5"/>
                            </button>
                          )}
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
            <p className="text-sm mt-1">Add your first product, or add many at once with Bulk upload (Excel or CSV)</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminProducts;
