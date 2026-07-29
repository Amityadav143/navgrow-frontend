/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 *
 * generate-sitemap.mjs — builds dist/sitemap.xml from the same route config the
 * prerenderer uses, PLUS a URL for every product in the static catalogue so
 * individual product pages are discoverable by search engines.
 *
 * Runs after build. If the backend later has many DB-only products/news, the
 * sitemap can be regenerated server-side; this static build covers the catalogue
 * shipped with the app and every marketing route.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROUTES, SITE } from '../src/lib/seo-routes.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');
const today = new Date().toISOString().slice(0, 10);

// Pull product slugs out of the static catalogue without importing JSX/TS.
function productSlugs() {
  try {
    const src = readFileSync(join(__dirname, '..', 'src', 'lib', 'productData.js'), 'utf8');
    const slugs = [...src.matchAll(/slug:\s*'([^']+)'/g)].map(m => m[1]);
    return [...new Set(slugs)];
  } catch {
    return [];
  }
}

const urls = [];

// Static marketing/store routes from the shared config.
for (const r of ROUTES) {
  urls.push({
    loc: SITE.url + (r.path === '/' ? '/' : r.path),
    lastmod: today,
    changefreq: r.changefreq,
    priority: r.priority,
  });
}

// One entry per product detail page.
for (const slug of productSlugs()) {
  urls.push({
    loc: `${SITE.url}/shop/${slug}`,
    lastmod: today,
    changefreq: 'weekly',
    priority: 0.7,
  });
}

const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u =>
    `  <url>\n` +
    `    <loc>${u.loc}</loc>\n` +
    `    <lastmod>${u.lastmod}</lastmod>\n` +
    `    <changefreq>${u.changefreq}</changefreq>\n` +
    `    <priority>${u.priority.toFixed(1)}</priority>\n` +
    `  </url>`
  ).join('\n') +
  `\n</urlset>\n`;

writeFileSync(join(DIST, 'sitemap.xml'), xml, 'utf8');
console.log(`[sitemap] Wrote ${urls.length} URLs to dist/sitemap.xml`);
