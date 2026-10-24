/**
 * © 2024–2026 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
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
 * BulkOrderForm — bulk price calculator that turns into a formal quote request.
 *
 * Shows the REAL bulk prices of the product, or of the option chosen on the
 * product page (e.g. Cement: UltraTech · OPC 53) — the same prices the cart and
 * checkout charge — then puts the requirement in the quote basket, where the
 * buyer's details are collected and a tracked RFQ is raised.
 *
 * It used to invent discounts (5–25%) that checkout never honoured, add GST on
 * top of prices that already include it, and post the enquiry to the ORDER
 * endpoint — which rejected it — before opening the visitor's mail app and
 * showing "Enquiry Sent!" although nothing had reached the team.
 */
import React, { useEffect, useMemo, useState } from 'react';
import useBodyScrollLock from '@/hooks/useBodyScrollLock';
import useEscapeKey from '@/hooks/useEscapeKey';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calculator, FileText, MessageCircle, Tag, Info, TrendingDown } from 'lucide-react';
import { useRfq } from '@/context/RfqContext';
import { tierTable, unitPriceFor, nextTier, rupees } from '@/lib/pricing';
import { effectiveTiers, hasOptions, variantLabel, variantMoq, unitPlural, lineKeyOf } from '@/lib/variants';
import { moqOf, stockOf } from '@/lib/stock';

const inr = rupees;
const WHATSAPP = '918927070972';

const BulkOrderForm = ({ product, variant = null, initialQty, open, onClose }) => {
  // Lock the page while this overlay is open (iOS-safe).
  useBodyScrollLock(open);
  useEscapeKey(open, onClose);
  const { addToRfq, updateQty } = useRfq();

  const options = hasOptions(product);
  const src = (options && variant) || product || {};
  const base = Number(src.price) || 0;
  const tiersText = product ? effectiveTiers(product, options ? variant : null) : null;
  const moq = options && variant ? variantMoq(variant, product) : moqOf(product || {});
  const unit = product?.unitLabel || '';
  const rate = Number(product?.gstRate ?? 18);
  const stock = stockOf(src);            // null when not known
  const label = options && variant ? variantLabel(variant) : '';

  const table = useMemo(() => tierTable(base, tiersText, moq), [base, tiersText, moq]);
  const [qty, setQty] = useState(moq);
  const [draft, setDraft] = useState(null);

  // Open at the quantity already chosen on the page — or at the first bulk price.
  useEffect(() => {
    if (!open) return;
    setQty(Math.max(moq, Number(initialQty) || 0, table[1]?.minQty || 0));
    setDraft(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!product) return null;

  const unitNow = unitPriceFor(base, tiersText, qty);
  const total = Math.round(unitNow * qty * 100) / 100;
  const gstIncluded = Math.round((total - (total * 100) / (100 + rate)) * 100) / 100;
  const savings = Math.max(0, Math.round((base - unitNow) * qty * 100) / 100);
  const upsell = nextTier(base, tiersText, qty);
  const beyondStock = stock != null && qty > stock;
  const units = (n) => `${n} ${unitPlural(unit, n)}`;
  const per = unit ? `/${unit}` : ' each';

  const commit = (value) => {
    const n = parseInt(value, 10);
    setQty(Math.max(moq, Number.isFinite(n) ? n : moq));
    setDraft(null);
  };

  const requestQuote = () => {
    addToRfq(product, qty, options ? variant : null);   // opens the quote basket
    // Exactly this many — not added on top of an earlier line for the same item.
    updateQty(lineKeyOf(product.productId ?? product.id, options ? variant?.id : null), qty);
    onClose?.();
  };

  const whatsappText = `Hi Navgrow! Bulk requirement: ${product.name}${label ? ` — ${label}` : ''}`
    + `${(src.sku || product.sku) ? ` (SKU: ${src.sku || product.sku})` : ''} × ${units(qty)}.`
    + ` Listed bulk price ${inr(unitNow)}${per}. Please share your best price and delivery time.`;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="absolute inset-0 bg-gray-900/75 backdrop-blur-sm" onClick={onClose} />
          <motion.div role="dialog" aria-modal="true" aria-labelledby="bulk-title"
            className="relative bg-white w-full sm:max-w-lg sm:rounded-3xl shadow-2xl max-h-[95dvh] overflow-y-auto rounded-t-3xl"
            initial={{ y: 60, scale: .97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 60, scale: .97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}>

            {/* Header */}
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 rounded-t-3xl flex items-center justify-between z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 brand-gradient rounded-2xl flex items-center justify-center shrink-0">
                  <Calculator className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 id="bulk-title" className="font-bold text-gray-900 text-base">Bulk price calculator</h2>
                  <p className="text-xs text-gray-500 truncate">{product.name}{label ? ` — ${label}` : ''}</p>
                </div>
              </div>
              <button onClick={onClose} aria-label="Close" className="p-2 rounded-xl hover:bg-gray-100 text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Quantity */}
              <div>
                <label htmlFor="bulk-qty" className="block text-sm font-bold text-gray-700 mb-2">
                  How many {unitPlural(unit, 2)} do you need?
                </label>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center border-2 border-gray-200 rounded-2xl overflow-hidden">
                    <button type="button" aria-label="Decrease quantity" onClick={() => { setDraft(null); setQty(q => Math.max(moq, q - 1)); }}
                      className="w-11 h-11 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-bold text-xl">−</button>
                    <input id="bulk-qty" type="number" inputMode="numeric" min={moq} value={draft ?? qty}
                      onChange={e => setDraft(e.target.value)}
                      onBlur={() => draft != null && commit(draft)}
                      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                      className="w-24 h-11 text-center font-bold text-gray-900 text-lg border-0 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                    <button type="button" aria-label="Increase quantity" onClick={() => { setDraft(null); setQty(q => q + 1); }}
                      className="w-11 h-11 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-bold text-xl">+</button>
                  </div>
                  {moq > 1 && <span className="text-xs font-semibold text-gray-500">Minimum order: {units(moq)}</span>}
                </div>
              </div>

              {/* Real bulk prices */}
              {table.length > 0 ? (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-emerald-600" /> Bulk prices{label ? ` — ${label}` : ''}
                  </p>
                  <div className="grid gap-1.5">
                    {table.map(t => {
                      const active = qty >= t.minQty && (t.maxQty == null || qty <= t.maxQty);
                      return (
                        <button key={t.minQty} type="button" onClick={() => { setDraft(null); setQty(Math.max(moq, t.minQty)); }}
                          className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm text-left transition-colors ${
                            active ? 'bg-emerald-50 border-2 border-emerald-400' : 'border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/40'}`}>
                          <span className="font-semibold text-gray-700">
                            {t.maxQty == null ? `${t.minQty}+` : `${t.minQty}–${t.maxQty}`} {unitPlural(unit, 2)}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="font-extrabold text-gray-900">{inr(t.unitPrice)}<span className="text-xs font-semibold text-gray-400">{per}</span></span>
                            {t.savePct > 0 && <span className="text-[11px] font-bold text-emerald-700">−{t.savePct}%</span>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-900">
                  <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-600" />
                  <p>No published volume prices for this item yet. Request a quote — for large quantities our team regularly beats the listed price.</p>
                </div>
              )}

              {/* Estimate */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-end justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-xs text-gray-500 font-semibold">Estimated total for {units(qty)}</p>
                    <p className="text-2xl font-extrabold text-gray-900 leading-tight">{inr(total)}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Includes GST {inr(gstIncluded)} ({rate}%) · delivery by pincode</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{inr(unitNow)}<span className="text-xs font-semibold text-gray-400">{per}</span></p>
                    {savings > 0 && (
                      <p className="text-xs font-bold text-emerald-700 flex items-center gap-1 justify-end">
                        <TrendingDown className="h-3.5 w-3.5" /> You save {inr(savings)}
                      </p>
                    )}
                  </div>
                </div>
                {upsell && (
                  <button type="button" onClick={() => { setDraft(null); setQty(upsell.minQty); }}
                    className="mt-3 w-full text-left text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 hover:bg-emerald-100/60">
                    Add <strong>{upsell.addQty}</strong> more to pay <strong>{inr(upsell.unitPrice)}{per}</strong> — make it {upsell.minQty}
                  </button>
                )}
                {beyondStock && (
                  <p className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                    {stock > 0 ? <>We have <strong>{units(stock)}</strong> ready to ship — we'll source the rest.</> : <>Currently out of stock — we'll source it for you.</>}
                    {' '}Your quote will confirm price and lead time.
                  </p>
                )}
              </div>

              <div className="space-y-2.5">
                <button type="button" onClick={requestQuote}
                  className="w-full py-3.5 btn-gold rounded-2xl font-bold text-base flex items-center justify-center gap-2">
                  <FileText className="h-5 w-5" /> Request a formal quote for {units(qty)}
                </button>
                <a href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(whatsappText)}`} target="_blank" rel="noopener noreferrer"
                  className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border-2 border-green-200 text-green-700 hover:bg-green-50">
                  <MessageCircle className="h-4 w-4" /> Discuss on WhatsApp
                </a>
                <p className="text-[11px] text-gray-400 text-center">
                  Formal GST quotation within 1 business day · No payment now · Track it under Saved Quotes
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BulkOrderForm;
