import { describe, it, expect } from 'vitest';
import { deliveryTierFactor, applyDeliveryTier } from '@/lib/utils';

/**
 * These tests exist to make one property impossible to regress: delivery is a
 * SINGLE order-level charge scaled by the TOTAL quantity — never the base charge
 * multiplied by the number of units (the "billed per product" bug).
 */
describe('delivery is per-order, tiered by total quantity — STRICT', () => {
  const BASE = 150; // "defined delivery charge"

  it('exact tier factors at every boundary in the spec', () => {
    expect(deliveryTierFactor(1)).toBe(1.0);   // qty 1 → 100%
    expect(deliveryTierFactor(2)).toBe(0.8);   // 2–5 → 80%
    expect(deliveryTierFactor(5)).toBe(0.8);   // boundary 5 → 80%
    expect(deliveryTierFactor(6)).toBe(0.7);   // 6–10 → 70%
    expect(deliveryTierFactor(10)).toBe(0.7);  // boundary 10 → 70%
    expect(deliveryTierFactor(11)).toBe(0.5);  // >10 → 50%
    expect(deliveryTierFactor(50)).toBe(0.5);
  });

  it('charge equals base × factor, once for the whole order', () => {
    expect(applyDeliveryTier(BASE, 1)).toBe(150);  // 150 × 1.0
    expect(applyDeliveryTier(BASE, 4)).toBe(120);  // 150 × 0.8
    expect(applyDeliveryTier(BASE, 8)).toBe(105);  // 150 × 0.7
    expect(applyDeliveryTier(BASE, 20)).toBe(75);  // 150 × 0.5
  });

  it('NEVER multiplies by quantity (per-product would be base×qty)', () => {
    for (const qty of [2, 5, 8, 12, 30]) {
      const perOrder = applyDeliveryTier(BASE, qty);
      const perProductBug = BASE * qty;
      expect(perOrder).toBeLessThan(perProductBug);
      // And it must never exceed the single-unit charge either.
      expect(perOrder).toBeLessThanOrEqual(applyDeliveryTier(BASE, 1));
    }
  });

  it('is monotonic — more units never costs more delivery', () => {
    let prev = Infinity;
    for (const qty of [1, 2, 5, 6, 10, 11, 100]) {
      const c = applyDeliveryTier(BASE, qty);
      expect(c).toBeLessThanOrEqual(prev);
      prev = c;
    }
  });

  it('works from a different base charge (zone-specific)', () => {
    expect(applyDeliveryTier(200, 4)).toBe(160); // 200 × 0.8
    expect(applyDeliveryTier(80, 12)).toBe(40);  // 80 × 0.5
  });
});
