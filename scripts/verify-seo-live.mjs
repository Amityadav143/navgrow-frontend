/**
 * verify-seo-live.mjs — checks whether the LIVE site is serving the prerendered
 * SEO HTML (with valid Product structured data) or just the empty SPA shell.
 *
 * This is the single most useful diagnostic when Search Console still reports
 * structured-data errors after a deploy: it tells you definitively whether the
 * problem is the deployment (prerendered files not live / not served) or not.
 *
 * Usage:  node scripts/verify-seo-live.mjs
 *         node scripts/verify-seo-live.mjs https://navgrow.org
 */
const BASE = (process.argv[2] || 'https://navgrow.org').replace(/\/+$/, '');

const URLS = [
  '/',
  '/about',
  '/shop',
  '/shop/industrial-safety-helmet-isi',
  '/shop/steel-toe-safety-boots',
];

function extractJsonLd(html) {
  const out = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try { out.push(JSON.parse(m[1])); } catch { out.push({ __parseError: true }); }
  }
  return out;
}

let anyFail = false;

for (const path of URLS) {
  const url = BASE + path;
  try {
    const res = await fetch(url, { redirect: 'manual', headers: { 'User-Agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)' } });
    const status = res.status;
    const finalRedirect = res.headers.get('location');
    const html = await res.text();

    const hasRoot = /<div id="root">/.test(html);
    const shellOnly = hasRoot && !/application\/ld\+json/.test(html);
    const blocks = extractJsonLd(html);
    const product = blocks.find(b => b['@type'] === 'Product');
    const parseErrors = blocks.some(b => b.__parseError);

    const isProductUrl = path.startsWith('/shop/');
    let verdict;
    if (status >= 300 && status < 400) {
      verdict = `⚠ REDIRECT (${status}) → ${finalRedirect} — crawlers should get 200, not a redirect`;
      anyFail = true;
    } else if (status !== 200) {
      verdict = `✗ HTTP ${status}`;
      anyFail = true;
    } else if (shellOnly) {
      verdict = '✗ SERVING SPA SHELL (no structured data) — prerendered file NOT being served';
      anyFail = true;
    } else if (parseErrors) {
      verdict = '✗ JSON-LD present but has PARSE ERRORS';
      anyFail = true;
    } else if (isProductUrl) {
      if (product && product.offers && product.aggregateRating) {
        verdict = '✓ Product schema OK (offers + aggregateRating present)';
      } else if (product) {
        verdict = `✗ Product schema MISSING ${!product.offers ? 'offers' : ''} ${!product.aggregateRating ? 'aggregateRating' : ''}`.trim();
        anyFail = true;
      } else {
        verdict = '✗ No Product schema found on a product URL';
        anyFail = true;
      }
    } else {
      verdict = `✓ ${blocks.length} JSON-LD block(s) served`;
    }
    console.log(`${verdict}\n    ${url}`);
  } catch (e) {
    console.log(`✗ FETCH FAILED — ${e.message}\n    ${url}`);
    anyFail = true;
  }
}

console.log('\n' + (anyFail
  ? '❌ Some checks failed. If URLs serve the SPA shell or redirect, the prerendered\n   dist/ is not deployed or the server (.htaccess) is not serving it. Re-run\n   `npm run build` and upload the ENTIRE dist/ (including the shop/ subfolders\n   and .htaccess) to public_html.'
  : '✅ Live site is serving prerendered HTML with valid structured data on every checked URL.'));
process.exit(anyFail ? 1 : 0);
