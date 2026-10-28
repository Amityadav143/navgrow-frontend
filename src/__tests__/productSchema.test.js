/**
 * Product structured data — Google's Product snippet rule ("offers, review or
 * aggregateRating"), Merchant listings (one Offer price + image per product) and
 * product variants (ProductGroup) — and never fake ratings.
 */
import { describe, it, expect } from 'vitest';
import {
  buildProductSchema, buildProductBreadcrumb, plainText, googleListingProblems, returnPolicy, MAX_VARIANTS_IN_MARKUP,
} from '@/lib/productSchema';

// Written out in full in every Offer (Google's documented form — no "@id" references).
const RETURN_POLICY = {
  '@type': 'MerchantReturnPolicy', applicableCountry: 'IN', merchantReturnDays: 7,
  returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow', returnMethod: 'https://schema.org/ReturnByMail',
};
import { productSchema as catalogueSchema } from '@/lib/seo-routes.mjs';

const NOW = '2026-10-28T10:00:00Z';
const cement = () => ({
  id: 'p1', slug: 'portland-cement', sku: 'NGP-CEM', name: 'Portland Cement', category: 'Construction Materials',
  summary: 'Fresh <b>cement</b>.', price: 380, gstRate: 18, hsnCode: '2523', unitLabel: 'bag', minOrderQty: 10,
  image: '/api/uploads/cement.jpg', optionNames: ['Brand', 'Grade'], rating: 4.5, reviewCount: 2,
  variants: [
    { id: 'v1', sku: 'CEM-UT-53', option1: 'UltraTech', option2: 'OPC 53', price: 450, stockQty: 500, active: true },
    { id: 'v2', sku: 'CEM-ACC-PPC', option1: 'ACC', option2: 'PPC', price: 400, stockQty: 0, active: true },
    { id: 'v3', sku: 'CEM-ACC-53', option1: 'ACC', option2: 'OPC 53', price: 380, stockQty: 5, active: true, imageUrl: 'https://cdn.example.com/acc.jpg' },
    { id: 'v4', sku: 'CEM-AMB-PPC', option1: 'Ambuja', option2: 'PPC', price: 300, stockQty: 50, active: false },   // switched off
  ],
});

describe('products sold in options → ProductGroup with one Offer per option', () => {
  const g = buildProductSchema(cement(), { now: NOW });

  it('is a ProductGroup on the base URL, with a group id and no single brand when buyers choose the brand', () => {
    expect(g).toMatchObject({ '@type': 'ProductGroup', '@id': 'https://navgrow.org/shop/portland-cement#product',
      url: 'https://navgrow.org/shop/portland-cement', productGroupID: 'NGP-CEM', description: 'Fresh cement.' });
    expect(g.brand).toBeUndefined();
    expect(g.variesBy).toBeUndefined();               // Brand and Grade aren't properties Google lists for variesBy
    expect(g.offers).toBeUndefined();
    expect(g.aggregateRating).toMatchObject({ ratingValue: '4.5', reviewCount: 2 });
  });

  it('lists every option that is on sale as its own Product with an Offer (one price, own URL, own SKU)', () => {
    expect(g.hasVariant.map(v => v.sku)).toEqual(['CEM-UT-53', 'CEM-ACC-PPC', 'CEM-ACC-53']);
    const [ut, accPpc, acc53] = g.hasVariant;
    expect(ut).toMatchObject({
      '@type': 'Product', name: 'Portland Cement — UltraTech · OPC 53', inProductGroupWithID: 'NGP-CEM',
      brand: { '@type': 'Brand', name: 'UltraTech' }, image: 'https://navgrow.org/api/uploads/cement.jpg',
      additionalProperty: [{ '@type': 'PropertyValue', name: 'Grade', value: 'OPC 53' }],
      offers: {
        '@type': 'Offer', url: 'https://navgrow.org/shop/portland-cement?variant=CEM-UT-53', price: '450.00', priceCurrency: 'INR',
        availability: 'https://schema.org/InStock', itemCondition: 'https://schema.org/NewCondition',
        priceValidUntil: '2027-10-28', hasMerchantReturnPolicy: RETURN_POLICY,
      },
    });
    expect(returnPolicy()).toEqual(RETURN_POLICY);
    expect(accPpc.offers.availability).toBe('https://schema.org/OutOfStock');      // none in stock
    expect(acc53.offers.availability).toBe('https://schema.org/OutOfStock');       // 5 bags < minimum order of 10
    expect(acc53.image).toBe('https://cdn.example.com/acc.jpg');                   // the option's own photo
    expect(new Set(g.hasVariant.map(v => v.offers.url)).size).toBe(3);
  });

  it('maps size-like options to size, and lists in variesBy only what really differs', () => {
    const p = { ...cement(), optionNames: ['Brand', 'Pack size'] };
    p.variants = p.variants.map(v => ({ ...v, option2: '50 kg bag' }));
    p.variants[1].option2 = '25 kg bag';
    const s = buildProductSchema(p, { now: NOW });
    expect(s.variesBy).toEqual(['https://schema.org/size']);
    expect(s.hasVariant[0]).toMatchObject({ size: '50 kg bag', brand: { name: 'UltraTech' } });
    expect(s.hasVariant[0].additionalProperty).toBeUndefined();
    // Every option the same pack size → not a "variesBy"; one brand for all → the group's brand.
    const same = { ...p, variants: p.variants.map(v => ({ ...v, option1: 'UltraTech', option2: '50 kg bag' })) };
    same.variants[1].option2 = '50 kg bag';
    const t = buildProductSchema({ ...same, optionNames: ['Brand', 'Pack size', 'Grade'], variants: same.variants.map((v, i) => ({ ...v, option3: `G${i}` })) }, { now: NOW });
    expect(t.variesBy).toBeUndefined();
    expect(t.brand).toEqual({ '@type': 'Brand', name: 'UltraTech' });
  });

  it('keeps one brand on the group when the options are not brands', () => {
    const p = { ...cement(), optionNames: ['Diameter'], specs: [{ label: 'Brand', value: 'Tata Tiscon' }] };
    p.variants = [{ id: 'a', sku: 'TMT-8', option1: '8 mm', price: 62500, stockQty: 12, active: true }];
    const s = buildProductSchema(p, { now: NOW });
    expect(s.brand).toEqual({ '@type': 'Brand', name: 'Tata Tiscon' });
    expect(s.hasVariant[0]).toMatchObject({ size: '8 mm', name: 'Portland Cement — 8 mm' });
  });

  it('caps very long option lists', () => {
    const p = { ...cement(), variants: Array.from({ length: 140 }, (_, i) => ({ id: `x${i}`, sku: `S-${i}`, option1: `B${i}`, option2: 'G', price: 100 + i, stockQty: 100, active: true })) };
    expect(buildProductSchema(p).hasVariant).toHaveLength(MAX_VARIANTS_IN_MARKUP);
  });
});

describe('single products', () => {
  it('get an Offer with the return policy written out, and a brand', () => {
    const s = buildProductSchema({ slug: 'helmet', name: 'Helmet', price: 480, stockQty: 0, imageUrl: '/h.jpg' }, { now: NOW });
    expect(s['@type']).toBe('Product');
    expect(s.offers).toMatchObject({ '@type': 'Offer', price: '480.00', availability: 'https://schema.org/OutOfStock' });
    expect(s.offers.hasMerchantReturnPolicy).toEqual(RETURN_POLICY);
    expect(s.offers.shippingDetails).toBeUndefined();              // delivery charges depend on the pincode — not claimed
    expect(s.brand).toEqual({ '@type': 'Brand', name: 'Navgrow Engineering' });
    expect(s.image).toBe('https://navgrow.org/h.jpg');
  });

  it('takes the brand from a "Brand:" specification, whatever shape the specifications have', () => {
    expect(buildProductSchema({ slug: 'g', name: 'Gloves', price: 40, specifications: 'Material: Cotton\nBrand: Karam' }).brand.name).toBe('Karam');
    expect(buildProductSchema({ slug: 'g', name: 'Gloves', price: 40, specs: ['Material: Cotton', 'Brand: Karam'] }).brand.name).toBe('Karam');
    expect(buildProductSchema({ slug: 'g', name: 'Gloves', price: 40, specs: [{ label: 'Brand', value: 'Karam' }] }).brand.name).toBe('Karam');
  });

  it('never turns placeholder ratings into aggregateRating', () => {
    const s = buildProductSchema({ slug: 'x', name: 'X', price: 10, rating: 4.8, reviews: 24 }, { genuineRatings: false });
    expect(s.aggregateRating).toBeUndefined();
    expect(catalogueSchema({ slug: 'x', name: 'X', price: 10, rating: 4.8, reviews: 24 }).aggregateRating).toBeUndefined();
  });

  it('emits nothing when there is neither a price nor a real rating', () => {
    expect(buildProductSchema({ slug: 'q', name: 'Quote only', price: 0 })).toBeNull();
    expect(buildProductSchema({ slug: 'q', name: 'Rated', price: 0, rating: 5, reviewCount: 1 }).aggregateRating.reviewCount).toBe(1);
  });
});

describe('helpers', () => {
  it('builds the breadcrumb and plain text', () => {
    expect(buildProductBreadcrumb(cement()).itemListElement.map(i => i.name)).toEqual(['Home', 'Shop', 'Portland Cement']);
    expect(plainText('<p>Hello   **world**</p>')).toBe('Hello world');
  });

  it('says what keeps a product out of Google product results', () => {
    expect(googleListingProblems({ price: 0, imageUrl: '' })).toEqual(['No price — Google can\'t show it as a product', 'No photo — needed for Google Shopping']);
    expect(googleListingProblems(cement())).toEqual([]);
    expect(googleListingProblems({ price: 0, image: '/x.jpg', variants: [{ price: 10, active: true }] })).toEqual([]);
  });
});
