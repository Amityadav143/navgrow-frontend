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
 *   • pages left over from older uploads — every page of a build carries
 *     <meta name="navgrow-build"> and .htaccess sends X-Navgrow-Build; they must
 *     match (a mismatch = an old file is being served, a missing header = the new
 *     .htaccess wasn't uploaded).
 *   • Merchant listings (Google Shopping): each product (or each option of a
 *     ProductGroup) needs an image and an Offer with one price; every "@id" the
 *     markup refers to (#website, #breadcrumb, …) must be defined on the page.
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
/** Products (incl. each option of a ProductGroup) Google Shopping can't list, and why. */
function merchantNotes(nodes) {
  const notes = [];
  const walk = (n) => {
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (!n || typeof n !== 'object') return;
    if (typesOf(n).includes('Product') && n.offers) {
      const o = Array.isArray(n.offers) ? n.offers[0] : n.offers;
      if (typesOf(o).includes('AggregateOffer')) notes.push(`${n.name}: price range (AggregateOffer) — Shopping needs one Offer price per product/option`);
      if (!n.image) notes.push(`${n.name}: no image`);
    }
    Object.values(n).forEach(v => { if (v && typeof v === 'object') walk(v); });
  };
  walk(nodes);
  return notes;
}
/** @id references (e.g. a WebPage's #breadcrumb) that nothing on the page defines. */
function danglingRefs(nodes) {
  const defined = new Set(); const refs = new Set();
  const walk = (n) => {
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (!n || typeof n !== 'object') return;
    const keys = Object.keys(n);
    if (typeof n['@id'] === 'string') (keys.length === 1 ? refs : defined).add(n['@id']);
    Object.values(n).forEach(v => { if (v && typeof v === 'object') walk(v); });
  };
  walk(nodes);
  return [...refs].filter(r => !defined.has(r));
}
/** Star ratings on the business itself are "self-serving" — Google ignores or penalises them. */
const selfServingRatings = (nodes) => nodes.filter(n => n?.aggregateRating
  && typesOf(n).some(t => /LocalBusiness|Organization|ProfessionalService|Store/.test(t)));

async function get(url, ua = GOOGLEBOT) {
  const res = await fetch(url, { redirect: 'manual', headers: { 'User-Agent': ua } });
  return { res, html: await res.text() };
}

async function check(path, { product = false, detail = false, ua = GOOGLEBOT, label = '' } = {}) {
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
  const title = (html.match(/<title>([^<]*)<\/title>/i)?.[1] || '').trim()      // shown as text, not "&amp;"
    .replace(/&(amp|lt|gt|quot|#39|apos);/g, (_, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'" })[e]);
  const h1 = /<h1[\s>]/i.test(html);
  console.log(`  title:        ${title ? title.slice(0, 70) : 'x MISSING'}`);
  console.log(`  description:  ${meta(html, 'description') ? 'ok' : 'x MISSING'}`);
  console.log(`  canonical:    ${can || 'x MISSING'}${canCount > 1 ? `  x ${canCount} canonicals!` : ''}`);
  console.log(`  robots:       ${robots || '(none)'}${robotsCount > 1 ? `  x ${robotsCount} robots tags!` : ''}${xRobots ? `  · X-Robots-Tag: ${xRobots}` : ''}`);
  if ((robots && /noindex/i.test(robots)) || (xRobots && /noindex/i.test(xRobots))) { console.log('  x page is NOINDEX'); ok = false; }
  if (canCount > 1 || robotsCount > 1) ok = false;
  if (!can) { console.log('  x no canonical — this is not the page the build made (upload all of dist/, including the hidden .htaccess)'); ok = false; }
  if (can) {
    const [c, u] = [new URL(can, url), new URL(url)];
    if (c.pathname.replace(/\/+$/, '') !== u.pathname.replace(/\/+$/, '')) { console.log('  x canonical points at another page — Google may index that one instead'); ok = false; }
    else if (c.host !== u.host) console.log(`  (canonical host ${c.host} differs from the tested host — expected when checking a copy of the site)`);
  }
  const build = meta(html, 'navgrow-build');
  const header = res.headers.get('x-navgrow-build');
  if (!header) console.log('  ! no X-Navgrow-Build header — upload the new .htaccess from dist/ (it is a hidden file); if it is there, the server is not reading .htaccess files');
  else if (header === '__NAVGROW_BUILD__') { console.log('  x the server has the unbuilt .htaccess from public/ — upload the one from dist/ (the build writes its id into it)'); ok = false; }
  else if (build && build !== header) { console.log(`  x this page is from an older upload (page build ${build}, site build ${header}) — delete that folder on the server and upload the build again`); ok = false; }
  else console.log(`  build:        ${build || '(none)'}`);
  console.log(`  JSON-LD:      ${nodes.length ? [...new Set(nodes.flatMap(typesOf))].join(', ') : 'x NONE'}`);
  const dangling = danglingRefs(nodes);
  if (dangling.length) { console.log(`  x references with nothing behind them: ${dangling.join(', ')}`); ok = false; }
  if (parseErrors) { console.log(`  x ${parseErrors} JSON-LD block(s) do not parse`); ok = false; }
  const bad = invalidProducts(nodes);
  if (bad.length) { console.log(`  x Product without offers/review/aggregateRating: ${bad.join(', ')}  ← the Search Console error`); ok = false; }
  if (selfServingRatings(nodes).length) console.log('  ! star rating on the business itself (self-serving) — Google ignores it');
  if (product) {
    const p = nodes.find(n => typesOf(n).some(t => t === 'Product' || t === 'ProductGroup'));
    if (!p && /Price on request/i.test(html)) console.log('  ! price on request — no Product markup (Google can show it as a product once it has a price)');
    else if (!p) { console.log('  x no Product structured data on this product page'); ok = false; }
    else if (typesOf(p).includes('ProductGroup')) {
      const vs = Array.isArray(p.hasVariant) ? p.hasVariant : [];
      const prices = vs.map(v => Number(v?.offers?.price)).filter(n => n > 0);
      const urls = new Set(vs.map(v => v?.offers?.url).filter(Boolean));
      console.log(`  Product:      ${p.name} · ProductGroup, ${vs.length} options${prices.length ? ` ₹${Math.min(...prices)}–₹${Math.max(...prices)}` : ''}${p.aggregateRating ? ` · ★${p.aggregateRating.ratingValue} (${p.aggregateRating.reviewCount})` : ''}`);
      if (urls.size !== vs.length) { console.log('  x options need their own URL each (?variant=…)'); ok = false; }
    } else {
      const o = Array.isArray(p.offers) ? p.offers[0] : p.offers;
      console.log(`  Product:      ${p.name} · ${o ? `${o['@type']} ${o.price ?? `${o.lowPrice}–${o.highPrice}`} ${o.priceCurrency || ''}` : 'no offers'}${p.aggregateRating ? ` · ★${p.aggregateRating.ratingValue} (${p.aggregateRating.reviewCount})` : ''}`);
    }
    for (const n of merchantNotes(nodes)) console.log(`  ! Google Shopping: ${n}`);
    if (!h1) { console.log('  x no <h1> — the page body is empty for crawlers'); ok = false; }
  }
  if (detail) {
    // A service page or news post: must be this build's pre-built page (from _p/), not the app shell.
    const main = nodes.flatMap(typesOf).filter(t => /^(Service|BlogPosting|NewsArticle|Article)$/.test(t));
    console.log(`  content:      ${main.length ? [...new Set(main)].join(', ') : 'x no Service / article structured data'}${h1 ? '' : ' · x no <h1>'}`);
    if (!main.length || !h1) { console.log('  x not the pre-built page — upload all of dist/, including the hidden .htaccess and the _p/ folder'); ok = false; }
  }
  console.log(`  internal links: ${links.length ? `${links.length} (${links.slice(0, 6).join(', ')})` : 'x NONE (hurts crawl + sitelinks)'}`);
  if (/\/shop\/?$/.test(new URL(url).pathname) && !links.some(l => /^\/shop\/[^/?#]+/.test(l))) {
    console.log('  ! the shop page links to no product — products can then only be found through the sitemap');
  }
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
  let detailUrls = [];
  try {
    const { res, html: t } = await get(`${BASE}/sitemap.xml`);
    const locs = [...t.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
    console.log(`  HTTP ${res.status}; URLs: ${locs.length}; content-type: ${res.headers.get('content-type')}`);
    if (res.status !== 200 || !locs.length) allOk = false;
    productUrls = locs.filter(u => /\/shop\/[^/]+\/?$/.test(u));
    console.log(`  product pages listed: ${productUrls.length}`);
    // One service page and one news post, checked below like the products.
    detailUrls = [locs.find(u => /\/services\/[^/]+\/?$/.test(u)), locs.find(u => /\/news\/[^/]+\/?$/.test(u))].filter(Boolean);
  } catch (e) { console.log(`  x ${e.message}`); allOk = false; }

  // The sitemap should list the products the shop actually sells (a build that
  // couldn't reach the API lists the built-in catalogue instead).
  try {
    const { res, html: body } = await get(`${BASE}/api/products?size=300&sort=name`);
    const live = res.status === 200 ? (JSON.parse(body).content || []).filter(p => p && p.slug).map(p => p.slug) : null;
    if (live) {
      const listed = new Set(productUrls.map(u => decodeURIComponent(u.replace(/\/+$/, '').split('/shop/')[1] || '')));
      const missing = live.filter(sl => !listed.has(sl));
      const extra = [...listed].filter(sl => !live.includes(sl));
      if (!missing.length && !extra.length) console.log(`  ok the sitemap lists all ${live.length} products of the shop`);
      if (missing.length) console.log(`  ! ${missing.length} live product(s) not in sitemap.xml (e.g. ${missing.slice(0, 3).join(', ')}) — rebuild; the build log should say "Live data from https://navgrow.org/api" (the API sitemap lists them meanwhile)`);
      if (extra.length) console.log(`  ! ${extra.length} sitemap product(s) the shop doesn't sell (e.g. ${extra.slice(0, 3).join(', ')}) — the build couldn't reach the API; rebuild with it reachable`);
    }
  } catch { /* the API is optional for this check */ }

  if (productUrls.length) {
    const sample = productUrls.slice(0, MAX_PRODUCTS).map(u => u.replace(/^https?:\/\/[^/]+/, BASE));
    for (const u of sample) allOk = (await check(u, { product: true })) && allOk;
    allOk = (await check(sample[0], { product: true, ua: INSPECTION, label: 'as Google-InspectionTool — URL Inspection / Rich Results Test' })) && allOk;
  } else {
    console.log('\n  ! no /shop/<product> URLs in sitemap.xml — product pages cannot be discovered from it');
  }
  for (const u of detailUrls) allOk = (await check(u.replace(/^https?:\/\/[^/]+/, BASE), { detail: true })) && allOk;

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
    : 'FAIL: see the x lines above. Most common: the site serves the empty SPA shell or old files\n  instead of the new build. Re-run `npm run build` and upload the ENTIRE dist/ (incl. the hidden\n  .htaccess, the _p/ folder, build-id.txt, app.html, og.php, robots.txt) to public_html, then\n  run this again.'}`);
  process.exit(allOk ? 0 : 1);
})();
