/**
 * verify-seo-live.mjs — live-site SEO & indexing diagnostic.
 *
 * Run this AFTER deploying to see exactly what Google receives. It fetches the
 * live pages as Googlebot and reports, per URL: HTTP status, canonical, robots,
 * title/description, JSON-LD (and whether it parses), crawlable links, and
 * whether the page is the prerendered/rendered version or the empty SPA shell.
 *
 * It also checks the two Search Console problems directly:
 *   • "Either 'offers', 'review' or 'aggregateRating' should be specified" —
 *     every Product anywhere in a page's JSON-LD (including ones nested in the
 *     business's OfferCatalog) must have one of them; checked on the main pages
 *     and on product pages taken from the sitemap (also as Google-InspectionTool,
 *     the crawler behind URL Inspection and the Rich Results Test);
 *   • pages not indexed — robots.txt must let Googlebot load the product data and
 *     photos (/api/products, /api/uploads/), a missing product must answer 404
 *     (not a "soft 404"), each page needs exactly one canonical pointing at itself.
 *
 * Usage:
 *   npm run verify:seo
 *   node scripts/verify-seo-live.mjs https://navgrow.org
 *   VERIFY_PRODUCTS=20 node scripts/verify-seo-live.mjs     # check more product pages (default 6)
 */
const BASE = (process.argv[2] || 'https://navgrow.org').replace(/\/+$/, '');
const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const INSPECTION = 'Mozilla/5.0 (compatible; Google-InspectionTool/1.0;)';
const PAGES = ['/', '/about', '/services', '/shop', '/news', '/contact'];
const MAX_PRODUCTS = Math.max(1, Number(process.env.VERIFY_PRODUCTS) || 6);

function meta(html, key, attr = 'name') {
  const re = new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]*>`, 'i');
  const t = html.match(re)?.[0];
  return t ? (t.match(/content=["']([^"']*)["']/i)?.[1] ?? null) : null;
}
function canonical(html) {
  const t = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i)?.[0];
  return t ? (t.match(/href=["']([^"']*)["']/i)?.[1] ?? null) : null;
}
/** Every JSON-LD block, parsed; arrays and @graph flattened. */
function jsonLd(html) {
  const nodes = [];
  let parseErrors = 0;
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const o = JSON.parse(m[1]);
      for (const n of (Array.isArray(o) ? o : [o])) nodes.push(...(Array.isArray(n?.['@graph']) ? n['@graph'] : [n]));
    } catch { parseErrors++; }
  }
  return { nodes, parseErrors };
}
const typesOf = (n) => (Array.isArray(n?.['@type']) ? n['@type'] : [n?.['@type']]).filter(Boolean);
/** Products (at any depth) without offers / review / aggregateRating — Google's "Product snippets" error. */
function invalidProducts(nodes) {
  const bad = [];
  const walk = (n) => {
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (!n || typeof n !== 'object') return;
    if (typesOf(n).includes('Product') && !n.offers && !n.review && !n.aggregateRating) bad.push(n.name || n['@id'] || 'unnamed Product');
    Object.values(n).forEach(v => { if (v && typeof v === 'object') walk(v); });
  };
  walk(nodes);
  return bad;
}
/** Star ratings on the business itself are "self-serving" — Google ignores or penalises them. */
const selfServingRatings = (nodes) => nodes.filter(n => n?.aggregateRating
  && typesOf(n).some(t => /LocalBusiness|Organization|ProfessionalService|Store/.test(t)));

async function get(url, ua = GOOGLEBOT) {
  const res = await fetch(url, { redirect: 'manual', headers: { 'User-Agent': ua } });
  return { res, html: await res.text() };
}

async function check(path, { product = false, ua = GOOGLEBOT, label = '' } = {}) {
  const url = /^https?:/.test(path) ? path : BASE + path;
  console.log(`\n-------- ${url}${label ? `  (${label})` : ''}`);
  let res, html;
  try { ({ res, html } = await get(url, ua)); } catch (e) { console.log(`  x fetch failed: ${e.message}`); return false; }
  let ok = true;
  const status = res.status;
  if (status >= 300 && status < 400) { console.log(`  ! HTTP ${status} -> ${res.headers.get('location')} (crawlers prefer 200)`); return false; }
  if (status !== 200) { console.log(`  x HTTP ${status}`); return false; }
  console.log('  ok HTTP 200');
  const rootEmpty = /<div id=["']root["']>\s*<\/div>/.test(html);
  const { nodes, parseErrors } = jsonLd(html);
  const links = [...new Set([...html.matchAll(/<a[^>]+href=["'](\/[^"']*)["']/g)].map(m => m[1]))];
  const can = canonical(html);
  const canCount = (html.match(/rel=["']canonical["']/g) || []).length;
  const robots = meta(html, 'robots');
  const robotsCount = (html.match(/name=["']robots["']/g) || []).length;
  const xRobots = res.headers.get('x-robots-tag');
  const title = (html.match(/<title>([^<]*)<\/title>/i)?.[1] || '').trim();
  const h1 = /<h1[\s>]/i.test(html);
  console.log(`  title:        ${title ? title.slice(0, 70) : 'x MISSING'}`);
  console.log(`  description:  ${meta(html, 'description') ? 'ok' : 'x MISSING'}`);
  console.log(`  canonical:    ${can || 'x MISSING'}${canCount > 1 ? `  x ${canCount} canonicals!` : ''}`);
  console.log(`  robots:       ${robots || '(none)'}${robotsCount > 1 ? `  x ${robotsCount} robots tags!` : ''}${xRobots ? `  · X-Robots-Tag: ${xRobots}` : ''}`);
  if ((robots && /noindex/i.test(robots)) || (xRobots && /noindex/i.test(xRobots))) { console.log('  x page is NOINDEX'); ok = false; }
  if (canCount > 1 || robotsCount > 1) ok = false;
  if (can) {
    const [c, u] = [new URL(can, url), new URL(url)];
    if (c.pathname.replace(/\/+$/, '') !== u.pathname.replace(/\/+$/, '')) { console.log('  x canonical points at another page — Google may index that one instead'); ok = false; }
    else if (c.host !== u.host) console.log(`  (canonical host ${c.host} differs from the tested host — expected when checking a copy of the site)`);
  }
  console.log(`  JSON-LD:      ${nodes.length ? [...new Set(nodes.flatMap(typesOf))].join(', ') : 'x NONE'}`);
  if (parseErrors) { console.log(`  x ${parseErrors} JSON-LD block(s) do not parse`); ok = false; }
  const bad = invalidProducts(nodes);
  if (bad.length) { console.log(`  x Product without offers/review/aggregateRating: ${bad.join(', ')}  ← the Search Console error`); ok = false; }
  if (selfServingRatings(nodes).length) console.log('  ! star rating on the business itself (self-serving) — Google ignores it');
  if (product) {
    const p = nodes.find(n => typesOf(n).includes('Product'));
    if (!p) { console.log('  x no Product structured data on this product page'); ok = false; }
    else {
      const o = Array.isArray(p.offers) ? p.offers[0] : p.offers;
      console.log(`  Product:      ${p.name} · ${o ? `${o['@type']} ${o.price ?? `${o.lowPrice}–${o.highPrice}`} ${o.priceCurrency || ''}` : 'no offers'}${p.aggregateRating ? ` · ★${p.aggregateRating.ratingValue} (${p.aggregateRating.reviewCount})` : ''}`);
    }
    if (!h1) { console.log('  x no <h1> — the page body is empty for crawlers'); ok = false; }
  }
  console.log(`  internal links: ${links.length ? `${links.length} (${links.slice(0, 6).join(', ')})` : 'x NONE (hurts crawl + sitelinks)'}`);
  if (rootEmpty && nodes.length <= 3 && links.length === 0) { console.log('  x looks like the EMPTY SPA SHELL — the rendered page is not served here'); ok = false; }
  return ok;
}

(async () => {
  console.log(`SEO / indexing diagnostic for ${BASE}\nFetching as Googlebot...`);
  let allOk = true;
  for (const p of PAGES) allOk = (await check(p)) && allOk;

  console.log('\n-------- robots.txt');
  try {
    const { res, html: t } = await get(`${BASE}/robots.txt`);
    const allows = (p) => new RegExp(`^\\s*allow:\\s*${p.replace(/[/.]/g, '\\$&')}`, 'im').test(t);
    const blocksApi = /^\s*disallow:\s*\/api\/?\s*$/im.test(t);
    console.log(`  HTTP ${res.status}; Sitemap line: ${/sitemap:/i.test(t) ? 'ok' : 'x missing'}; Disallow /: ${/^\s*disallow:\s*\/\s*$/im.test(t) ? 'x BLOCKS EVERYTHING' : 'ok not blocked'}`);
    if (/^\s*disallow:\s*\/\s*$/im.test(t)) allOk = false;
    if (blocksApi && !(allows('/api/products') && allows('/api/uploads/'))) {
      console.log('  x /api/ is blocked without "Allow: /api/products" and "Allow: /api/uploads/" — Googlebot can\'t load product data or photos to render pages');
      allOk = false;
    } else console.log('  ok product data and photos can be crawled');
  } catch (e) { console.log(`  x ${e.message}`); allOk = false; }

  console.log('\n-------- sitemap.xml');
  let productUrls = [];
  try {
    const { res, html: t } = await get(`${BASE}/sitemap.xml`);
    const locs = [...t.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
    console.log(`  HTTP ${res.status}; URLs: ${locs.length}; content-type: ${res.headers.get('content-type')}`);
    if (res.status !== 200 || !locs.length) allOk = false;
    productUrls = locs.filter(u => /\/shop\/[^/]+\/?$/.test(u));
    console.log(`  product pages listed: ${productUrls.length}`);
  } catch (e) { console.log(`  x ${e.message}`); allOk = false; }

  if (productUrls.length) {
    const sample = productUrls.slice(0, MAX_PRODUCTS).map(u => u.replace(/^https?:\/\/[^/]+/, BASE));
    for (const u of sample) allOk = (await check(u, { product: true })) && allOk;
    allOk = (await check(sample[0], { product: true, ua: INSPECTION, label: 'as Google-InspectionTool — URL Inspection / Rich Results Test' })) && allOk;
  } else {
    console.log('\n  ! no /shop/<product> URLs in sitemap.xml — product pages cannot be discovered from it');
  }

  console.log('\n-------- a product that does not exist');
  try {
    const { res } = await get(`${BASE}/shop/verify-seo-no-such-product-${Date.now()}`);
    if (res.status === 404) console.log('  ok HTTP 404 (no "soft 404")');
    else console.log(`  ! HTTP ${res.status} — a missing product should answer 404, or Google reports "soft 404" (needs og.php + .htaccess deployed)`);
  } catch (e) { console.log(`  x ${e.message}`); }

  console.log('\n-------- API responses');
  try {
    const { res } = await get(`${BASE}/api/products?size=1`);
    const xr = res.headers.get('x-robots-tag') || '';
    console.log(/noindex/i.test(xr) ? '  ok API JSON is marked X-Robots-Tag: noindex (never indexed as a page)'
      : `  ! HTTP ${res.status}, no "X-Robots-Tag: noindex" on API JSON (deploy the latest backend)`);
  } catch (e) { console.log(`  ! ${e.message}`); }

  console.log(`\n${allOk
    ? 'PASS: the live site looks correctly indexable — rendered pages, one canonical each, valid\n  Product structured data, crawlable product data, a reachable sitemap. Search Console\n  updates after Google re-crawls (days to weeks): use URL Inspection → Request Indexing\n  and "Validate fix" on the Product snippets / Page indexing reports.'
    : 'FAIL: see the x lines above. Most common: the site serves the empty SPA shell instead of the\n  built dist/. Re-run `npm run build` and upload the ENTIRE dist/ (incl. shop/ + news/\n  folders, .htaccess, app.html, og.php, robots.txt) to public_html, then run this again.'}`);
  process.exit(allOk ? 0 : 1);
})();
