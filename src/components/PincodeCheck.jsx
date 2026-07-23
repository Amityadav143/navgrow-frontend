/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 | navgrow.org | info@navgrow.org
 *
 * PROPRIETARY & CONFIDENTIAL — Navgrow Engineering Platform v1.0
 * Unauthorised copying or distribution is strictly prohibited.
 */
/**
 * PincodeCheck — "will you deliver to me, and when?"
 *
 * Buyers should find out a pincode is unserviceable while they are still on the
 * product page, not after filling in a full address. The last checked pincode is
 * remembered for the session so the answer follows them from product to cart.
 *
 * Usage:
 *   <PincodeCheck orderValue={total} onResolved={q => setDeliveryQuote(q)} />
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Truck, Loader2, CheckCircle, XCircle, Zap, Banknote, Pencil,
} from 'lucide-react';
import { deliveryApi } from '@/lib/api';

const KEY = 'navgrow.pincode';
const PIN_RE = /^[1-9][0-9]{5}$/;

/** Remembered across pages for the session — not persisted beyond it. */
export function getRememberedPincode() {
  try { return sessionStorage.getItem(KEY) || ''; } catch { return ''; }
}
function remember(pin) {
  try { sessionStorage.setItem(KEY, pin); } catch { /* private mode — fine */ }
}

export default function PincodeCheck({
  orderValue = 0,
  onResolved,
  compact = false,
  autoCheck = true,
}) {
  const [pin, setPin]         = useState(getRememberedPincode());
  const [editing, setEditing] = useState(!getRememberedPincode());
  const [quote, setQuote]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const run = useCallback(async (value) => {
    const p = (value ?? '').trim();
    if (!PIN_RE.test(p)) { setError('Enter a valid 6-digit pincode'); setQuote(null); return; }
    setLoading(true); setError('');
    try {
      const { data } = await deliveryApi.check(p, orderValue || 0);
      setQuote(data);
      remember(p);
      setEditing(false);
      onResolved?.(data);
    } catch {
      setError('Could not check right now. Please try again.');
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }, [orderValue, onResolved]);

  // Re-check when the basket value crosses a free-delivery threshold.
  useEffect(() => {
    if (autoCheck && PIN_RE.test(pin)) run(pin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderValue]);

  // Check the remembered pincode once on mount.
  useEffect(() => {
    if (autoCheck && PIN_RE.test(getRememberedPincode())) run(getRememberedPincode());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const money = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

  return (
    <div className={compact ? '' : 'rounded-xl border border-gray-200 p-4'}>
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="h-4 w-4 text-blue-600 shrink-0" />
        <p className="text-sm font-bold text-gray-900">Delivery options</p>
      </div>

      {editing ? (
        <div>
          <div className="flex gap-2">
            <input
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') run(pin); }}
              inputMode="numeric"
              placeholder="Enter 6-digit pincode"
              aria-label="Delivery pincode"
              className={`flex-1 min-w-0 px-3 py-2 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${error ? 'border-red-400' : 'border-gray-200'}`}
            />
            <button
              onClick={() => run(pin)}
              disabled={loading}
              className="px-4 py-2 btn-gold rounded-xl text-sm shrink-0 disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check'}
            </button>
          </div>
          {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-sm text-gray-600">
            Delivering to <span className="font-bold text-gray-900">{pin}</span>
            {quote?.zone && <span className="text-gray-400"> · {quote.zone}</span>}
          </p>
          <button onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 shrink-0">
            <Pencil className="h-3 w-3" /> Change
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {quote && !editing && (
          <motion.div key={quote.pincode + String(quote.serviceable)}
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-1 space-y-1.5">

            {!quote.serviceable ? (
              <div className="flex items-start gap-2 text-sm">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-red-600">{quote.note || 'We do not deliver to this pincode yet.'}</p>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-2 text-sm">
                  <Truck className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <p className="text-gray-700">
                    <span className="font-semibold text-gray-900">
                      {quote.freeDelivery ? 'Free delivery' : `Delivery ${money(quote.standardCharge)}`}
                    </span>
                    {quote.estimatedBy && <> · arrives <span className="font-semibold">{quote.estimatedBy}</span></>}
                  </p>
                </div>

                {quote.addForFreeDelivery > 0 && (
                  <p className="text-xs text-amber-700 pl-6">
                    Add {money(quote.addForFreeDelivery)} more for free delivery here
                  </p>
                )}

                {quote.expressAvailable && (
                  <div className="flex items-start gap-2 text-sm">
                    <Zap className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-gray-700">
                      Express {money(quote.expressCharge)}
                      {quote.expressBy && <> · <span className="font-semibold">{quote.expressBy}</span></>}
                    </p>
                  </div>
                )}

                <div className="flex items-start gap-2 text-sm">
                  {quote.codAvailable
                    ? <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    : <Banknote className="h-4 w-4 text-gray-300 mt-0.5 shrink-0" />}
                  <p className={quote.codAvailable ? 'text-gray-700' : 'text-gray-400'}>
                    {quote.codAvailable
                      ? `Cash on delivery available${Number(quote.codCharge) > 0 ? ` (+${money(quote.codCharge)})` : ''}`
                      : 'Cash on delivery not available here'}
                  </p>
                </div>

                {quote.note && (
                  <p className="text-[11px] text-gray-400 pl-6 leading-relaxed">{quote.note}</p>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
