import { describe, it, expect } from 'vitest';
import { evaluateLocalCoupon, offerTerms, LOCAL_OFFERS } from '@/lib/offers';
import { deliveryTierFactor, applyDeliveryTier } from '@/lib/utils';

describe('NAVGROW10 rules', () => {
  it('is not applicable below ₹3,000 and says how much more is needed', () => {
    const r = evaluateLocalCoupon('NAVGROW10', 2500);
    expect(r.ok).toBe(false);
    expect(r.message).toContain('3,000');
    expect(r.message).toContain('500');   // shortfall
  });

  it('caps the discount at ₹250 even on large orders', () => {
    expect(evaluateLocalCoupon('NAVGROW10', 10000).coupon.discount).toBe(250);
    expect(evaluateLocalCoupon('NAVGROW10', 50000).coupon.discount).toBe(250);
  });

  it('applies exactly at the ₹3,000 boundary', () => {
    const r = evaluateLocalCoupon('NAVGROW10', 3000);
    expect(r.ok).toBe(true);
    expect(r.coupon.discount).toBe(250);  // 10% = 300, capped to 250
  });

  it('is case-insensitive and trims input', () => {
    expect(evaluateLocalCoupon('  navgrow10 ', 5000).ok).toBe(true);
  });

  it('rejects unknown codes', () => {
    expect(evaluateLocalCoupon('FAKE50', 9000).ok).toBe(false);
  });

  it('states its terms including the one-use limit', () => {
    const t = offerTerms(LOCAL_OFFERS[0]);
    expect(t).toContain('10% off');
    expect(t).toContain('₹250');
    expect(t).toContain('₹3,000');
    expect(t).toContain('one use per customer');
  });
});

describe('delivery volume tiers', () => {
  it('charges 100% for a single unit', () => {
    expect(deliveryTierFactor(1)).toBe(1);
    expect(applyDeliveryTier(150, 1)).toBe(150);
  });

  it('charges 80% for 2–5 units', () => {
    [2, 3, 5].forEach(q => expect(deliveryTierFactor(q)).toBe(0.8));
    expect(applyDeliveryTier(150, 4)).toBe(120);
  });

  it('charges 70% for 6–10 units', () => {
    [6, 10].forEach(q => expect(deliveryTierFactor(q)).toBe(0.7));
    expect(applyDeliveryTier(150, 8)).toBe(105);
  });

  it('charges 50% above 10 units', () => {
    [11, 25].forEach(q => expect(deliveryTierFactor(q)).toBe(0.5));
    expect(applyDeliveryTier(150, 20)).toBe(75);
  });

  it('is one order-level charge, never multiplied per unit', () => {
    // 10 units must cost less than 10 × the single-unit charge, not more.
    expect(applyDeliveryTier(150, 10)).toBeLessThan(150 * 10);
    expect(applyDeliveryTier(150, 10)).toBe(105);
  });
});
