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
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
	return twMerge(clsx(inputs));
}

/**
 * Volume-based delivery multiplier, keyed on the TOTAL quantity in the cart
 * (not per product line). Delivery is a single order-level charge that shrinks
 * as the order grows. This MUST match DeliveryService.quantityTierFactor on the
 * backend so the preview and the charged amount agree:
 *
 *      1 unit      → 100% of the defined delivery charge
 *      2–5 units   →  80%
 *      6–10 units  →  70%
 *      11+ units   →  50%
 */
export function deliveryTierFactor(totalQty) {
	const q = Number(totalQty) || 0;
	if (q <= 1) return 1;
	if (q <= 5) return 0.8;
	if (q <= 10) return 0.7;
	return 0.5;
}

/** Applies the volume tier to a base delivery charge and rounds to whole rupees. */
export function applyDeliveryTier(baseCharge, totalQty) {
	const base = Number(baseCharge) || 0;
	return Math.round(base * deliveryTierFactor(totalQty));
}

/**
 * Delivery is charged PER PRODUCT LINE and scales with quantity:
 *
 *     line delivery = baseCharge × lineQty × slabFactor(lineQty)
 *     order delivery = Σ line delivery
 *
 * The slab (%) is decided by each line's OWN quantity, not the cart total. So a
 * cart with A×3 and B×7 at a ₹150 base is (150×3×0.8) + (150×7×0.7) = ₹1095.
 * This is the single source of truth for the storefront preview; the backend
 * computes the same figure against the real zone charge at checkout.
 *
 * @param {Array<{qty:number}>} lines - cart items (each with a qty)
 * @param {number} baseCharge - the per-unit base delivery charge for the zone
 * @returns {number} total delivery in whole rupees
 */
export function perProductDelivery(lines, baseCharge) {
	const base = Number(baseCharge) || 0;
	if (!Array.isArray(lines) || base <= 0) return 0;
	const total = lines.reduce((sum, l) => {
		const q = Number(l?.qty ?? l?.quantity ?? 0) || 0;
		if (q <= 0) return sum;
		return sum + base * q * deliveryTierFactor(q);
	}, 0);
	return Math.round(total);
}