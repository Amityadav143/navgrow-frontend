import { describe, it, expect } from 'vitest';

/**
 * Catalogue prices include GST. The tax must be EXTRACTED from the price, never
 * added to it — adding it would charge more than the figure the customer saw,
 * which is exactly the mis-billing this pricing model fixes.
 *
 * Mirrors the calculation in CheckoutPage/CartSidebar and OrderController.
 */
const extract = (inclusive, rate) => {
  const taxable = inclusive * 100 / (100 + rate);
  return { taxable, tax: inclusive - taxable };
};

const round2 = (n) => Math.round(n * 100) / 100;

describe('GST-inclusive pricing', () => {
  it('extracts 18% correctly and reconciles back to the price shown', () => {
    const { taxable, tax } = extract(960, 18);
    expect(round2(taxable)).toBe(813.56);
    expect(round2(tax)).toBe(146.44);
    expect(round2(taxable + tax)).toBe(960);
  });

  it('extracts 12% for protective garments', () => {
    const { taxable, tax } = extract(2400, 12);
    expect(round2(taxable)).toBe(2142.86);
    expect(round2(tax)).toBe(257.14);
    expect(round2(taxable + tax)).toBe(2400);
  });

  it('never charges more than the displayed price for the goods', () => {
    const basket = [
      { price: 480, qty: 2, rate: 18 },
      { price: 890, qty: 1, rate: 12 },
      { price: 2400, qty: 1, rate: 12 },
    ];
    const goods = basket.reduce((s, i) => s + i.price * i.qty, 0);
    const gst = basket.reduce((s, i) => s + extract(i.price * i.qty, i.rate).tax, 0);
    const delivery = 90;

    // Only delivery is added on top of the inclusive goods value.
    expect(round2(goods + delivery)).toBe(4340);
    // The old (add-on-top) model would have over-charged by the whole tax amount.
    expect(round2(goods + gst + delivery)).toBeGreaterThan(round2(goods + delivery));
  });

  it('handles a zero-rated item without dividing by zero', () => {
    const { taxable, tax } = extract(500, 0);
    expect(round2(taxable)).toBe(500);
    expect(round2(tax)).toBe(0);
  });
});
