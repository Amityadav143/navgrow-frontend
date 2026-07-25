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