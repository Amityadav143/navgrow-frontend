/**
 * Bulk (quantity) pricing. Mirrors PriceTiersTest.java on the server — the
 * cart total must equal what the server charges, so the cases are shared.
 */
import { describe, it, expect } from 'vitest';
import { normalizeTiers, unitPriceFor, tierTable, nextTier, parseTiers, rupees } from '@/lib/pricing';

const BASE = 420;
const rejected = (text, part) => expect(() => normalizeTiers(text, BASE)).toThrow(part);

describe('normalizeTiers', () => {
  it('canonicalises fixed and percent tiers', () => {
    expect(normalizeTiers('50:395, 200:385', BASE)).toBe('50:395, 200:385');
    expect(normalizeTiers('200 bags = ₹385\n50+ : 395', BASE)).toBe('50:395, 200:385');
    expect(normalizeTiers('50:2%;200:4.5%', BASE)).toBe('50:2%, 200:4.5%');
    expect(normalizeTiers('10:399.50', BASE)).toBe('10:399.5');
    expect(normalizeTiers('   ', BASE)).toBeNull();
    expect(normalizeTiers(null, BASE)).toBeNull();
  });

  it('rejects tiers that do not make sense', () => {
    rejected('50:430', 'lower than the normal price');
    rejected('50:420', 'lower than the normal price');
    rejected('50:395, 200:400', 'should fall');
    rejected('50:5%, 200:3%', 'should grow');
    rejected('1:300', '2 units or more');
    rejected('50:395, 200:4%', 'not both');
    rejected('abc', "isn't understood");
    rejected('50:395, 50:390', 'Two bulk tiers start at 50');
    rejected('50:95%', 'at most 90%');
    rejected('50:2.25%', 'one decimal place');
    rejected('2:400, 3:399, 4:398, 5:397, 6:396, 7:395, 8:394', 'at most 6');
  });
});

describe('unitPriceFor', () => {
  it('fixed tiers', () => {
    const t = '50:395, 200:385';
    expect(unitPriceFor(BASE, t, 1)).toBe(420);
    expect(unitPriceFor(BASE, t, 49)).toBe(420);
    expect(unitPriceFor(BASE, t, 50)).toBe(395);
    expect(unitPriceFor(BASE, t, 199)).toBe(395);
    expect(unitPriceFor(BASE, t, 200)).toBe(385);
    expect(unitPriceFor(BASE, t, 1000)).toBe(385);
  });

  it('percent tiers round half-up to the paisa, exactly like the server', () => {
    expect(unitPriceFor(BASE, '50:2%, 200:4.5%', 50)).toBe(411.6);
    expect(unitPriceFor(BASE, '50:2%, 200:4.5%', 200)).toBe(401.1);
    expect(unitPriceFor(399.99, '10:2.5%', 10)).toBe(389.99);
    expect(unitPriceFor(100.10, '10:5%', 10)).toBe(95.1);
    expect(unitPriceFor(5.00, '2:2.9%', 2)).toBe(4.86);   // float maths would give 4.85
  });

  it('never throws and never charges more than the normal price', () => {
    expect(unitPriceFor(BASE, 'garbage', 100)).toBe(420);
    expect(unitPriceFor(BASE, '50:430', 100)).toBe(420);
    expect(unitPriceFor(BASE, null, 100)).toBe(420);
  });
});

describe('display helpers', () => {
  it('builds a tier table with ranges and savings', () => {
    expect(tierTable(420, '50:395, 200:385')).toEqual([
      { minQty: 1, maxQty: 49, unitPrice: 420, savePct: 0 },
      { minQty: 50, maxQty: 199, unitPrice: 395, savePct: 6 },
      { minQty: 200, maxQty: null, unitPrice: 385, savePct: 8.3 },
    ]);
    expect(tierTable(420, '')).toEqual([]);
  });

  it('starts the table at the minimum order, at the price that applies there', () => {
    // Used to read "50–49 bags ₹420" — rows a buyer could never order.
    expect(tierTable(420, '50:2%', 50)).toEqual([
      { minQty: 50, maxQty: null, unitPrice: 411.6, savePct: 2 },
    ]);
    expect(tierTable(420, '50:2%, 200:4%', 100)).toEqual([
      { minQty: 100, maxQty: 199, unitPrice: 411.6, savePct: 2 },
      { minQty: 200, maxQty: null, unitPrice: 403.2, savePct: 4 },
    ]);
    expect(tierTable(420, '10:2%, 20:3%', 25)).toEqual([
      { minQty: 25, maxQty: null, unitPrice: 407.4, savePct: 3 },
    ]);
    expect(tierTable(420, '50:395', 10)[0]).toEqual({ minQty: 10, maxQty: 49, unitPrice: 420, savePct: 0 });
    expect(tierTable(420, '50:450')).toEqual([]);   // never cheaper — nothing to show
  });

  it('suggests the next cheaper tier', () => {
    expect(nextTier(420, '50:395, 200:385', 40)).toEqual({ minQty: 50, unitPrice: 395, addQty: 10 });
    expect(nextTier(420, '50:395, 200:385', 120)).toEqual({ minQty: 200, unitPrice: 385, addQty: 80 });
    expect(nextTier(420, '50:395, 200:385', 250)).toBeNull();
  });

  it('parses loosely written tiers', () => {
    expect(parseTiers('100 bags @ ₹380')).toEqual([{ minQty: 100, value: 380, percent: false }]);
  });
});

describe('rupees', () => {
  it('prints whole rupees plainly and anything else to the paisa', () => {
    expect(rupees(440)).toBe('₹440');
    expect(rupees(411.6)).toBe('₹411.60');
    expect(rupees(22000.4)).toBe('₹22,000.40');
    expect(rupees(338.983)).toBe('₹338.98');
    expect(rupees(1234567)).toBe('₹12,34,567');
    expect(rupees(null)).toBe('₹0');
  });
});
