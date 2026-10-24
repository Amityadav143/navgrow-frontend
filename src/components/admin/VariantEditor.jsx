/**
 * © 2024–2026 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 *
 * Admin "Options & price range" editor — sell a product such as Cement in
 * options (Brand × Grade × Pack size), each with its own price, MRP, stock,
 * SKU, minimum order and bulk prices. Logic lives in lib/variantEditor.js.
 *
 * Workflow: pick a preset (or type option names and values) → "Build price
 * table" → fill prices (type, paste from a spreadsheet, or bulk-fill by
 * brand / grade) → save. Customers then see "₹380 – ₹450 / bag" and choose.
 */
import React, { useMemo, useState } from 'react';
import { Layers, Plus, X, Wand2, ClipboardPaste, Table2, AlertCircle, Percent, Trash2 } from 'lucide-react';
import {
  PRESETS, MAX_AXES, MAX_ROWS, UNIT_SUGGESTIONS, splitValues, cartesian, rebuildRows, applyPaste,
  bulkFill, summarizeRows, validateOptions, usedAxes,
} from '@/lib/variantEditor';
import { safeTiers, normalizeTiers } from '@/lib/pricing';

const inputCls = 'w-full px-2.5 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 placeholder-gray-600';
const cellCls = 'w-full px-2 py-1.5 bg-gray-900 border border-gray-700 rounded-md text-xs text-white focus:outline-none focus:border-blue-500 placeholder-gray-600';
const rupee = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/** Rows of "from N units → price (or % off)". mode: 'fixed' | 'percent' | 'either'. */
export function TierRowsEditor({ value, onChange, basePrice, mode = 'either', unitLabel }) {
  const parsed = safeTiers(value);
  const [percent, setPercent] = useState(mode === 'percent' || (parsed[0]?.percent ?? false));
  const rows = parsed.length ? parsed.map(t => ({ minQty: String(t.minQty), value: String(t.value) })) : [];
  const [draft, setDraft] = useState(rows.length ? rows : []);
  let error = '';
  try { normalizeTiers(value, mode === 'percent' ? null : (Number(basePrice) || null)); } catch (e) { error = e.message; }

  const emit = (next, pct = percent) => {
    setDraft(next);
    onChange(next.filter(r => r.minQty !== '' && r.value !== '')
      .map(r => `${parseInt(r.minQty, 10)}:${r.value}${pct ? '%' : ''}`).join(', '));
  };
  const unit = unitLabel ? `${unitLabel}s` : 'units';
  return (
    <div className="space-y-2">
      {mode === 'either' && (
        <div className="inline-flex rounded-lg border border-gray-700 overflow-hidden text-[11px] font-bold">
          {[['Fixed price', false], ['% off', true]].map(([label, pct]) => (
            <button key={label} type="button" onClick={() => { setPercent(pct); emit(draft, pct); }}
              className={`px-2.5 py-1 ${percent === pct ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}>{label}</button>
          ))}
        </div>
      )}
      {draft.map((r, i) => (
        <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
          <span>From</span>
          <input type="number" min={2} value={r.minQty} placeholder="50" aria-label="From quantity"
            onChange={e => emit(draft.map((x, j) => j === i ? { ...x, minQty: e.target.value } : x))}
            className={`${cellCls} !w-20`} />
          <span>{unit}</span>
          <span className="text-gray-600">→</span>
          {!percent && <span>₹</span>}
          <input type="number" min={0} step="0.01" value={r.value} placeholder={percent ? '2' : '395'} aria-label={percent ? 'Percent off' : 'Unit price'}
            onChange={e => emit(draft.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
            className={`${cellCls} !w-24`} />
          <span>{percent ? '% off' : 'each'}</span>
          <button type="button" aria-label="Remove tier" onClick={() => emit(draft.filter((_, j) => j !== i))}
            className="p-1 text-gray-500 hover:text-red-400"><X className="h-3.5 w-3.5" /></button>
        </div>
      ))}
      {draft.length < 6 && (
        <button type="button" onClick={() => setDraft([...draft, { minQty: '', value: '' }])}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:text-blue-300">
          <Plus className="h-3 w-3" /> Add a bulk price
        </button>
      )}
      {error && value && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
}

export default function VariantEditor({ form, onChange, onSuggestTax }) {
  const [scope, setScope] = useState('all');
  const [fillField, setFillField] = useState('price');
  const [fillValue, setFillValue] = useState('');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [note, setNote] = useState('');

  const enabled = !!form.optionsEnabled;
  const axes = form.optionAxes?.length ? form.optionAxes : [{ name: '', values: '' }];
  const rows = form.optionRows || [];
  const n = usedAxes(axes).length;
  const combos = useMemo(() => cartesian(axes).length, [axes]);
  const summary = summarizeRows(rows);
  const errors = useMemo(() => (enabled ? validateOptions(form) : []), [enabled, form]);
  const unit = form.unitLabel || 'unit';

  const setAxes = (next) => onChange('optionAxes', next);
  const setRows = (next) => onChange('optionRows', next);
  const setRow = (key, patch) => setRows(rows.map(r => (r.key === key ? { ...r, ...patch } : r)));

  const applyPreset = (id) => {
    const p = PRESETS[id];
    if (!p) return;
    if (rows.some(r => r.price) && !window.confirm(`Replace the current options with the ${p.label} preset? Prices already typed are kept for combinations that still exist.`)) return;
    const nextAxes = p.axes.map(a => ({ ...a }));
    onChange('optionAxes', nextAxes);
    if (!form.unitLabel) onChange('unitLabel', p.unitLabel);
    const { rows: built } = rebuildRows(nextAxes, rows);
    setRows(built);
    if (onSuggestTax && (p.gstRate || p.hsnCode)) onSuggestTax({ gstRate: p.gstRate, hsnCode: p.hsnCode });
    setNote(`${p.label} preset loaded — ${built.length} combinations. Edit the brands and sizes you stock, then fill in prices.`);
  };

  const build = () => {
    const { rows: built, dropped, truncated } = rebuildRows(axes, rows);
    const lost = dropped.filter(r => r.price || r.id);
    if (lost.length && !window.confirm(`${lost.length} existing option${lost.length === 1 ? '' : 's'} no longer match${lost.length === 1 ? 'es' : ''} the values above and will be removed. Continue?`)) return;
    setRows(built);
    setNote(`${built.length} option${built.length === 1 ? '' : 's'} in the table${truncated ? ` (limited to ${MAX_ROWS})` : ''}.`);
  };

  const doPaste = () => {
    const res = applyPaste(pasteText, axes, rows);
    if (res.axes && res.axes !== axes) setAxes(res.axes);
    setRows(res.rows);
    setNote(`Pasted: ${res.updated} updated, ${res.added} added.${res.errors.length ? ` ${res.errors.length} line(s) skipped: ${res.errors.slice(0, 2).join(' ')}` : ''}`);
    if (!res.errors.length) { setPasteOpen(false); setPasteText(''); }
  };

  const doFill = () => {
    if (fillValue === '' && fillField !== 'priceTiers') return;
    let sc = 'all';
    if (scope !== 'all') {
      const [axis, ...rest] = scope.split(':');
      sc = { axis: Number(axis), value: rest.join(':') };
    }
    setRows(bulkFill(rows, sc, fillField, fillValue));
    setNote('Applied.');
  };

  const scopes = usedAxes(axes).flatMap((a, i) => splitValues(a.values).map(v => ({ id: `${i}:${v}`, label: `${a.name} = ${v}` })));

  return (
    <div className="col-span-2 rounded-2xl border border-blue-900/60 bg-gray-900/40 p-4 space-y-4">
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={enabled} onChange={e => onChange('optionsEnabled', e.target.checked)}
          className="w-4 h-4 mt-0.5 rounded accent-blue-500" />
        <span>
          <span className="flex items-center gap-2 text-sm font-bold text-white"><Layers className="h-4 w-4 text-blue-400" /> Sold in options with a price range</span>
          <span className="block text-[11px] text-gray-400 mt-0.5">
            e.g. Cement by brand, grade and pack size — each option gets its own price, stock, SKU and bulk prices.
            Customers see “₹380 – ₹450 / bag” and choose.
          </span>
        </span>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Sold per (unit)</label>
          <input list="ng-unit-suggestions" value={form.unitLabel || ''} maxLength={24}
            onChange={e => onChange('unitLabel', e.target.value)} placeholder="bag, tonne, piece…" className={inputCls} />
          <datalist id="ng-unit-suggestions">{UNIT_SUGGESTIONS.map(u => <option key={u} value={u} />)}</datalist>
          <p className="text-[11px] text-gray-500 mt-1">Shown as “₹420 / {unit}”. Leave blank for “each”.</p>
        </div>
        {!enabled && (
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Bulk prices <span className="normal-case text-gray-600">(optional)</span></label>
            <TierRowsEditor value={form.priceTiers || ''} onChange={v => onChange('priceTiers', v)} basePrice={form.price} unitLabel={form.unitLabel} />
          </div>
        )}
      </div>

      {enabled && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1"><Wand2 className="h-3.5 w-3.5" /> Quick start:</span>
            {Object.entries(PRESETS).map(([id, p]) => (
              <button key={id} type="button" onClick={() => applyPreset(id)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-800 text-gray-200 border border-gray-700 hover:border-blue-500">{p.label}</button>
            ))}
          </div>

          <div className="space-y-2">
            {axes.map((a, i) => (
              <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2.5fr)_auto] gap-2 items-start">
                <input value={a.name} maxLength={40} placeholder={['Brand', 'Grade', 'Pack size'][i] || 'Option'}
                  aria-label={`Option ${i + 1} name`}
                  onChange={e => setAxes(axes.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className={inputCls} />
                <div>
                  <input value={a.values} placeholder={['UltraTech, ACC, Ambuja', 'OPC 43, OPC 53, PPC', '50 kg bag'][i] || 'Value 1, Value 2'}
                    aria-label={`Option ${i + 1} values`}
                    onChange={e => setAxes(axes.map((x, j) => (j === i ? { ...x, values: e.target.value } : x)))} className={inputCls} />
                  <p className="text-[10px] text-gray-500 mt-0.5">{splitValues(a.values).length} value{splitValues(a.values).length === 1 ? '' : 's'} · separate with commas</p>
                </div>
                <button type="button" aria-label="Remove option" disabled={axes.length === 1}
                  onClick={() => setAxes(axes.filter((_, j) => j !== i))}
                  className="p-2 text-gray-500 hover:text-red-400 disabled:opacity-30"><X className="h-4 w-4" /></button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              {axes.length < MAX_AXES && (
                <button type="button" onClick={() => setAxes([...axes, { name: '', values: '' }])}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-blue-300 border border-blue-900 hover:bg-blue-950">
                  <Plus className="h-3.5 w-3.5" /> Add an option
                </button>
              )}
              <button type="button" onClick={build} disabled={!combos}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40">
                <Table2 className="h-3.5 w-3.5" /> Build price table ({combos} combination{combos === 1 ? '' : 's'})
              </button>
              <button type="button" onClick={() => setPasteOpen(o => !o)} disabled={!n}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-800 text-gray-200 border border-gray-700 hover:border-blue-500 disabled:opacity-40">
                <ClipboardPaste className="h-3.5 w-3.5" /> Paste from spreadsheet
              </button>
            </div>
          </div>

          {pasteOpen && (
            <div className="rounded-xl border border-gray-700 p-3 space-y-2">
              <p className="text-[11px] text-gray-400">
                One option per line — {usedAxes(axes).map(a => a.name).join(', ')}, then Price, MRP, Stock and SKU (optional).
                Copy straight from Excel / Google Sheets, or separate with commas.
              </p>
              <textarea rows={5} value={pasteText} onChange={e => setPasteText(e.target.value)}
                placeholder={'UltraTech\tOPC 53\t50 kg bag\t430\t460\t500\nACC\tPPC\t50 kg bag\t395\t420\t300'}
                className={`${inputCls} font-mono text-xs`} />
              <div className="flex gap-2">
                <button type="button" onClick={doPaste} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white">Apply</button>
                <button type="button" onClick={() => setPasteOpen(false)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-800 text-gray-300">Cancel</button>
              </div>
            </div>
          )}

          {rows.length > 0 && (
            <>
              <div className="flex flex-wrap items-end gap-2 rounded-xl bg-gray-800/60 border border-gray-700 p-2.5">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide self-center">Fill</span>
                <select value={scope} onChange={e => setScope(e.target.value)} aria-label="Which options"
                  className="px-2 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-xs text-white">
                  <option value="all">All options</option>
                  {scopes.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <select value={fillField} onChange={e => setFillField(e.target.value)} aria-label="Field"
                  className="px-2 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-xs text-white">
                  <option value="price">Price (₹)</option>
                  <option value="pricePct">Change price by %</option>
                  <option value="mrp">MRP (₹)</option>
                  <option value="stockQty">Stock</option>
                  <option value="minOrderQty">Min order</option>
                  <option value="priceTiers">Bulk prices (e.g. 50:395)</option>
                </select>
                <input value={fillValue} onChange={e => setFillValue(e.target.value)}
                  placeholder={fillField === 'pricePct' ? '+2 or -1.5' : fillField === 'priceTiers' ? '50:395, 200:385' : 'value'}
                  className="px-2 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-xs text-white w-36" />
                <button type="button" onClick={doFill} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white">Apply</button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-700">
                <table className="w-full text-xs min-w-[900px]">
                  <thead>
                    <tr className="bg-gray-800 text-gray-400 text-left">
                      {usedAxes(axes).map(a => <th key={a.name} className="px-2 py-2 font-bold">{a.name}</th>)}
                      <th className="px-2 py-2 font-bold">SKU</th>
                      <th className="px-2 py-2 font-bold">Price ₹*</th>
                      <th className="px-2 py-2 font-bold">MRP ₹</th>
                      <th className="px-2 py-2 font-bold">Stock</th>
                      <th className="px-2 py-2 font-bold">Min order</th>
                      <th className="px-2 py-2 font-bold">Bulk prices</th>
                      <th className="px-2 py-2 font-bold">On</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => {
                      const missing = !(Number(r.price) > 0);
                      const tierCount = safeTiers(r.priceTiers).length;
                      return (
                        <tr key={r.key} className={`border-t border-gray-800 ${r.active === false ? 'opacity-50' : ''}`}>
                          {[0, 1, 2].slice(0, n).map(i => (
                            <td key={i} className="px-2 py-1.5 text-gray-200 whitespace-nowrap">{[r.option1, r.option2, r.option3][i]}</td>
                          ))}
                          <td className="px-2 py-1.5"><input value={r.sku} placeholder="auto" onChange={e => setRow(r.key, { sku: e.target.value.toUpperCase() })} className={`${cellCls} !w-36 font-mono`} /></td>
                          <td className="px-2 py-1.5"><input type="number" min={0} step="0.01" value={r.price} onChange={e => setRow(r.key, { price: e.target.value })}
                            className={`${cellCls} !w-24 ${missing ? '!border-red-500/70' : ''}`} aria-invalid={missing} /></td>
                          <td className="px-2 py-1.5"><input type="number" min={0} step="0.01" value={r.mrp} onChange={e => setRow(r.key, { mrp: e.target.value })} className={`${cellCls} !w-24`} /></td>
                          <td className="px-2 py-1.5"><input type="number" min={0} value={r.stockQty} onChange={e => setRow(r.key, { stockQty: e.target.value })} className={`${cellCls} !w-20`} /></td>
                          <td className="px-2 py-1.5"><input type="number" min={1} value={r.minOrderQty} placeholder="—" onChange={e => setRow(r.key, { minOrderQty: e.target.value })} className={`${cellCls} !w-16`} /></td>
                          <td className="px-2 py-1.5">
                            <input value={r.priceTiers} placeholder="50:395, 200:385" title="From 50 units ₹395 each, from 200 units ₹385 each — or 50:2% for percent off"
                              onChange={e => setRow(r.key, { priceTiers: e.target.value })} className={`${cellCls} !w-40 font-mono`} />
                            {tierCount > 0 && <span className="block text-[10px] text-emerald-400 mt-0.5">{tierCount} tier{tierCount === 1 ? '' : 's'}</span>}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <input type="checkbox" checked={r.active !== false} onChange={e => setRow(r.key, { active: e.target.checked })}
                              aria-label="Offered" className="w-4 h-4 accent-green-500" />
                          </td>
                          <td className="px-2 py-1.5">
                            <button type="button" aria-label="Delete option" onClick={() => setRows(rows.filter(x => x.key !== r.key))}
                              className="p-1 text-gray-500 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <span className="text-gray-300 font-semibold">{summary.count} option{summary.count === 1 ? '' : 's'} on sale</span>
                {summary.min != null && (
                  <span className="text-white font-bold">
                    Customers see {summary.min === summary.max ? rupee(summary.min) : `${rupee(summary.min)} – ${rupee(summary.max)}`} / {unit}
                  </span>
                )}
                <span className="text-gray-400">{summary.stock.toLocaleString('en-IN')} in stock in total</span>
              </div>

              <div className="rounded-xl border border-gray-700 p-3">
                <p className="text-xs font-bold text-gray-300 flex items-center gap-1.5 mb-2">
                  <Percent className="h-3.5 w-3.5 text-emerald-400" /> Volume discount for every option <span className="font-normal text-gray-500">(optional — options with their own bulk prices use those)</span>
                </p>
                <TierRowsEditor mode="percent" value={form.priceTiers || ''} onChange={v => onChange('priceTiers', v)} unitLabel={form.unitLabel} />
              </div>
            </>
          )}

          {note && <p className="text-[11px] text-blue-300">{note}</p>}
          {errors.length > 0 && (
            <div className="rounded-xl border border-red-900 bg-red-950/40 p-3 text-xs text-red-300 space-y-1">
              <p className="font-bold flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" /> Fix before saving</p>
              {errors.slice(0, 8).map(e => <p key={e}>• {e}</p>)}
              {errors.length > 8 && <p>…and {errors.length - 8} more.</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
