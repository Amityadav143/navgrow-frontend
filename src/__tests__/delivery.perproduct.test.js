import { describe, it, expect } from 'vitest';
import { perProductDelivery, deliveryTierFactor } from '@/lib/utils';

describe('per-product delivery (multiplies by quantity, slab per line)', () => {
  it("matches the user's worked example: A×3 + B×7 at ₹150 = ₹1095", () => {
    const lines = [{ qty: 3 }, { qty: 7 }];
    // A: 150×3×0.80 = 360 ; B: 150×7×0.70 = 735 ; total 1095
    expect(perProductDelivery(lines, 150)).toBe(1095);
  });

  it('single line multiplies by its quantity and applies its slab', () => {
    expect(perProductDelivery([{ qty: 1 }], 150)).toBe(150);   // 150×1×1.0
    expect(perProductDelivery([{ qty: 4 }], 150)).toBe(480);   // 150×4×0.8
    expect(perProductDelivery([{ qty: 8 }], 150)).toBe(840);   // 150×8×0.7
    expect(perProductDelivery([{ qty: 12 }], 150)).toBe(900);  // 150×12×0.5
  });

  it('each line uses ITS OWN quantity for the slab, not the cart total', () => {
    // Two lines of 3 (each 80%) must NOT be treated as 6 units (70%).
    const two = perProductDelivery([{ qty: 3 }, { qty: 3 }], 100);
    // 100×3×0.8 + 100×3×0.8 = 240 + 240 = 480
    expect(two).toBe(480);
    // If it wrongly used total qty 6 → 70%: 100×6×0.7 = 420. Ensure it's not that.
    expect(two).not.toBe(420);
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
