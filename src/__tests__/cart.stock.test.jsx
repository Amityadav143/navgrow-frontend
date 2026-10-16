/**
 * Stock rules for the cart — the regression behind "customers could add a
 * sold-out product from Recently Viewed (and other places) and go on to buy it".
 * Every add goes through CartContext.addItem, which must refuse known
 * out-of-stock items and check saved copies (no stock figure) with the live
 * shop first; the cart re-check must flag lines that went out of stock.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, act, waitFor } from '@testing-library/react';

const availability = vi.fn();
vi.mock('@/lib/api', () => {
  const api = { post: vi.fn(() => Promise.resolve({})), get: vi.fn(() => Promise.resolve({ data: {} })) };
  return { api, default: api, productsApi: { availability: (...a) => availability(...a) } };
});

import { CartProvider, useCart, cartReducer, lineIssue, isBlockedLine } from '@/context/CartContext';
import { RfqProvider } from '@/context/RfqContext';
import { isOutOfStock, stockOf, moqOf, clampToStock, liveStock } from '@/lib/stock';

const ID = '11111111-1111-4111-8111-111111111111';
const live = (over = {}) => ({ data: [{ ref: ID, found: true, id: ID, slug: 'helmet', name: 'Helmet', active: true,
  stockQty: 10, minOrderQty: 1, price: 100, ...over }] });

let ctx;
const Grab = () => { ctx = useCart(); return null; };
const mount = () => render(<RfqProvider><CartProvider><Grab /></CartProvider></RfqProvider>);

beforeEach(() => { localStorage.clear(); availability.mockReset(); ctx = null; });

describe('stock helpers', () => {
  it('treats unknown stock as unknown, and a live null stock as zero', () => {
    expect(stockOf({})).toBeNull();
    expect(stockOf({ stockQty: 0 })).toBe(0);
    expect(liveStock(null)).toBe(0);
    expect(liveStock(undefined)).toBe(0);
  });
  it('is out of stock below the minimum order quantity', () => {
    expect(isOutOfStock({ stockQty: 0 })).toBe(true);
    expect(isOutOfStock({ stockQty: 3, minOrderQty: 5 })).toBe(true);
    expect(isOutOfStock({ stockQty: 5, minOrderQty: 5 })).toBe(false);
    expect(isOutOfStock({})).toBe(false);                 // unknown → server decides
    expect(isOutOfStock({ stockQty: 9, active: false })).toBe(true);
  });
  it('clamps quantities to [MOQ, stock]', () => {
    expect(clampToStock(1, { stockQty: 10, minOrderQty: 4 })).toBe(4);
    expect(clampToStock(50, { stockQty: 10 })).toBe(10);
    expect(moqOf({ minOrderQty: '3' })).toBe(3);
  });
});

describe('cart reducer', () => {
  it('starts a new line at the minimum order quantity and never exceeds stock', () => {
    const s1 = cartReducer([], { type: 'ADD', item: { id: ID, price: 1, stockQty: 6, minOrderQty: 4 } });
    expect(s1[0].qty).toBe(4);
    const s2 = cartReducer(s1, { type: 'ADD', item: { id: ID, price: 1, stockQty: 6, minOrderQty: 4, qty: 5 } });
    expect(s2[0].qty).toBe(6);
    const s3 = cartReducer(s2, { type: 'UPDATE_QTY', id: ID, qty: 2 });
    expect(s3[0].qty).toBe(4);
  });
  it("Buy now ('set') makes the line exactly the chosen quantity", () => {
    const s1 = cartReducer([], { type: 'ADD', item: { id: ID, price: 1, stockQty: 9, qty: 3 } });
    const s2 = cartReducer(s1, { type: 'ADD', item: { id: ID, price: 1, stockQty: 9, qty: 2 }, mode: 'set' });
    expect(s2[0].qty).toBe(2);
  });
  it('a live re-check flags sold-out and removed lines and caps quantities', () => {
    const cart = [{ id: ID, name: 'Helmet', price: 100, qty: 5, stockQty: 9 }];
    const soldOut = cartReducer(cart, { type: 'SYNC', live: { [ID]: live({ stockQty: 0 }).data[0] } });
    expect(lineIssue(soldOut[0])).toBe('out_of_stock');
    const gone = cartReducer(cart, { type: 'SYNC', live: { [ID]: { ref: ID, found: false } } });
    expect(lineIssue(gone[0])).toBe('unavailable');
    const fewer = cartReducer(cart, { type: 'SYNC', live: { [ID]: live({ stockQty: 2, price: 120 }).data[0] } });
    expect(fewer[0].qty).toBe(2);
    expect(fewer[0].price).toBe(120);
    expect(lineIssue(fewer[0])).toBeNull();
  });
});

describe('addItem — the single gate for every "Add to cart"', () => {
  it('refuses a product known to be out of stock', async () => {
    mount();
    let r;
    await act(async () => { r = await ctx.addItem({ id: ID, name: 'Helmet', price: 100, stockQty: 0 }); });
    expect(r.ok).toBe(false);
    expect(ctx.items).toHaveLength(0);
  });

  it('checks a saved copy without stock (Recently Viewed / wishlist) with the live shop first', async () => {
    availability.mockResolvedValue(live({ stockQty: 0 }));
    mount();
    let r;
    await act(async () => { r = await ctx.addItem({ id: ID, name: 'Helmet', price: 100 }); });
    expect(availability).toHaveBeenCalled();
    expect(r.ok).toBe(false);
    expect(ctx.items).toHaveLength(0);
  });

  it('adds a saved copy that is in stock, with the live price and capped quantity', async () => {
    availability.mockResolvedValue(live({ stockQty: 2, price: 120 }));
    mount();
    await act(async () => { await ctx.addItem({ id: ID, name: 'Helmet', price: 100, qty: 5 }); });
    expect(ctx.items).toHaveLength(1);
    expect(ctx.items[0].qty).toBe(2);
    expect(ctx.items[0].price).toBe(120);
  });

  it('refuses a sample-catalogue product (not from the live shop)', async () => {
    mount();
    let r;
    await act(async () => { r = await ctx.addItem({ id: '3', name: 'Sample helmet', price: 100, stockQty: 50 }); });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('not_live');
    expect(ctx.items).toHaveLength(0);
    // …and an old sample line already in a saved cart blocks checkout.
    expect(lineIssue({ id: '3', price: 1, qty: 1 })).toBe('unavailable');
  });

  it('refuses a product that has been removed from the shop', async () => {
    availability.mockResolvedValue({ data: [{ ref: ID, found: false }] });
    mount();
    let r;
    await act(async () => { r = await ctx.addItem({ id: ID, name: 'Old item', price: 100 }); });
    expect(r.ok).toBe(false);
    expect(ctx.items).toHaveLength(0);
  });

  it('flags a saved cart line that went out of stock and blocks checkout', async () => {
    localStorage.setItem('navgrow_cart_v1', JSON.stringify([{ id: ID, name: 'Helmet', price: 100, qty: 1, stockQty: 4 }]));
    availability.mockResolvedValue(live({ stockQty: 0 }));
    mount();
    await waitFor(() => expect(ctx.hasCartIssues).toBe(true));
    expect(ctx.cartIssues[0].issue).toBe('out_of_stock');
    // …and the sold-out line no longer counts towards what can be paid for.
    expect(ctx.payableItems).toHaveLength(0);
    expect(isBlockedLine(ctx.items[0])).toBe(true);
  });
});

describe('re-check right before payment', () => {
  const OTHER = '22222222-2222-4222-8222-222222222222';

  it('reports lines whose price or quantity moved, so checkout can show them again', async () => {
    localStorage.setItem('navgrow_cart_v1', JSON.stringify([{ id: ID, name: 'Helmet', price: 100, qty: 5, stockQty: 9 }]));
    // First check (on load): unchanged.
    availability.mockResolvedValueOnce(live({ stockQty: 9, price: 100 }));
    mount();
    await waitFor(() => expect(availability).toHaveBeenCalledTimes(1));
    // Second check (pay button): stock fell to 3 and the price went up.
    availability.mockResolvedValueOnce(live({ stockQty: 3, price: 110 }));
    let r;
    await act(async () => { r = await ctx.syncAvailability({ force: true, announce: false }); });
    expect(r.issues).toHaveLength(0);
    expect(r.changed).toHaveLength(1);
    expect(r.changed[0].item.qty).toBe(3);
    expect(r.changed[0].item.price).toBe(110);
    expect(ctx.items[0].qty).toBe(3);
  });

  it('reports nothing when stock and price are unchanged', async () => {
    localStorage.setItem('navgrow_cart_v1', JSON.stringify([{ id: ID, name: 'Helmet', price: 100, qty: 2, stockQty: 9 }]));
    availability.mockResolvedValue(live({ stockQty: 9, price: 100 }));
    mount();
    await waitFor(() => expect(availability).toHaveBeenCalledTimes(1));
    let r;
    await act(async () => { r = await ctx.syncAvailability({ force: true, announce: false }); });
    expect(r.issues).toHaveLength(0);
    expect(r.changed).toHaveLength(0);
  });

  it('keeps in-stock lines payable next to a sold-out one', async () => {
    localStorage.setItem('navgrow_cart_v1', JSON.stringify([
      { id: ID, name: 'Helmet', price: 100, qty: 1, stockQty: 4 },
      { id: OTHER, name: 'Gloves', price: 50, qty: 2, stockQty: 8 },
    ]));
    availability.mockResolvedValue({ data: [
      live({ stockQty: 0 }).data[0],
      { ref: OTHER, found: true, id: OTHER, slug: 'gloves', name: 'Gloves', active: true, stockQty: 8, minOrderQty: 1, price: 50 },
    ] });
    mount();
    await waitFor(() => expect(ctx.hasCartIssues).toBe(true));
    expect(ctx.payableItems.map(i => i.id)).toEqual([OTHER]);
  });
});
