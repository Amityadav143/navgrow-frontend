import { describe, it, expect } from 'vitest';
import { perProductDelivery, deliveryTierFactor, applyDeliveryTier } from '@/lib/utils';
import { evaluateLocalCoupon } from '@/lib/offers';

describe('AUDIT: delivery + coupon consistency', () => {
  it('per-product delivery uses each line own charge over zone base', () => {
    // Line with its own ₹200 charge + line falling back to ₹150 zone base.
    const lines = [{ qty: 2, deliveryCharge: 200 }, { qty: 2 }];
    // 200×2×0.7 + 150×2×0.7 = 280 + 210 = 490
    expect(perProductDelivery(lines, 150)).toBe(490);
  });

  it('a line with 0/undefined charge and no zone base is free', () => {
    expect(perProductDelivery([{ qty: 5 }], 0)).toBe(0);
  });

  it('coupon never exceeds order value on tiny orders', () => {
    // Below the ₹3000 min it should be refused, never negative.
    const r = evaluateLocalCoupon('NAVGROW10', 100);
    expect(r.ok).toBe(false);
  });

  it('coupon discount never makes total negative at the boundary', () => {
    const r = evaluateLocalCoupon('NAVGROW10', 3000);
    expect(r.ok).toBe(true);
    expect(r.coupon.discount).toBeLessThanOrEqual(3000);
    expect(r.coupon.discount).toBe(250); // capped
  });

  it('delivery tier is deterministic and bounded 0.5..1.0', () => {
    for (let q = 0; q <= 100; q++) {
      const f = deliveryTierFactor(q);
      expect(f).toBeGreaterThanOrEqual(0.5);
      expect(f).toBeLessThanOrEqual(1.0);
    }
  });
});
