/**
 * Products sold in options (e.g. Cement by Brand × Grade × Pack size), each
 * with its own price, stock and bulk prices — picker logic, cart lines, the
 * live re-check and the quote list.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, act, waitFor } from '@testing-library/react';

const availability = vi.fn();
vi.mock('@/lib/api', () => {
  const api = { post: vi.fn(() => Promise.resolve({})), get: vi.fn(() => Promise.resolve({ data: {} })) };
  return { api, default: api, productsApi: { availability: (...a) => availability(...a) } };
});

import {
  priceRange, valueStates, pickValue, findVariantByRef, defaultVariant, perMeasurePrice,
  unitPlural, effectiveTiers, findVariant, productIdOf, lineKeyOf, priceFreshness,
} from '@/lib/variants';
import { isOutOfStock } from '@/lib/stock';
import { toVariantCartItem, toCartItem } from '@/lib/cartItem';
import { CartProvider, useCart, cartReducer, lineIssue } from '@/context/CartContext';
import { RfqProvider, useRfq, rfqReducer } from '@/context/RfqContext';

const PID = '22222222-2222-4222-8222-222222222222';
const V = (n) => `33333333-3333-4333-8333-00000000000${n}`;
const cement = () => ({
  id: PID, name: 'Cement', slug: 'cement', price: 380, gstRate: 18, unitLabel: 'bag', minOrderQty: 10,
  hasVariants: true, optionNames: ['Brand', 'Grade', 'Pack size'], priceTiers: '100:2%',
  variants: [
    { id: V(1), sku: 'CEM-UT-53', option1: 'UltraTech', option2: 'OPC 53', option3: '50 kg bag', price: 450, mrp: 480, stockQty: 500, minOrderQty: null, priceTiers: '50:440, 200:430', active: true },
    { id: V(2), sku: 'CEM-UT-PPC', option1: 'UltraTech', option2: 'PPC', option3: '50 kg bag', price: 420, stockQty: 0, minOrderQty: null, priceTiers: null, active: true },
    { id: V(3), sku: 'CEM-ACC-PPC', option1: 'ACC', option2: 'PPC', option3: '50 kg bag', price: 400, stockQty: 300, minOrderQty: null, priceTiers: null, active: true },
    { id: V(4), sku: 'CEM-ACC-53', option1: 'ACC', option2: 'OPC 53', option3: '50 kg bag', price: 380, stockQty: 5, minOrderQty: null, priceTiers: null, active: true },
    { id: V(5), sku: 'CEM-OLD', option1: 'Old Brand', option2: 'PPC', option3: '50 kg bag', price: 300, stockQty: 999, minOrderQty: null, active: false },
  ],
});

describe('option helpers', () => {
  it('gives the price range over active options only', () => {
    expect(priceRange(cement())).toEqual({ min: 380, max: 450, count: 4, mrpMax: 480 });
  });

  it('picks the cheapest option that can actually be bought (min order 10, so 5 bags is not enough)', () => {
    expect(defaultVariant(cement()).sku).toBe('CEM-ACC-PPC');
  });

  it('finds an option by its values, its SKU or its id', () => {
    expect(findVariant(cement(), ['acc', 'ppc', '50 KG BAG']).sku).toBe('CEM-ACC-PPC');
    expect(findVariant(cement(), ['ACC', 'Grade X', '50 kg bag'])).toBeNull();
    expect(findVariantByRef(cement(), 'cem-ut-53').id).toBe(V(1));
    expect(findVariantByRef(cement(), V(3)).sku).toBe('CEM-ACC-PPC');
    expect(findVariantByRef(cement(), 'CEM-OLD')).toBeNull();     // switched off
  });

  it('says which values combine with the current choice and which are in stock', () => {
    const states = valueStates(cement(), 1, ['UltraTech', 'OPC 53', '50 kg bag']);
    expect(states).toEqual([
      { value: 'OPC 53', offered: true, buyable: true },
      { value: 'PPC', offered: true, buyable: false },
    ]);
  });

  it('jumps to the best option when a value does not combine with the others', () => {
    // UltraTech + PPC exists but is sold out; picking "ACC" keeps the grade.
    expect(pickValue(cement(), ['UltraTech', 'PPC', '50 kg bag'], 0, 'ACC').sku).toBe('CEM-ACC-PPC');
    expect(pickValue(cement(), ['ACC', 'PPC', '50 kg bag'], 1, 'OPC 53').sku).toBe('CEM-ACC-53');
  });

  it('works out the price per kg from the pack size', () => {
    expect(perMeasurePrice(450, cement(), cement().variants[0]).text).toBe('₹9.00/kg');
    expect(perMeasurePrice(62000, { unitLabel: 'tonne' }, null).text).toBe('₹62.0/kg');
    expect(perMeasurePrice(100, { name: 'Helmet' }, null)).toBeNull();
  });

  it('applies an option\'s own bulk prices, else the product\'s percentage discount', () => {
    const p = cement();
    expect(effectiveTiers(p, p.variants[0])).toBe('50:440, 200:430');
    expect(effectiveTiers(p, p.variants[2])).toBe('100:2%');
    expect(effectiveTiers({ priceTiers: '50:395' }, { priceTiers: null })).toBeNull();
    expect(effectiveTiers({ priceTiers: '50:395' }, null)).toBe('50:395');
  });

  it('is out of stock only when no option can be bought', () => {
    const p = cement();
    expect(isOutOfStock(p)).toBe(false);
    p.variants.forEach(v => { v.stockQty = 0; });
    expect(isOutOfStock(p)).toBe(true);
  });

  it('pluralises selling units and reports price freshness', () => {
    expect(unitPlural('bag', 2)).toBe('bags');
    expect(unitPlural('box', 2)).toBe('boxes');
    expect(unitPlural('kg', 50)).toBe('kg');
    expect(unitPlural('', 1)).toBe('unit');
    const now = Date.parse('2026-10-22T10:00:00Z');
    expect(priceFreshness('2026-10-22T06:00:00Z', now)).toBe('Prices updated today');
    expect(priceFreshness('2026-10-19T06:00:00Z', now)).toBe('Prices updated 3 days ago');
    expect(priceFreshness(null, now)).toBeNull();
  });
});

describe('cart lines for options', () => {
  it('makes one line per option, carrying product and option ids', () => {
    const p = cement();
    const line = toVariantCartItem(p, p.variants[0], { qty: 20 });
    expect(line.id).toBe(lineKeyOf(PID, V(1)));
    expect(productIdOf(line)).toBe(PID);
    expect(line.variantId).toBe(V(1));
    expect(line.name).toBe('Cement — UltraTech · OPC 53 · 50 kg bag');
    expect(line.minOrderQty).toBe(10);          // the product's minimum order applies to the option
    expect(line.unitLabel).toBe('bag');
  });

  it('prices the line by quantity — bulk price kicks in at the tier, and back out again', () => {
    const p = cement();
    let state = cartReducer([], { type: 'ADD', item: toVariantCartItem(p, p.variants[0], { qty: 20 }) });
    expect(state[0].price).toBe(450);
    state = cartReducer(state, { type: 'UPDATE_QTY', id: state[0].id, qty: 60 });
    expect(state[0].price).toBe(440);
    state = cartReducer(state, { type: 'UPDATE_QTY', id: state[0].id, qty: 250 });
    expect(state[0].price).toBe(430);
    state = cartReducer(state, { type: 'UPDATE_QTY', id: state[0].id, qty: 30 });
    expect(state[0].price).toBe(450);
  });

  it('applies the product percentage discount to an option without its own bulk prices', () => {
    const p = cement();
    const state = cartReducer([], { type: 'ADD', item: toVariantCartItem(p, p.variants[2], { qty: 100 }) });
    expect(state[0].price).toBe(392);            // 400 − 2%
  });

  it('flags a line whose option was removed, and a plain line for a product that now has options', () => {
    const p = cement();
    const line = { ...toVariantCartItem(p, p.variants[0]), qty: 10 };
    const gone = cartReducer([line], { type: 'SYNC', live: { [PID]: { id: PID, found: true, active: true, hasVariants: true, variants: [] } } });
    expect(lineIssue(gone[0])).toBe('unavailable');
    const plain = { id: PID, name: 'Cement', price: 380, qty: 10 };
    const after = cartReducer([plain], { type: 'SYNC', live: { [PID]: { id: PID, found: true, active: true, hasVariants: true, variants: [] } } });
    expect(after[0].needsOption).toBe(true);
    expect(lineIssue(after[0])).toBe('unavailable');
  });

  it('a live re-check takes the option\'s current price and stock', () => {
    const p = cement();
    const line = { ...toVariantCartItem(p, p.variants[0]), qty: 60 };
    const live = { id: PID, found: true, active: true, hasVariants: true,
      variants: [{ id: V(1), label: 'UltraTech · OPC 53 · 50 kg bag', price: 455, stockQty: 40, minOrderQty: 10, priceTiers: '50:445', active: true }] };
    const [after] = cartReducer([line], { type: 'SYNC', live: { [PID]: live } });
    expect(after.qty).toBe(40);                  // capped to stock
    expect(after.price).toBe(455);               // 40 < 50, so no bulk price
    expect(after.qtyNote).toMatch(/Only 40 available/);
  });
});

describe('the add-to-cart gate', () => {
  let ctx;
  const Grab = () => { ctx = useCart(); return null; };
  beforeEach(() => { localStorage.clear(); availability.mockReset(); ctx = null; });

  it('refuses a product sold in options until one is chosen', async () => {
    render(<RfqProvider><CartProvider><Grab /></CartProvider></RfqProvider>);
    let r;
    await act(async () => { r = await ctx.addItem(toCartItem(cement(), { qty: 10 })); });
    expect(r.reason).toBe('needs_option');
    expect(ctx.items).toHaveLength(0);
  });

  it('adds the chosen option', async () => {
    render(<RfqProvider><CartProvider><Grab /></CartProvider></RfqProvider>);
    const p = cement();
    await act(async () => { await ctx.addItem(toVariantCartItem(p, p.variants[2], { qty: 12 })); });
    expect(ctx.items).toHaveLength(1);
    expect(ctx.items[0].variantId).toBe(V(3));
    expect(ctx.items[0].qty).toBe(12);
  });

  it('checks a saved copy of an option-product with the live shop and refuses it without an option', async () => {
    availability.mockResolvedValue({ data: [{ ref: PID, id: PID, found: true, active: true, hasVariants: true, variants: [] }] });
    render(<RfqProvider><CartProvider><Grab /></CartProvider></RfqProvider>);
    let r;
    await act(async () => { r = await ctx.addItem({ id: PID, name: 'Cement', price: 380 }); });
    expect(r.reason).toBe('needs_option');
  });
});

describe('quote list', () => {
  it('keeps two options of one product as separate lines', () => {
    let s = rfqReducer([], { type: 'ADD', item: { key: lineKeyOf(PID, V(1)), productId: PID, productName: 'Cement — UltraTech', quantity: 100 } });
    s = rfqReducer(s, { type: 'ADD', item: { key: lineKeyOf(PID, V(3)), productId: PID, productName: 'Cement — ACC', quantity: 50 } });
    s = rfqReducer(s, { type: 'ADD', item: { key: lineKeyOf(PID, V(1)), productId: PID, productName: 'Cement — UltraTech', quantity: 20 } });
    expect(s).toHaveLength(2);
    expect(s[0].quantity).toBe(120);
    s = rfqReducer(s, { type: 'REMOVE', key: lineKeyOf(PID, V(3)) });
    expect(s).toHaveLength(1);
  });

  it('adds an option with its label, SKU and ids', async () => {
    let rfq;
    const Grab = () => { rfq = useRfq(); return null; };
    render(<RfqProvider><Grab /></RfqProvider>);
    const p = cement();
    act(() => rfq.addToRfq(p, 200, p.variants[1]));
    expect(rfq.items[0]).toMatchObject({
      productId: PID, variantId: V(2), productName: 'Cement — UltraTech · PPC · 50 kg bag',
      sku: 'CEM-UT-PPC', quantity: 200, outOfStock: true, unitLabel: 'bag',
    });
    expect(rfq.inRfq(PID)).toBe(true);
    expect(rfq.inRfq(lineKeyOf(PID, V(2)))).toBe(true);
    expect(rfq.inRfq(lineKeyOf(PID, V(1)))).toBe(false);
    await waitFor(() => expect(rfq.drawerOpen).toBe(true));
  });
});
