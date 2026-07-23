import { describe, it, expect } from 'vitest';
import { toCartItem } from '@/lib/cartItem';

/**
 * The cart previously lost gstRate on several "add to cart" paths, which made a
 * 12% item display 18% tax — a number the customer was never charged. These
 * tests pin the mapper's behaviour so that regression cannot come back.
 */
describe('toCartItem', () => {
  it('keeps the tax fields from a static-catalogue product', () => {
    const item = toCartItem({
      id: 3, name: 'Anti-Impact Safety Gloves', price: 890, mrp: 1100,
      image: '/g.jpg', hsn: '6116', gstRate: 12, stockQty: 40,
    });
    expect(item.gstRate).toBe(12);
    expect(item.hsn).toBe('6116');
    expect(item.mrp).toBe(1100);
  });

  it('normalises the API shape (hsnCode, string rate)', () => {
    const item = toCartItem({
      id: 'uuid-1', name: 'FR Coverall', price: '2400',
      imageUrl: '/c.jpg', hsnCode: '6211', gstRate: '12.00',
    });
    expect(item.gstRate).toBe(12);
    expect(item.hsn).toBe('6211');
    expect(item.price).toBe(2400);
    expect(item.image).toBe('/c.jpg');
  });

  it('leaves gstRate undefined when the product has none, rather than inventing one', () => {
    // The cart applies the statutory 18% fallback itself; the mapper must not
    // guess a rate here or a genuinely missing rate becomes invisible.
    const item = toCartItem({ id: 9, name: 'Unclassified', price: 100 });
    expect(item.gstRate).toBeUndefined();
    expect(item.hsn).toBeUndefined();
  });

  it('merges extras such as quantity', () => {
    const item = toCartItem({ id: 1, name: 'Helmet', price: 480, gstRate: 18 }, { qty: 3 });
    expect(item.qty).toBe(3);
    expect(item.gstRate).toBe(18);
  });

  it('returns null for a missing product instead of a broken line', () => {
    expect(toCartItem(null)).toBeNull();
    expect(toCartItem(undefined)).toBeNull();
  });
});
