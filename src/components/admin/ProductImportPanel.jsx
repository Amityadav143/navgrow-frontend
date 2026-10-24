/**
 * © 2024–2026 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 *
 * Admin › Products › Bulk upload & update.
 *
 * Add or update many products at once from Excel, CSV or cells pasted from a
 * spreadsheet — including products sold in options (Cement by Brand × Grade ×
 * Pack size, TMT bars by diameter…). Nothing is saved until the admin has seen
 * a preview of every new product and every change. Logic: lib/productImport.js.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Upload, X, FileSpreadsheet, Download, ClipboardPaste, Loader2, CheckCircle, AlertTriangle, AlertCircle,
  ChevronDown, ChevronRight, Layers, Info, RefreshCw, Square, FileDown,
} from 'lucide-react';
import { productsApi } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { rupees } from '@/lib/pricing';
import { downloadBlob, datedName, XLSX_TYPE, CSV_TYPE } from '@/lib/download';
import {
  readSpreadsheetFile, rowsFromText, parseProductSheet, matchDrafts, draftProblems, draftNotes, isImportable,
  draftSummary, runImport, fetchAllProducts, templateWorkbook, exportWorkbook, resultsToCsv, apiErrorMessage,
} from '@/lib/productImport';

const MODES = [
  { id: 'upsert', label: 'Add new & update existing' },
  { id: 'create', label: 'Only add new products' },
  { id: 'update', label: 'Only update existing products' },
];

/** What happens to a draft, for the chips and the table. */
function statusOf(d) {
  if (d.action === 'skip') return 'skip';
  if (draftProblems(d).length) return 'problem';
  if (d.action === 'create') return 'create';
  return d.plan?.changes?.length ? 'update' : 'same';
}
const STATUS = {
  create:  { label: 'New',       chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-700/60' },
  update:  { label: 'Update',    chip: 'bg-blue-500/15 text-blue-300 border-blue-700/60' },
  same:    { label: 'No change', chip: 'bg-gray-700/60 text-gray-300 border-gray-600' },
  problem: { label: 'Problem',   chip: 'bg-red-500/15 text-red-300 border-red-700/60' },
  skip:    { label: 'Skipped',   chip: 'bg-gray-700/60 text-gray-400 border-gray-600' },
};
const FILTERS = [
  ['all', 'All'], ['create', 'New'], ['update', 'Updates'], ['same', 'No change'], ['problem', 'Problems'], ['skip', 'Skipped'],
];
const RESULT = {
  created:   { label: 'Added',      cls: 'text-emerald-300' },
  updated:   { label: 'Updated',    cls: 'text-blue-300' },
  unchanged: { label: 'No changes', cls: 'text-gray-400' },
  failed:    { label: 'Failed',     cls: 'text-red-300' },
  skipped:   { label: 'Not saved',  cls: 'text-amber-300' },
};

const priceRange = (range) => {
  if (!range) return '—';
  const [lo, hi] = range;
  return lo === hi ? rupees(lo) : `${rupees(lo)} – ${rupees(hi)}`;
};
const rowsText = (nums) => (nums.length === 1 ? `Row ${nums[0]}` : nums.length <= 3 ? `Rows ${nums.join(', ')}` : `Rows ${nums[0]}–${nums[nums.length - 1]}`);

/** The options of a draft as they will be saved, marked new / in the sheet / unchanged. */
function OptionRows({ d }) {
  const req = d.plan?.request;
  const rows = req?.variants || [];
  if (!rows.length) return null;
  const names = [req.option1Name, req.option2Name, req.option3Name].filter(Boolean);
  const inSheet = new Set(d.options.map(o => o.values.map(v => String(v).toLowerCase()).join('|')));
  const shown = rows.slice(0, 60);
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-700 mt-2">
      <table className="min-w-full text-[11px] text-gray-300">
        <thead>
          <tr className="bg-gray-900/80 text-gray-400">
            {[...names, 'SKU', 'Price', 'MRP', 'Stock', 'Min', 'Bulk prices', ''].map((h, i) => (
              <th key={i} className="px-2.5 py-1.5 text-left font-bold whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((v, i) => {
            const values = [v.option1, v.option2, v.option3].slice(0, names.length);
            const key = values.map(x => String(x || '').toLowerCase()).join('|');
            const tag = !v.id ? ['New', 'text-emerald-300'] : inSheet.has(key) ? ['In sheet', 'text-blue-300'] : ['Unchanged', 'text-gray-500'];
            return (
              <tr key={i} className={`border-t border-gray-800 ${v.active === false ? 'opacity-50' : ''}`}>
                {values.map((x, j) => <td key={j} className="px-2.5 py-1 whitespace-nowrap">{x}</td>)}
                <td className="px-2.5 py-1 font-mono text-[10px] text-gray-400">{v.sku || <span className="text-gray-600">auto</span>}</td>
                <td className="px-2.5 py-1 whitespace-nowrap">{v.price != null ? rupees(v.price) : '—'}</td>
                <td className="px-2.5 py-1 whitespace-nowrap text-gray-400">{v.mrp != null ? rupees(v.mrp) : ''}</td>
                <td className="px-2.5 py-1">{v.stockQty ?? 0}</td>
                <td className="px-2.5 py-1 text-gray-400">{v.minOrderQty ?? ''}</td>
                <td className="px-2.5 py-1 text-gray-400 whitespace-nowrap">{v.priceTiers || ''}</td>
                <td className={`px-2.5 py-1 font-bold whitespace-nowrap ${tag[1]}`}>{v.active === false ? 'Off' : tag[0]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length > shown.length && <p className="px-2.5 py-1.5 text-[11px] text-gray-500">…and {rows.length - shown.length} more options</p>}
    </div>
  );
}

function DraftRow({ d, open, onToggle }) {
  const st = statusOf(d);
  const problems = draftProblems(d);
  const notes = draftNotes(d);
  const s = draftSummary(d);
  const name = d.name || d.existing?.name || d.handle || d.productSku || d.simple?.sku || '—';
  const category = d.fields.category || d.existing?.category || '';
  const detail = st === 'problem' ? problems[0]
    : st === 'skip' ? d.skipReason
      : st === 'update' ? d.plan.changes.join(' · ')
        : st === 'same' ? 'Already matches the shop.'
          : d.fields.active === false ? 'Added as a draft (hidden from the shop)' : 'Added and published';
  const expandable = problems.length > 0 || notes.length > 0
    || (st !== 'skip' && (Boolean(d.plan?.request?.variants?.length) || st === 'update'));
  return (
    <>
      <tr className={`border-t border-gray-700/60 align-top ${expandable ? 'cursor-pointer hover:bg-gray-700/20' : ''}`}
        onClick={expandable ? onToggle : undefined}>
        <td className="pl-3 pr-1 py-2 w-6 text-gray-500">
          {expandable && (
            <button type="button" aria-expanded={open} aria-label={open ? 'Hide details' : 'Show details'}
              onClick={(e) => { e.stopPropagation(); onToggle(); }} className="p-0.5 rounded hover:bg-gray-700">
              {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          )}
        </td>
        <td className="px-2 py-2">
          <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap ${STATUS[st].chip}`}>{STATUS[st].label}</span>
        </td>
        <td className="px-2 py-2 min-w-[180px]">
          <p className="text-white text-xs font-semibold leading-snug">{name}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {rowsText(d.rowNumbers)}{category ? ` · ${category}` : ''}{d.matchedBy && d.action !== 'create' ? ` · found by ${d.matchedBy}` : ''}
          </p>
        </td>
        <td className="px-2 py-2 text-xs text-gray-300 whitespace-nowrap">
          {s.options ? (
            <span className="inline-flex items-center gap-1"><Layers className="h-3 w-3 text-blue-400" />{s.options}{s.inFile && s.inFile !== s.options ? <span className="text-gray-500"> ({s.inFile} in sheet)</span> : null}</span>
          ) : <span className="text-gray-600">—</span>}
        </td>
        <td className="px-2 py-2 text-xs text-gray-200 whitespace-nowrap">{priceRange(s.price)}</td>
        <td className="px-2 py-2 text-xs text-gray-300">{s.stock ?? '—'}</td>
        <td className={`px-2 py-2 text-[11px] leading-snug max-w-[420px] ${st === 'problem' ? 'text-red-300' : st === 'skip' || st === 'same' ? 'text-gray-500' : 'text-gray-300'}`}>
          <span className="line-clamp-2">{detail}</span>
          {problems.length > 1 && <span className="block text-red-400 font-semibold mt-0.5">+{problems.length - 1} more problem{problems.length > 2 ? 's' : ''}</span>}
          {!problems.length && notes.length > 0 && <span className="block text-amber-300/90 mt-0.5">{notes.length} note{notes.length > 1 ? 's' : ''}</span>}
        </td>
      </tr>
      {open && (
        <tr className="bg-gray-900/40">
          <td />
          <td colSpan={6} className="px-2 pb-3 pt-1">
            {problems.length > 0 && (
              <ul className="space-y-0.5 mb-2">
                {problems.map((m, i) => <li key={i} className="text-[11px] text-red-300 flex gap-1.5"><AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />{m}</li>)}
              </ul>
            )}
            {notes.length > 0 && (
              <ul className="space-y-0.5 mb-2">
                {notes.map((m, i) => <li key={i} className="text-[11px] text-amber-200/90 flex gap-1.5"><AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />{m}</li>)}
              </ul>
            )}
            {st === 'update' && d.plan.changes.length > 0 && (
              <ul className="space-y-0.5 mb-1 text-[11px] text-gray-300 list-disc pl-5">
                {d.plan.changes.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            )}
            {st !== 'skip' && <OptionRows d={d} />}
          </td>
        </tr>
      )}
    </>
  );
}

const ProductImportPanel = ({ onClose, onDone, onBusyChange }) => {
  const { toast } = useToast();
  const [stage, setStage] = useState('choose');      // choose | preview | importing | done
  const [source, setSource] = useState(null);         // { name, rows }
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [pasted, setPasted] = useState('');
  const [dragging, setDragging] = useState(false);
  const [catalogue, setCatalogue] = useState(null);
  const [catalogueError, setCatalogueError] = useState('');
  const [mode, setMode] = useState('upsert');
  const [filter, setFilter] = useState('all');
  const [openKeys, setOpenKeys] = useState(() => new Set());
  const [progress, setProgress] = useState({ done: 0, total: 0, name: '' });
  const [results, setResults] = useState(null);
  const [exporting, setExporting] = useState(false);
  const stopRef = useRef(false);
  const fileRef = useRef(null);

  // Every product (drafts too), to match the sheet against.
  const loadCatalogue = useCallback(async () => {
    setCatalogueError('');
    setCatalogue(null);
    try {
      setCatalogue(await fetchAllProducts(productsApi.manage));
    } catch (e) {
      setCatalogueError(apiErrorMessage(e));
    }
  }, []);
  useEffect(() => { loadCatalogue(); }, [loadCatalogue]);

  useEffect(() => { onBusyChange?.(stage === 'importing'); }, [stage, onBusyChange]);
  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);

  // Leaving the page mid-import would stop it halfway.
  useEffect(() => {
    if (stage !== 'importing') return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [stage]);

  const sheetError = useMemo(() => {
    if (!source) return '';
    try { parseProductSheet(source.rows); return ''; } catch (e) { return e.message; }
  }, [source]);

  // Re-planned whenever the mode changes (matching marks the drafts, so start from a fresh parse).
  const preview = useMemo(() => {
    if (!source || !catalogue || sheetError) return null;
    const sheet = parseProductSheet(source.rows);
    matchDrafts(sheet.drafts, catalogue, { mode });
    return sheet;
  }, [source, catalogue, mode, sheetError]);

  const counts = useMemo(() => {
    const c = { all: 0, create: 0, update: 0, same: 0, problem: 0, skip: 0 };
    for (const d of preview?.drafts || []) { c.all++; c[statusOf(d)]++; }
    return c;
  }, [preview]);
  const toSave = useMemo(() => (preview?.drafts || []).filter(d => isImportable(d) && (d.action === 'create' || d.plan?.changes?.length)), [preview]);
  const visible = useMemo(() => (preview?.drafts || []).filter(d => filter === 'all' || statusOf(d) === filter), [preview, filter]);
  const optionRows = useMemo(() => (preview?.drafts || []).reduce((n, d) => n + d.options.length, 0), [preview]);

  const accept = (name, rows) => {
    setSource({ name, rows });
    setFilter('all');
    setOpenKeys(new Set());
    setStage('preview');
  };

  const readFile = async (file) => {
    if (!file) return;
    setReadError('');
    setReading(true);
    try {
      accept(file.name, await readSpreadsheetFile(file));
    } catch (e) {
      setReadError(e.message || 'Could not read the file.');
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const readPasted = () => {
    setReadError('');
    if (!pasted.trim()) { setReadError('Paste the cells first — copy them in Excel or Google Sheets, including the header row.'); return; }
    accept('Pasted cells', rowsFromText(pasted));
  };

  const downloadTemplate = () => {
    downloadBlob(templateWorkbook(), 'navgrow-products-template.xlsx', XLSX_TYPE);
  };

  const downloadExport = async () => {
    setExporting(true);
    try {
      const all = catalogue || await fetchAllProducts(productsApi.manage);
      downloadBlob(exportWorkbook(all), datedName('navgrow-products', 'xlsx'), XLSX_TYPE);
      toast({ title: `✓ Exported ${all.length} product${all.length === 1 ? '' : 's'}`, description: 'Edit prices, stock or details in Excel and upload the file here again.' });
    } catch (e) {
      toast({ title: 'Export failed', description: apiErrorMessage(e), variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const startImport = async () => {
    if (!toSave.length) return;
    stopRef.current = false;
    setProgress({ done: 0, total: toSave.length, name: '' });
    setStage('importing');
    const api = {
      create: (req) => productsApi.create(req, { skipErrorToast: true }),
      update: (id, req) => productsApi.update(id, req, { skipErrorToast: true }),
      get: (slug) => productsApi.get(slug),
    };
    const res = await runImport(toSave, { api, onProgress: setProgress, shouldStop: () => stopRef.current });
    setResults(res);
    setStage('done');
    onDone?.();
    const n = (st) => res.filter(r => r.status === st).length;
    const failed = n('failed') + n('skipped');
    toast({
      title: failed ? `Import finished — ${failed} not saved` : '✓ Import complete',
      description: [n('created') && `${n('created')} added`, n('updated') && `${n('updated')} updated`, n('unchanged') && `${n('unchanged')} already up to date`]
        .filter(Boolean).join(' · ') || undefined,
      variant: failed && !(n('created') + n('updated')) ? 'destructive' : undefined,
    });
  };

  const reset = () => {
    setSource(null);
    setResults(null);
    setPasted('');
    setReadError('');
    setStage('choose');
    loadCatalogue();     // what was just saved is part of the catalogue now
  };

  const toggle = (key) => setOpenKeys(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const busy = stage === 'importing';
  const resultCount = (st) => (results || []).filter(r => r.status === st).length;

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-2xl border border-amber-700/50 p-4 sm:p-6 mb-5 shadow-xl">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-bold text-white text-lg flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-amber-400" /> Bulk upload &amp; update products
          </h3>
          <p className="text-gray-400 text-xs mt-1 max-w-2xl">
            Add or update many products at once from Excel or CSV — including products sold in options, like Cement by brand and grade.
            You'll see exactly what will be added and changed before anything is saved.
          </p>
        </div>
        <button onClick={onClose} disabled={busy} aria-label="Close bulk upload"
          className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 disabled:opacity-30"><X className="h-4 w-4" /></button>
      </div>

      {stage === 'choose' && (
        <div className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-xl bg-gray-900/70 border border-gray-700 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-400 mb-2">1 · Get the sheet</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={downloadTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold">
                  <Download className="h-3.5 w-3.5" /> Excel template
                </button>
                <button type="button" onClick={downloadExport} disabled={exporting || (!catalogue && !catalogueError)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-100 text-xs font-bold disabled:opacity-50">
                  {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />} Export my products
                </button>
              </div>
              <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
                The template has filled-in examples (Cement in 2 brands × 2 grades, TMT bars by diameter, a single product) and a “How to fill” sheet.
                To change prices or stock, export your products, edit, and upload the file back.
              </p>
            </div>
            <div className="rounded-xl bg-gray-900/70 border border-gray-700 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-400 mb-2">2 · Fill it in</p>
              <ul className="text-[11px] text-gray-300 space-y-1.5 leading-relaxed list-disc pl-4">
                <li>One row per product. <b className="text-white">Sold in options?</b> One row per option with the same Handle — e.g. Option1 Name <i>Brand</i>, Option1 Value <i>UltraTech</i>; Option2 Name <i>Grade</i>, Option2 Value <i>OPC 53</i> — each with its own SKU, price, stock and bulk prices.</li>
                <li><b className="text-white">Updating?</b> Blank cells keep what's saved; <code className="text-amber-300">none</code> clears a value. Options not in the sheet stay as they are.</li>
                <li>A supplier price list with <i>Brand</i> / <i>Grade</i> columns, or just <i>SKU, Price, Stock</i>, works too.</li>
              </ul>
            </div>
            <div className="rounded-xl bg-gray-900/70 border border-gray-700 p-4 flex flex-col">
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-400 mb-2">3 · Upload</p>
              <input ref={fileRef} type="file" className="hidden" aria-label="Choose a spreadsheet file"
                accept=".xlsx,.xlsm,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                onChange={(e) => readFile(e.target.files?.[0])} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={reading}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); readFile(e.dataTransfer.files?.[0]); }}
                className={`flex-1 min-h-[96px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 px-3 py-4 text-center transition-colors
                  ${dragging ? 'border-amber-400 bg-amber-500/10' : 'border-gray-600 hover:border-amber-500 hover:bg-gray-800'}`}>
                {reading ? <Loader2 className="h-6 w-6 text-amber-400 animate-spin" /> : <Upload className="h-6 w-6 text-amber-400" />}
                <span className="text-sm font-bold text-white">{reading ? 'Reading…' : 'Choose or drop a file'}</span>
                <span className="text-[11px] text-gray-500">Excel (.xlsx) or CSV · up to 5,000 rows</span>
              </button>
              <button type="button" onClick={() => setShowPaste(v => !v)}
                className="mt-2 inline-flex items-center gap-1.5 self-start text-[11px] font-bold text-blue-300 hover:text-blue-200">
                <ClipboardPaste className="h-3.5 w-3.5" /> {showPaste ? 'Hide paste box' : 'Or paste cells from Excel / Google Sheets'}
              </button>
            </div>
          </div>

          {showPaste && (
            <div className="rounded-xl bg-gray-900/70 border border-gray-700 p-3">
              <label htmlFor="bulk-paste" className="block text-[11px] font-bold text-gray-400 mb-1.5">
                Paste the cells, including the header row (Name, Category, Price…)
              </label>
              <textarea id="bulk-paste" value={pasted} onChange={(e) => setPasted(e.target.value)} rows={6} spellCheck={false}
                placeholder={'Name\tCategory\tBrand\tGrade\tPrice\tStock\nPortland Cement\tCivil & Construction\tUltraTech\tOPC 53\t450\t500'}
                className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-blue-500 placeholder-gray-600" />
              <button type="button" onClick={readPasted}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold">
                <ClipboardPaste className="h-3.5 w-3.5" /> Read pasted cells
              </button>
            </div>
          )}

          {readError && (
            <p role="alert" className="flex gap-2 items-start text-xs text-red-300 bg-red-900/30 border border-red-800 rounded-xl px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0" /> {readError}
            </p>
          )}
          {catalogueError && (
            <p role="alert" className="flex gap-2 items-center text-xs text-amber-200 bg-amber-900/20 border border-amber-800/60 rounded-xl px-3 py-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Couldn't load your products to check the sheet against ({catalogueError}).
              <button type="button" onClick={loadCatalogue} className="ml-auto inline-flex items-center gap-1 font-bold text-amber-100 hover:underline">
                <RefreshCw className="h-3 w-3" /> Retry
              </button>
            </p>
          )}
        </div>
      )}

      {stage === 'preview' && source && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <p className="text-sm text-white font-semibold flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-gray-400" /> {source.name}
              {preview && <span className="text-xs text-gray-500 font-normal">· {counts.all} product{counts.all === 1 ? '' : 's'}{optionRows ? ` · ${optionRows} option rows` : ''}</span>}
            </p>
            <button type="button" onClick={reset} className="text-xs font-bold text-blue-300 hover:text-blue-200">Choose another file</button>
          </div>

          {sheetError && (
            <p role="alert" className="flex gap-2 items-start text-xs text-red-300 bg-red-900/30 border border-red-800 rounded-xl px-3 py-2.5">
              <AlertCircle className="h-4 w-4 shrink-0" /> {sheetError}
            </p>
          )}
          {!sheetError && !catalogue && (
            catalogueError ? (
              <p role="alert" className="flex gap-2 items-center text-xs text-amber-200 bg-amber-900/20 border border-amber-800/60 rounded-xl px-3 py-2">
                <AlertTriangle className="h-4 w-4 shrink-0" /> Couldn't load your products ({catalogueError}).
                <button type="button" onClick={loadCatalogue} className="ml-auto inline-flex items-center gap-1 font-bold hover:underline"><RefreshCw className="h-3 w-3" /> Retry</button>
              </p>
            ) : (
              <p className="flex items-center gap-2 text-xs text-gray-400"><Loader2 className="h-4 w-4 animate-spin" /> Checking the sheet against your products…</p>
            )
          )}

          {preview && (
            <>
              {preview.notices.map((m, i) => (
                <p key={`n${i}`} className="flex gap-2 items-start text-[11px] text-blue-200 bg-blue-950/40 border border-blue-900/60 rounded-lg px-3 py-2"><Info className="h-3.5 w-3.5 shrink-0 mt-px" />{m}</p>
              ))}
              {preview.warnings.map((m, i) => (
                <p key={`w${i}`} className="flex gap-2 items-start text-[11px] text-amber-200 bg-amber-900/20 border border-amber-800/50 rounded-lg px-3 py-2"><AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />{m}</p>
              ))}

              <div className="flex flex-wrap items-center gap-2">
                <div role="radiogroup" aria-label="What to do" className="inline-flex flex-wrap rounded-lg border border-gray-700 overflow-hidden">
                  {MODES.map(m => (
                    <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} onClick={() => setMode(m.id)}
                      className={`px-3 py-1.5 text-[11px] font-bold ${mode === m.id ? 'bg-amber-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>{m.label}</button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Show">
                {FILTERS.filter(([id]) => id === 'all' || counts[id] > 0).map(([id, label]) => (
                  <button key={id} type="button" role="tab" aria-selected={filter === id} onClick={() => setFilter(id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${filter === id ? 'bg-white text-gray-900 border-white' : `${id === 'all' ? 'border-gray-600 text-gray-300' : STATUS[id].chip} hover:opacity-90`}`}>
                    {label} {counts[id]}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-700 max-h-[60vh] overflow-y-auto">
                <table className="min-w-full text-left">
                  <thead className="sticky top-0 bg-gray-900 z-10">
                    <tr className="text-[10px] uppercase tracking-wide text-gray-500">
                      <th className="w-6" /><th className="px-2 py-2 font-bold">Status</th><th className="px-2 py-2 font-bold">Product</th>
                      <th className="px-2 py-2 font-bold">Options</th><th className="px-2 py-2 font-bold">Price</th><th className="px-2 py-2 font-bold">Stock</th>
                      <th className="px-2 py-2 font-bold">What happens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map(d => <DraftRow key={d.key} d={d} open={openKeys.has(d.key)} onToggle={() => toggle(d.key)} />)}
                  </tbody>
                </table>
                {!visible.length && <p className="text-center text-xs text-gray-500 py-6">Nothing here.</p>}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button type="button" onClick={startImport} disabled={!toSave.length}
                  className="inline-flex items-center gap-2 px-5 py-2.5 brand-gradient text-white font-bold rounded-xl text-sm hover:opacity-90 disabled:opacity-40">
                  <Upload className="h-4 w-4" />
                  {toSave.length ? `Save ${toSave.length} product${toSave.length === 1 ? '' : 's'}` : 'Nothing to save'}
                </button>
                <p className="text-[11px] text-gray-400 max-w-xl leading-relaxed">
                  {counts.problem > 0
                    ? `${counts.problem} product${counts.problem === 1 ? ' has' : 's have'} problems and will be left out — fix ${counts.problem === 1 ? 'it' : 'them'} in the sheet and upload it again. Uploading again is safe: products already saved are updated, not duplicated.`
                    : counts.create + counts.update
                      ? `${[counts.create && `${counts.create} new`, counts.update && `${counts.update} updated`].filter(Boolean).join(', ')}${counts.same ? ` · ${counts.same} already match the shop` : ''}.`
                      : 'The sheet matches what is in the shop.'}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {stage === 'importing' && (
        <div className="py-4 space-y-3" aria-live="polite">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-amber-400 animate-spin shrink-0" />
            <p className="text-sm text-white font-semibold">
              Saving {Math.min(progress.done + 1, progress.total)} of {progress.total}
              {progress.name ? <span className="text-gray-400 font-normal"> — {progress.name}</span> : null}
            </p>
          </div>
          <div className="h-2 rounded-full bg-gray-700 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}>
            <div className="h-full bg-amber-500 transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => { stopRef.current = true; }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-600 text-gray-200 text-xs font-bold hover:bg-gray-700">
              <Square className="h-3 w-3" /> Stop after this product
            </button>
            <p className="text-[11px] text-gray-500">Keep this page open until it finishes.</p>
          </div>
        </div>
      )}

      {stage === 'done' && results && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {Object.entries(RESULT).map(([st, r]) => resultCount(st) > 0 && (
              <span key={st} className={`px-3 py-1.5 rounded-xl bg-gray-900/70 border border-gray-700 text-xs font-bold ${r.cls}`}>
                {resultCount(st)} {r.label.toLowerCase()}
              </span>
            ))}
          </div>
          {results.some(r => r.status === 'failed' || r.status === 'skipped') ? (
            <div className="rounded-xl border border-red-900/60 bg-red-950/20 p-3">
              <p className="text-xs font-bold text-red-300 mb-1.5 flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" /> Not saved — fix these in the sheet and upload it again</p>
              <ul className="space-y-1 max-h-56 overflow-y-auto">
                {results.filter(r => r.status === 'failed' || r.status === 'skipped').map((r, i) => (
                  <li key={i} className="text-[11px] text-gray-300">
                    <b className="text-white">{r.draft.name || r.draft.existing?.name || '—'}</b>
                    <span className="text-gray-500"> ({rowsText(r.draft.rowNumbers).toLowerCase()})</span> — {r.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-emerald-300 font-semibold"><CheckCircle className="h-4 w-4" /> Everything in the sheet was saved.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => downloadBlob(resultsToCsv(results), datedName('navgrow-import-report', 'csv'), CSV_TYPE)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-100 text-xs font-bold">
              <Download className="h-3.5 w-3.5" /> Download report
            </button>
            <button type="button" onClick={reset}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold">
              <Upload className="h-3.5 w-3.5" /> Upload another sheet
            </button>
            <button type="button" onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-600 text-gray-200 text-xs font-bold hover:bg-gray-700">
              Done
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ProductImportPanel;
