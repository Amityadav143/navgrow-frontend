import { describe, it, expect } from 'vitest';
import { perProductDelivery, deliveryTierFactor } from '@/lib/utils';

describe('per-product delivery (multiplies by quantity, slab per line)', () => {
  it("matches the worked example: A×3 (70%) + B×7 (60%) at ₹150 = ₹945", () => {
    const lines = [{ qty: 3 }, { qty: 7 }];
    // A: 150×3×0.70 = 315 ; B: 150×7×0.60 = 630 ; total 945
    expect(perProductDelivery(lines, 150)).toBe(945);
  });

  it('single line multiplies by its quantity and applies its slab', () => {
    expect(perProductDelivery([{ qty: 1 }], 150)).toBe(150);   // 150×1×1.0
    expect(perProductDelivery([{ qty: 4 }], 150)).toBe(420);   // 150×4×0.7 (slab-2 reduced)
    expect(perProductDelivery([{ qty: 8 }], 150)).toBe(720);   // 150×8×0.6 (6–10 tier)
    expect(perProductDelivery([{ qty: 12 }], 150)).toBe(900);  // 150×12×0.5
  });

  it('each line uses ITS OWN quantity for the slab, not the cart total', () => {
    // Two lines of 3 (each in the 2–5 tier → 70%).
    const two = perProductDelivery([{ qty: 3 }, { qty: 3 }], 100);
    // 100×3×0.7 + 100×3×0.7 = 210 + 210 = 420
    expect(two).toBe(420);
    // If it wrongly merged into one line of 6 units it would use the 6–10 tier
    // (60%): 100×6×0.6 = 360. Assert it is NOT that — proving the per-line path.
    expect(two).not.toBe(360);
  });

  it('delivery grows with quantity (it is a multiple of qty)', () => {
    const q2 = perProductDelivery([{ qty: 2 }], 150);
    const q4 = perProductDelivery([{ qty: 4 }], 150);
    expect(q4).toBeGreaterThan(q2); // more units → more delivery
  });

  it('free zone (base 0) stays free regardless of quantity', () => {
    expect(perProductDelivery([{ qty: 10 }], 0)).toBe(0);
  });

  it('empty cart is free', () => {
    expect(perProductDelivery([], 150)).toBe(0);
  });
});
