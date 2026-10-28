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
 * Google's rules (Search Central, 2026):
 *   • Product snippets: a Product needs `offers`, `review` or `aggregateRating`.
 *   • Merchant listings: a Product needs `name`, `image` and an `Offer` with one
 *     price > 0 (an AggregateOffer price range is NOT accepted there).
 *   • Products sold in options: a ProductGroup whose `hasVariant` lists one
 *     Product per option, each with its own SKU and Offer, and its own URL that
 *     preselects it (here /shop/<slug>?variant=<SKU>); one canonical — the
 *     product's base URL.
 * So:
 *   • a product with a price → Product + Offer;
 *   • a product sold in options → ProductGroup + one Product/Offer per option;
 *   • star ratings only from GENUINE, approved reviews;
 *   • neither a price nor real reviews → no Product markup at all (null).
 * Every Offer carries the return policy written out in full, as in Google's
 * examples (Google documents no "@id" references for it). The Organization in
 * index.html carries the same policy for the whole shop.
 */

const SITE_URL = 'https://navgrow.org';
export const MAX_VARIANTS_IN_MARKUP = 100;

const seller = (siteUrl) => ({ '@type': 'Organization', '@id': `${siteUrl}/#organization`, name: 'Navgrow Engineering Service Pvt. Ltd.', url: siteUrl });

/** The refund page's policy: report within 7 days of delivery, and Navgrow arranges a reverse pickup. */
export const returnPolicy = () => ({
  '@type': 'MerchantReturnPolicy',
  applicableCountry: 'IN',
  returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
  merchantReturnDays: 7,
  returnMethod: 'https://schema.org/ReturnByMail',
});

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};
const money = (n) => (Math.round(n * 100) / 100).toFixed(2);
const IN_STOCK = 'https://schema.org/InStock';
const OUT_OF_STOCK = 'https://schema.org/OutOfStock';
const NEW = 'https://schema.org/NewCondition';

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
export function liveOptions(p) {
  const vs = Array.isArray(p?.variants) ? p.variants : [];
  return vs.filter(v => v && v.active !== false && num(v.price) > 0);
}

function optionStock(v) {
  const s = num(v?.liveStock ?? v?.stockQty);
  return Number.isFinite(s) ? s : 0;
}

/** Can this option be bought right now (at least its minimum order in stock)? */
function optionAvailable(p, v) {
  const moq = Math.max(1, num(v.minOrderQty) || num(p.minOrderQty) || 1);
  return v.inStock === true || (v.inStock !== false && optionStock(v) >= moq);
}

/** Is anything about this product buyable right now? */
export function productAvailable(p) {
  const opts = liveOptions(p);
  if (opts.length) return opts.some(v => optionAvailable(p, v));
  if (p?.inStock === false) return false;
  if (p?.inStock === true) return true;
  const s = num(p?.stockQty);
  return Number.isFinite(s) ? s > 0 : true;
}

const optionNamesOf = (p) => (Array.isArray(p?.optionNames) && p.optionNames.length ? p.optionNames
  : [p?.option1Name, p?.option2Name, p?.option3Name].filter(Boolean)).map(n => String(n).trim());

// Option names → the variant property Google understands (others become additionalProperty).
const BRAND_RE = /^(brand|make|manufacturer|company)$/i;
const SIZE_RE = /^(size|pack(ing|aging)?( size)?|pack|weight|net weight|diameter|dia|length|width|height|thickness|capacity|volume|gauge|bag size)$/i;
const COLOR_RE = /^(colou?r|shade)$/i;
const MATERIAL_RE = /^material$/i;
const PATTERN_RE = /^(pattern|design)$/i;
const KIND = [[SIZE_RE, 'size'], [COLOR_RE, 'color'], [MATERIAL_RE, 'material'], [PATTERN_RE, 'pattern']];

/** "Brand: Karam" in a product's specifications — text, "Label: value" strings or [{label, value}] rows. */
function specValue(p, re) {
  const toRow = (line) => {
    const t = String(line || '');
    const i = t.indexOf(':');
    return i > 0 ? { label: t.slice(0, i).trim(), value: t.slice(i + 1).trim() } : null;
  };
  const rows = (Array.isArray(p?.specs) ? p.specs.map(r => (r && typeof r === 'object' ? r : toRow(r)))
    : String(p?.specifications || '').split('\n').map(toRow)).filter(Boolean);
  const hit = rows.find(r => r && re.test(String(r.label || '').trim()) && String(r.value || '').trim());
  return hit ? String(hit.value).trim() : '';
}

/** The product's own brand: an explicit brand, a "Brand:" specification, else the seller (private label). */
function brandOf(p) {
  return String(p?.brand || specValue(p, BRAND_RE) || 'Navgrow Engineering').trim();
}

function ratingOf(p, genuineRatings) {
  const rating = num(p.rating);
  const count = num(p.reviewCount ?? p.reviews ?? p.numReviews);
  if (!(genuineRatings && count > 0 && rating > 0)) return null;
  return {
    '@type': 'AggregateRating',
    ratingValue: (Math.round(rating * 10) / 10).toFixed(1),
    reviewCount: Math.round(count),
    bestRating: '5',
    worstRating: '1',
  };
}

function priceValidUntil(now) {
  const d = new Date(now || Date.now());
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function baseProps(p) {
  const props = [];
  if (p.hsnCode) props.push({ '@type': 'PropertyValue', name: 'HSN Code', value: String(p.hsnCode) });
  if (p.gstRate !== null && p.gstRate !== undefined && p.gstRate !== '' && num(p.gstRate) >= 0) {
    props.push({ '@type': 'PropertyValue', name: 'GST Rate', value: `${num(p.gstRate)}%` });
  }
  if (p.unitLabel) props.push({ '@type': 'PropertyValue', name: 'Sold per', value: String(p.unitLabel) });
  return props;
}

/** The link that opens the product with this option chosen (the product page reads ?variant=). */
export const variantRef = (v, i = 0) => String(v?.sku || v?.id || `option-${i + 1}`);
export const variantUrl = (productUrl, v, i = 0) => `${productUrl}?variant=${encodeURIComponent(variantRef(v, i))}`;

/**
 * Product JSON-LD (Product, or ProductGroup for a product sold in options), or
 * null when the product can't carry valid Product markup.
 * @param p        product as the API / catalogue returns it
 * @param options  { siteUrl, genuineRatings, now } — genuineRatings=false for
 *                 data whose rating/reviewCount aren't backed by approved
 *                 reviews (the built-in fallback catalogue).
 */
export function buildProductSchema(p, { siteUrl = SITE_URL, genuineRatings = true, now } = {}) {
  if (!p || !p.name) return null;
  const slug = p.slug || p.id;
  const url = `${siteUrl}/shop/${slug}`;
  const image = absoluteUrl(p.image || p.imageUrl, siteUrl);
  const description = plainText(p.summary || p.description || p.desc || p.name, 5000);
  const category = p.category || p.cat;
  const aggregateRating = ratingOf(p, genuineRatings);
  const validUntil = priceValidUntil(now);
  const opts = liveOptions(p);

  if (opts.length) {
    const names = optionNamesOf(p);
    const shown = opts.slice(0, MAX_VARIANTS_IN_MARKUP);
    const distinct = names.map((_, i) => new Set(shown.map(v => String(v[`option${i + 1}`] || '').trim().toLowerCase()).filter(Boolean)).size);
    const kinds = names.map(n => (BRAND_RE.test(n) ? 'brand' : (KIND.find(([re]) => re.test(n)) || [])[1] || null));
    // One schema.org property per kind: the first "size"-like option is the size, the rest stay additionalProperty.
    const used = new Set();
    const kindOf = kinds.map(k => (k && !used.has(k) ? (used.add(k), k) : null));
    // variesBy lists only what really differs between the options (e.g. not a pack
    // size every option shares) — and only the properties Google supports there.
    const variesBy = [...new Set(kindOf.filter((k, i) => k && k !== 'brand' && distinct[i] > 1))].map(k => `https://schema.org/${k}`);
    const brandAxis = kindOf.indexOf('brand');
    const oneBrand = brandAxis >= 0 && distinct[brandAxis] === 1 ? String(shown[0][`option${brandAxis + 1}`] || '').trim() : '';
    const groupId = String(p.sku || slug);
    const group = {
      '@context': 'https://schema.org',
      '@type': 'ProductGroup',
      '@id': `${url}#product`,
      name: String(p.name),
      url,
      description,
      productGroupID: groupId,
      ...(variesBy.length ? { variesBy } : {}),
    };
    if (image) group.image = image;
    if (category) group.category = String(category);
    // One brand only when the product IS one brand — not when buyers choose between brands.
    if (!used.has('brand')) group.brand = { '@type': 'Brand', name: brandOf(p) };
    else if (oneBrand) group.brand = { '@type': 'Brand', name: oneBrand };
    if (aggregateRating) group.aggregateRating = aggregateRating;
    const props = baseProps(p);
    if (props.length) group.additionalProperty = props;
    group.hasVariant = shown.map((v, idx) => {
      const values = names.map((_, i) => String(v[`option${i + 1}`] || '').trim());
      const label = values.filter(Boolean).join(' · ');
      const variant = {
        '@type': 'Product',
        name: label ? `${p.name} — ${label}` : String(p.name),
        sku: variantRef(v, idx),
        inProductGroupWithID: groupId,
      };
      const vImage = absoluteUrl(v.imageUrl, siteUrl) || image;
      if (vImage) variant.image = vImage;
      const other = [];
      values.forEach((val, i) => {
        if (!val) return;
        const k = kindOf[i];
        if (k === 'brand') variant.brand = { '@type': 'Brand', name: val };
        else if (k) variant[k] = val;
        else other.push({ '@type': 'PropertyValue', name: names[i], value: val });
      });
      if (other.length) variant.additionalProperty = other;
      variant.offers = {
        '@type': 'Offer',
        url: variantUrl(url, v, idx),
        priceCurrency: 'INR',
        price: money(num(v.price)),
        priceValidUntil: validUntil,
        availability: optionAvailable(p, v) ? IN_STOCK : OUT_OF_STOCK,
        itemCondition: NEW,
        seller: seller(siteUrl),
        hasMerchantReturnPolicy: returnPolicy(),
      };
      return variant;
    });
    return group;
  }

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: String(p.name),
    url,
    description,
    sku: String(p.sku || slug || ''),
    brand: { '@type': 'Brand', name: brandOf(p) },
  };
  if (image) schema.image = image;
  if (category) schema.category = String(category);
  if (num(p.price) > 0) {
    schema.offers = {
      '@type': 'Offer',
      url,
      priceCurrency: 'INR',
      price: money(num(p.price)),
      priceValidUntil: validUntil,
      availability: productAvailable(p) ? IN_STOCK : OUT_OF_STOCK,
      itemCondition: NEW,
      seller: seller(siteUrl),
      hasMerchantReturnPolicy: returnPolicy(),
    };
  }
  if (aggregateRating) schema.aggregateRating = aggregateRating;
  const props = baseProps(p);
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

/**
 * What stops a product from appearing in Google's product results, in plain
 * words (for the admin list). [] when nothing does.
 */
export function googleListingProblems(p) {
  const out = [];
  const opts = liveOptions(p);
  if (!opts.length && !(num(p?.price) > 0)) out.push('No price — Google can\'t show it as a product');
  if (!String(p?.imageUrl || p?.image || '').trim()) out.push('No photo — needed for Google Shopping');
  return out;
}
