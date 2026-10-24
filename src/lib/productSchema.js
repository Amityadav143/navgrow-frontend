/**
 * © 2024–2026 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 *
 * productSchema.js — the ONE place that builds a product page's JSON-LD.
 *
 * Used by the product page (in the browser) and by scripts/prerender.mjs (at
 * build time), and mirrored in public/og.php (what crawlers get for products
 * that only exist in the database). Plain ESM with no imports, so Node can load
 * it during the build.
 *
 * Google's rule for Product snippets: a Product must carry `offers`, `review`
 * or `aggregateRating`. So:
 *   • a product with a price gets an Offer; a product sold in options (e.g.
 *     Cement by brand / grade) gets an AggregateOffer with the price range;
 *   • aggregateRating only from GENUINE, approved reviews (never seeded or
 *     made-up numbers — that breaks Google's review-snippet policy);
 *   • a product with neither a price nor real reviews gets NO Product markup at
 *     all (returns null) — an invalid Product is worse than none.
 */

const SITE_URL = 'https://navgrow.org';
const SELLER = { '@type': 'Organization', name: 'Navgrow Engineering Service Pvt. Ltd.', url: SITE_URL };

/** Matches the published refund policy: 7 days from delivery, reverse pickup arranged. */
const RETURN_POLICY = {
  '@type': 'MerchantReturnPolicy',
  applicableCountry: 'IN',
  returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
  merchantReturnDays: 7,
  returnMethod: 'https://schema.org/ReturnByMail',
};

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};
const money = (n) => (Math.round(n * 100) / 100).toFixed(2);

/** Text for a description: tags and runs of whitespace removed, kept to a sane length. */
export function plainText(s, max = 5000) {
  const t = String(s || '').replace(/<[^>]*>/g, ' ').replace(/[#*_`>]+/g, ' ')
    .replace(/\s+/g, ' ').replace(/\s+([.,;:!?])/g, '$1').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** Absolute URL for an image path (https://… stays; /x.jpg → site URL). */
export function absoluteUrl(u, siteUrl = SITE_URL) {
  const s = String(u || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  return `${siteUrl}${s.startsWith('/') ? '' : '/'}${s}`;
}

/** The options a product is sold in that are switched on and priced. */
function liveOptions(p) {
  const vs = Array.isArray(p?.variants) ? p.variants : [];
  return vs.filter(v => v && v.active !== false && num(v.price) > 0);
}

function optionStock(v) {
  const s = num(v?.liveStock ?? v?.stockQty);
  return Number.isFinite(s) ? s : 0;
}

/** Is anything about this product buyable right now? */
export function productAvailable(p) {
  const opts = liveOptions(p);
  if (opts.length) {
    return opts.some(v => {
      const moq = Math.max(1, num(v.minOrderQty) || num(p.minOrderQty) || 1);
      return v.inStock === true || (v.inStock !== false && optionStock(v) >= moq);
    });
  }
  if (p?.inStock === false) return false;
  if (p?.inStock === true) return true;
  const s = num(p?.stockQty);
  return Number.isFinite(s) ? s > 0 : true;
}

/**
 * Product JSON-LD, or null when the product can't carry valid Product markup.
 * @param p        product as the API / catalogue returns it
 * @param options  { siteUrl, genuineRatings } — genuineRatings=false for data
 *                 whose rating/reviewCount aren't backed by approved reviews
 *                 (the static fallback catalogue).
 */
export function buildProductSchema(p, { siteUrl = SITE_URL, genuineRatings = true } = {}) {
  if (!p || !p.name) return null;
  const slug = p.slug || p.id;
  const url = `${siteUrl}/shop/${slug}`;
  const optionNames = Array.isArray(p.optionNames) ? p.optionNames
    : [p.option1Name, p.option2Name, p.option3Name].filter(Boolean);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: String(p.name),
    url,
    description: plainText(p.summary || p.description || p.desc || p.name, 5000),
    sku: String(p.sku || slug || ''),
  };
  // One brand only when the product IS one brand — not when buyers choose
  // between brands (e.g. Cement: UltraTech / ACC / Ambuja).
  const variesByBrand = optionNames.some(n => /brand|make|manufacturer/i.test(String(n)));
  if (!variesByBrand) schema.brand = { '@type': 'Brand', name: p.brand || 'Navgrow Engineering' };
  const img = p.image || p.imageUrl;
  if (img) schema.image = absoluteUrl(img, siteUrl);
  if (p.category || p.cat) schema.category = String(p.category || p.cat);

  const available = productAvailable(p);
  const availability = available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
  const opts = liveOptions(p);
  if (opts.length) {
    const prices = opts.map(v => num(v.price));
    schema.offers = {
      '@type': 'AggregateOffer',
      url,
      priceCurrency: 'INR',
      lowPrice: money(Math.min(...prices)),
      highPrice: money(Math.max(...prices)),
      offerCount: opts.length,
      availability,
      itemCondition: 'https://schema.org/NewCondition',
      seller: SELLER,
    };
  } else if (num(p.price) > 0) {
    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 1);
    schema.offers = {
      '@type': 'Offer',
      url,
      priceCurrency: 'INR',
      price: money(num(p.price)),
      priceValidUntil: validUntil.toISOString().slice(0, 10),
      availability,
      itemCondition: 'https://schema.org/NewCondition',
      seller: SELLER,
      hasMerchantReturnPolicy: RETURN_POLICY,
    };
  }

  const rating = num(p.rating);
  const count = num(p.reviewCount ?? p.reviews ?? p.numReviews);
  if (genuineRatings && count > 0 && rating > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: (Math.round(rating * 10) / 10).toFixed(1),
      reviewCount: Math.round(count),
      bestRating: '5',
      worstRating: '1',
    };
  }

  const props = [];
  if (p.hsnCode) props.push({ '@type': 'PropertyValue', name: 'HSN Code', value: String(p.hsnCode) });
  if (p.gstRate !== null && p.gstRate !== undefined && p.gstRate !== '' && num(p.gstRate) >= 0) {
    props.push({ '@type': 'PropertyValue', name: 'GST Rate', value: `${num(p.gstRate)}%` });
  }
  if (p.unitLabel) props.push({ '@type': 'PropertyValue', name: 'Sold per', value: String(p.unitLabel) });
  if (optionNames.length && opts.length) {
    optionNames.forEach((name, i) => {
      const values = [...new Set(opts.map(v => v[`option${i + 1}`]).filter(Boolean))];
      if (values.length) props.push({ '@type': 'PropertyValue', name: String(name), value: values.join(', ') });
    });
  }
  if (props.length) schema.additionalProperty = props;

  // Google needs offers, review or aggregateRating — without any, emit nothing.
  if (!schema.offers && !schema.aggregateRating) return null;
  return schema;
}

/** Home › Shop › Product breadcrumb. */
export function buildProductBreadcrumb(p, { siteUrl = SITE_URL } = {}) {
  const slug = p.slug || p.id;
  const url = `${siteUrl}/shop/${slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
      { '@type': 'ListItem', position: 2, name: 'Shop', item: `${siteUrl}/shop` },
      { '@type': 'ListItem', position: 3, name: String(p.name), item: url },
    ],
  };
}
