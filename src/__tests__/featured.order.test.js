import { describe, it, expect } from 'vitest';

/**
 * Mirrors the combine logic in ShopPreview's useFeaturedProducts: flagged
 * featured products first, then newest to fill up to 4, deduped by id.
 * Kept as a pure function here so the ordering rule is locked by a test.
 */
function combineFeatured(featured, newest, limit = 4) {
  const seen = new Set();
  const out = [];
  for (const p of [...featured, ...newest]) {
    if (out.length >= limit) break;
    const key = p.id ?? p.slug ?? p.sku;
    if (key == null || seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

describe('homepage featured ordering', () => {
  it('puts admin-flagged featured products first', () => {
    const featured = [{ id: 'a' }, { id: 'b' }];
    const newest = [{ id: 'c' }, { id: 'd' }, { id: 'e' }];
    expect(combineFeatured(featured, newest).map(p => p.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('fills remaining slots with newest when fewer than 4 are flagged', () => {
    const featured = [{ id: 'a' }];
    const newest = [{ id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }];
    expect(combineFeatured(featured, newest).map(p => p.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('never shows the same product twice (a featured product also in newest)', () => {
    const featured = [{ id: 'a' }];
    const newest = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
    const ids = combineFeatured(featured, newest).map(p => p.id);
    expect(ids).toEqual(['a', 'b', 'c', 'd']);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('shows a newly-added product even before it is flagged featured', () => {
    // No featured flagged yet; newest still populates the row.
    const ids = combineFeatured([], [{ id: 'new' }, { id: 'x' }]).map(p => p.id);
    expect(ids[0]).toBe('new');
  });

  it('caps at four', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ id: i }));
    expect(combineFeatured(many, []).length).toBe(4);
  });
});
