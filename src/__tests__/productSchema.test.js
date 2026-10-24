/** Product structured data — Google's "offers, review or aggregateRating" rule, never fake ratings. */
import { describe, it, expect } from 'vitest';
import { buildProductSchema, buildProductBreadcrumb, plainText } from '@/lib/productSchema';
import { productSchema as catalogueSchema } from '@/lib/seo-routes.mjs';

const cement = {
  id: 'p1', slug: 'portland-cement', name: 'Portland Cement', category: 'Construction Materials',
  summary: 'Fresh <b>cement</b>.', price: 380, gstRate: 18, hsnCode: '2523', unitLabel: 'bag', minOrderQty: 10,
  optionNames: ['Brand', 'Grade'], rating: 4.5, reviewCount: 2,
  variants: [
    { option1: 'UltraTech', option2: 'OPC 53', price: 450, stockQty: 500, active: true },
    { option1: 'ACC', option2: 'PPC', price: 400, stockQty: 0, active: true },
    { option1: 'ACC', option2: 'OPC 53', price: 380, stockQty: 5, active: true },
    { option1: 'Ambuja', option2: 'PPC', price: 300, stockQty: 50, active: false },   // switched off
  ],
};

describe('buildProductSchema', () => {
  it('gives a product sold in options one AggregateOffer with its price range', () => {
    const s = buildProductSchema(cement);
    expect(s.offers).toMatchObject({ '@type': 'AggregateOffer', lowPrice: '380.00', highPrice: '450.00', offerCount: 3, priceCurrency: 'INR' });
    expect(s.offers.availability).toBe('https://schema.org/InStock');
    expect(s.brand).toBeUndefined();                       // buyers choose between brands
    expect(s.description).toBe('Fresh cement.');
    expect(s.aggregateRating).toMatchObject({ ratingValue: '4.5', reviewCount: 2 });
    expect(s.additionalProperty.find(p => p.name === 'Brand').value).toBe('UltraTech, ACC');
  });

  it('gives a priced product an Offer with the return policy, and no fake shipping', () => {
    const s = buildProductSchema({ slug: 'helmet', name: 'Helmet', price: 480, stockQty: 0 });
    expect(s.offers).toMatchObject({ '@type': 'Offer', price: '480.00', availability: 'https://schema.org/OutOfStock' });
    expect(s.offers.hasMerchantReturnPolicy).toMatchObject({ merchantReturnDays: 7, applicableCountry: 'IN' });
    expect(s.offers.shippingDetails).toBeUndefined();
    expect(s.brand).toEqual({ '@type': 'Brand', name: 'Navgrow Engineering' });
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

  it('builds the breadcrumb and plain text', () => {
    expect(buildProductBreadcrumb(cement).itemListElement.map(i => i.name)).toEqual(['Home', 'Shop', 'Portland Cement']);
    expect(plainText('<p>Hello   **world**</p>')).toBe('Hello world');
  });
});
