/**
 * © 2024–2026 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 *
 * Choosing an option of a product sold in options — e.g. Cement by Brand,
 * Grade and Pack size:
 *  • OptionPicker — one row of buttons per option name. Each button shows the
 *    price you'd pay if you pick it, and says when that combination is out of
 *    stock; picking a value that doesn't combine with the others jumps to the
 *    best option that has it.
 *  • OptionsTable — every option side by side (price, ≈ price per kg, bulk
 *    price, stock), sortable, so buyers can compare brands at a glance instead
 *    of clicking through dropdowns.
 */
import React, { useMemo, useState } from 'react';
import { Layers, ArrowUpDown, CheckCircle } from 'lucide-react';
import {
  activeVariants, valuesOf, valueStates, pickValue, variantBuyable, variantMoq,
  effectiveTiers, perMeasurePrice, variantLabel,
} from '@/lib/variants';
import { tierTable, rupees } from '@/lib/pricing';
import { stockOf } from '@/lib/stock';

const fmt = (n) => rupees(n);

export function OptionPicker({ product, optionNames, variant, onPick, unitText = '' }) {
  const n = Math.max(1, optionNames.length);
  const selected = variant ? valuesOf(variant, n) : [];
  const count = activeVariants(product).length;
  if (!count) return null;
  return (
    <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5 mb-5" id="option-picker">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="font-bold text-gray-900 text-sm flex items-center gap-2">
          <Layers className="h-4 w-4 text-blue-600" /> Choose your option
        </p>
        {count > 1 && (
          <a href="#all-options" className="text-xs font-bold text-blue-700 hover:text-amber-600 whitespace-nowrap">
            Compare all {count} →
          </a>
        )}
      </div>
      {optionNames.map((name, axis) => {
        const states = valueStates(product, axis, selected);
        return (
          <fieldset key={name} className="mb-4 last:mb-0">
            <legend className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              {name}
              {selected[axis] && <span className="ml-1 normal-case text-gray-900">: {selected[axis]}</span>}
            </legend>
            <div className="flex flex-wrap gap-2">
              {states.map(st => {
                const target = pickValue(product, selected, axis, st.value);
                const isOn = !!selected[axis] && selected[axis].toLowerCase() === st.value.toLowerCase();
                const buyable = target ? variantBuyable(target, product) : false;
                return (
                  <button key={st.value} type="button" aria-pressed={isOn} disabled={!target}
                    onClick={() => onPick(target)}
                    title={target ? `${variantLabel(target)} — ${fmt(target.price)}${unitText}` : undefined}
                    className={`min-w-[72px] px-3 py-2 rounded-xl border-2 text-left transition-all ${
                      isOn ? 'border-blue-600 bg-blue-50 shadow-sm'
                        : buyable ? 'border-gray-200 hover:border-blue-300 bg-white'
                        : 'border-dashed border-gray-200 bg-gray-50/60 hover:border-gray-300'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}>
                    <span className={`block text-sm font-semibold leading-tight ${isOn ? 'text-blue-900' : buyable ? 'text-gray-800' : 'text-gray-400'}`}>
                      {st.value}
                    </span>
                    {target && (
                      <span className={`block text-[11px] font-bold mt-0.5 ${buyable ? 'text-gray-500' : 'text-gray-400'}`}>
                        {fmt(target.price)}{buyable ? '' : ' · out of stock'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

const SORTS = {
  price: { label: 'Price: low to high', fn: (a, b) => a.price - b.price },
  priceDesc: { label: 'Price: high to low', fn: (a, b) => b.price - a.price },
  perKg: { label: 'Best value (per kg)', fn: (a, b) => (a.perKg?.value ?? Infinity) - (b.perKg?.value ?? Infinity) },
};

export function OptionsTable({ product, optionNames, variant, onPick, unitText = '' }) {
  const [sort, setSort] = useState('price');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const n = Math.max(1, optionNames.length);

  const rows = useMemo(() => {
    const list = activeVariants(product).map(v => {
      const price = Number(v.price);
      const t = tierTable(price, effectiveTiers(product, v), variantMoq(v, product));
      return {
        v,
        price,
        mrp: Number(v.mrp) > price ? Number(v.mrp) : null,
        perKg: perMeasurePrice(price, product, v),
        // The cheapest bulk price (the table starts at the minimum order, so a
        // single row can already be a bulk price).
        best: t.length && t[t.length - 1].savePct > 0 ? t[t.length - 1] : null,
        buyable: variantBuyable(v, product),
        stock: stockOf(v),
      };
    });
    return list
      .filter(r => !inStockOnly || r.buyable)
      .sort((a, b) => (b.buyable ? 1 : 0) - (a.buyable ? 1 : 0) || SORTS[sort].fn(a, b));
  }, [product, sort, inStockOnly]);

  const total = activeVariants(product).length;
  if (total < 2) return null;
  const hasPerKg = rows.some(r => r.perKg);
  const hasBulk = rows.some(r => r.best);
  const shown = showAll ? rows : rows.slice(0, 12);

  return (
    <section id="all-options" className="mt-12 scroll-mt-28">
      <div className="flex items-end justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">All {total} options &amp; prices</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Compare {optionNames.join(', ').toLowerCase() || 'options'} side by side · prices include GST{unitText ? `, ${unitText.replace(' / ', 'per ')}` : ''}.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 px-2.5 py-2 rounded-xl bg-white border border-gray-200 cursor-pointer select-none">
            <input type="checkbox" checked={inStockOnly} onChange={e => setInStockOnly(e.target.checked)} className="h-3.5 w-3.5 accent-blue-600" />
            In stock only
          </label>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 px-2.5 py-1.5 rounded-xl bg-white border border-gray-200">
            <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
            <select value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort options"
              className="bg-transparent focus:outline-none text-xs font-semibold">
              {Object.entries(SORTS).filter(([k]) => k !== 'perKg' || hasPerKg).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="relative overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
        <table className="w-full text-sm min-w-[620px]">
          <thead>
            <tr className="bg-gray-50 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wide">
              {optionNames.map(name => <th key={name} className="px-4 py-3">{name}</th>)}
              <th className="px-4 py-3">Price{unitText}</th>
              {hasPerKg && <th className="px-4 py-3">≈ Per kg / L</th>}
              {hasBulk && <th className="px-4 py-3">Bulk price</th>}
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3"><span className="sr-only">Choose</span></th>
            </tr>
          </thead>
          <tbody>
            {shown.map(r => {
              const isOn = variant && String(variant.id) === String(r.v.id);
              const vals = valuesOf(r.v, n);
              return (
                <tr key={r.v.id} className={`border-t border-gray-50 ${isOn ? 'bg-blue-50/70' : r.buyable ? 'hover:bg-gray-50' : 'text-gray-400'}`}>
                  {vals.map((val, i) => (
                    <td key={i} className={`px-4 py-3 ${i === 0 ? 'font-semibold' : ''} ${r.buyable ? 'text-gray-900' : ''}`}>{val || '—'}</td>
                  ))}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`font-extrabold ${r.buyable ? 'text-gray-900' : ''}`}>{fmt(r.price)}</span>
                    {r.mrp && <span className="ml-1.5 text-[11px] text-gray-400 line-through">{fmt(r.mrp)}</span>}
                  </td>
                  {hasPerKg && <td className="px-4 py-3 whitespace-nowrap text-gray-600">{r.perKg ? r.perKg.text : '—'}</td>}
                  {hasBulk && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.best ? <span className="text-emerald-700 font-semibold">{fmt(r.best.unitPrice)} at {r.best.minQty}+</span> : <span className="text-gray-300">—</span>}
                    </td>
                  )}
                  <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold">
                    {!r.buyable ? <span className="text-red-500">Out of stock</span>
                      : r.stock !== null && r.stock <= 10 ? <span className="text-amber-600">Only {r.stock} left</span>
                      : <span className="text-emerald-600">In stock</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isOn ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700"><CheckCircle className="h-3.5 w-3.5" /> Selected</span>
                    ) : (
                      <button type="button"
                        onClick={() => {
                          onPick(r.v);
                          document.getElementById('option-picker')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-blue-200 text-blue-700 hover:bg-blue-50">
                        {r.buyable ? 'Select' : 'Quote'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-500 text-center">No option is in stock right now — untick “In stock only” to request a quote.</p>
        )}
      </div>
      {rows.length > 12 && (
        <button type="button" onClick={() => setShowAll(s => !s)}
          className="mt-3 text-sm font-bold text-blue-700 hover:text-amber-600">
          {showAll ? 'Show fewer' : `Show all ${rows.length} options`}
        </button>
      )}
    </section>
  );
}

export default OptionPicker;
