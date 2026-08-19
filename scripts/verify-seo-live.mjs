/**
 * verify-seo-live.mjs — comprehensive live-site SEO & indexing diagnostic.
 *
 * Run this AFTER deploying to see exactly what Google receives. It fetches the
 * live pages as Googlebot and reports, per URL: HTTP status, canonical, robots,
 * title/description, JSON-LD schema types (and whether they parse), crawlable
 * internal links, and whether the page is the prerendered version or the SPA shell.
 * It also checks robots.txt and sitemap.xml.
 *
 * Usage:
 *   npm run verify:seo
 *   node scripts/verify-seo-live.mjs https://navgrow.org
 */
const BASE = (process.argv[2] || 'https://navgrow.org').replace(/\/+$/, '');
const UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const PAGES = ['/', '/about', '/services', '/shop', '/news', '/contact'];

function meta(html, key, attr = 'name') {
  const re = new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]*>`, 'i');
  const t = html.match(re)?.[0];
  return t ? (t.match(/content=["']([^"']*)["']/i)?.[1] ?? null) : null;
}
function canonical(html) {
  const t = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i)?.[0];
  return t ? (t.match(/href=["']([^"']*)["']/i)?.[1] ?? null) : null;
}
function jsonLdTypes(html) {
  const out = [];
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { const o = JSON.parse(m[1]); out.push(o['@type'] || '?'); }
    catch { out.push('PARSE_ERROR'); }
  }
  return out;
}
async function check(path) {
  const url = BASE + path;
  console.log(`\n-------- ${url}`);
  let res, html;
  try { res = await fetch(url, { redirect: 'manual', headers: { 'User-Agent': UA } }); html = await res.text(); }
  catch (e) { console.log(`  x fetch failed: ${e.message}`); return false; }
  let ok = true;
  const status = res.status;
  if (status >= 300 && status < 400) { console.log(`  ! HTTP ${status} -> ${res.headers.get('location')} (crawlers prefer 200)`); ok = false; }
  else if (status !== 200) { console.log(`  x HTTP ${status}`); return false; }
  else { console.log(`  ok HTTP 200`); }
  const rootEmpty = /<div id=["']root["']>\s*<\/div>/.test(html);
  const types = jsonLdTypes(html);
  const links = [...html.matchAll(/<a[^>]+href=["'](\/[^"']*)["']/g)].map(m => m[1]);
  const uniqLinks = [...new Set(links)];
  const can = canonical(html);
  const canCount = (html.match(/rel=["']canonical["']/g) || []).length;
  const robots = meta(html, 'robots');
  const robotsCount = (html.match(/name=["']robots["']/g) || []).length;
  const title = (html.match(/<title>([^<]*)<\/title>/i)?.[1] || '').trim();
  const desc = meta(html, 'description');
  console.log(`  title:        ${title ? title.slice(0, 70) : 'x MISSING'}`);
  console.log(`  description:  ${desc ? 'ok' : 'x MISSING'}`);
  console.log(`  canonical:    ${can || 'x MISSING'}${canCount > 1 ? `  x ${canCount} canonicals!` : ''}`);
  console.log(`  robots:       ${robots || '(none)'}${robotsCount > 1 ? `  x ${robotsCount} robots tags!` : ''}`);
  if (robots && /noindex/i.test(robots)) { console.log('  x page is NOINDEX'); ok = false; }
  console.log(`  JSON-LD:      ${types.length ? types.join(', ') : 'x NONE'}`);
  if (types.includes('PARSE_ERROR')) { console.log('  x a JSON-LD block does not parse'); ok = false; }
  console.log(`  internal links: ${uniqLinks.length ? uniqLinks.length + ' (' + uniqLinks.slice(0, 8).join(', ') + ')' : 'x NONE (hurts crawl + sitelinks)'}`);
  if (canCount > 1 || robotsCount > 1) ok = false;
  if (rootEmpty && types.length <= 3 && uniqLinks.length === 0) { console.log('  x looks like the EMPTY SPA SHELL - prerendered page not served here'); ok = false; }
  return ok;
}
(async () => {
  console.log(`SEO / indexing diagnostic for ${BASE}\nFetching as Googlebot...`);
  let allOk = true;
  for (const p of PAGES) { const r = await check(p); allOk = allOk && r; }
  console.log('\n-------- robots.txt');
  try {
    const r = await fetch(BASE + '/robots.txt', { headers: { 'User-Agent': UA } }); const t = await r.text();
    console.log(`  HTTP ${r.status}; Sitemap line: ${/sitemap:/i.test(t) ? 'ok' : 'x missing'}; Disallow /: ${/disallow:\s*\/\s*$/im.test(t) ? 'x BLOCKS EVERYTHING' : 'ok not blocked'}`);
    if (/disallow:\s*\/\s*$/im.test(t)) allOk = false;
  } catch (e) { console.log('  x ' + e.message); }
  console.log('\n-------- sitemap.xml');
  try {
    const r = await fetch(BASE + '/sitemap.xml', { headers: { 'User-Agent': UA } }); const t = await r.text();
    const n = (t.match(/<loc>/g) || []).length;
    console.log(`  HTTP ${r.status}; URLs: ${n}; content-type: ${r.headers.get('content-type')}`);
    if (r.status !== 200 || n === 0) allOk = false;
  } catch (e) { console.log('  x ' + e.message); }
  console.log('\n' + (allOk
    ? 'PASS: Live site looks correctly indexable (prerendered pages, single canonical/robots,\n  valid schema, crawlable links, reachable sitemap). If GSC still shows few indexed\n  pages, it is almost certainly crawl TIMING (days-weeks) or site authority (sitelinks\n  need an established, well-linked site). Use GSC URL Inspection -> Request Indexing.'
    : 'FAIL: Issues above. Most common: the site serves the empty SPA shell instead of the\n  prerendered dist/. Re-run `npm run build` and upload the ENTIRE dist/ (incl. shop/ +\n  news/ subfolders, .htaccess, og.php) to public_html, then re-run this check.'));
  process.exit(allOk ? 0 : 1);
})();
