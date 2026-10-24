/**
 * © 2024–2026 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 *
 * GST rates offered in the admin. From 22 Sep 2025 ("GST 2.0") the main slabs
 * are Nil, 5%, 18% and 40%; the special 3% and 0.25% rates continue. 12% and
 * 28% are kept only so older products still show the rate they were saved
 * with — most such goods moved to 5% / 18% (cement: 28% → 18%).
 */
export const CURRENT_GST_RATES = ['0', '5', '18', '40', '3', '0.25'];
export const OLD_GST_RATES = ['12', '28'];
export const GST_RATES = [...CURRENT_GST_RATES, ...OLD_GST_RATES];

/** "18%", or "12% (old slab)" for the slabs retired on 22 Sep 2025. */
export const gstLabel = (r) => `${r}%${OLD_GST_RATES.includes(String(r)) ? ' (old slab, before 22 Sep 2025)' : ''}`;

/** Normalise a typed / spreadsheet rate ("18%", " 18 ", "0.25") to the list's spelling, or null. */
export function normalizeGstRate(v) {
  const n = Number(String(v ?? '').replace(/[%\s]/g, ''));
  if (!Number.isFinite(n)) return null;
  const hit = GST_RATES.find(r => Number(r) === n);
  return hit ?? null;
}
