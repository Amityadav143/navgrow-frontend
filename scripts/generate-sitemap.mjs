/**
 * © 2024–2026 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 *
 * generate-sitemap.mjs — builds dist/sitemap.xml: every marketing route, every
 * service page, every product and every news post.
 *
 * Products and posts come from the LIVE API when it is reachable at build time
 * (scripts/live-data.mjs), so the real catalogue — not just the built-in sample
 * catalogue — is listed. Between builds, the API's own sitemap
 * (/api/sitemap-content.xml, listed in robots.txt) covers anything new.
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROUTES, SITE, NEWS_ARTICLES } from '../src/lib/seo-routes.mjs';
import { SERVICES } from '../src/data/servicesData.js';
import { loadLiveData } from './live-data.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');
const today = new Date().toISOString().slice(0, 10);
const day = (v) => {
  const s = String(v || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : today;
};
const escXml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const live = await loadLiveData();
const urls = new Map();
const add = (path, lastmod, changefreq, priority) => {
  const loc = SITE.url + (path === '/' ? '/' : path);
  if (!urls.has(loc)) urls.set(loc, { loc, lastmod, changefreq, priority });
};

// Marketing / store routes.
for (const r of ROUTES) add(r.path, today, r.changefreq, r.priority);

// Service detail pages (they were missing, so Google only found them via links).
for (const sv of SERVICES) if (sv && sv.slug) add(`/services/${sv.slug}`, today, 'monthly', 0.8);

// Products — the live catalogue when reachable, else the built-in one.
if (Array.isArray(live.products)) {
  for (const p of live.products) {
    if (p && p.slug && p.active !== false) add(`/shop/${p.slug}`, day(p.updatedAt || p.priceUpdatedAt), 'weekly', 0.7);
  }
} else {
  try {
    const mod = await import('../src/lib/productData.js');
    for (const p of mod.ALL_PRODUCTS || mod.PRODUCTS || []) {
      if (p && (p.slug || p.id)) add(`/shop/${p.slug || p.id}`, today, 'weekly', 0.7);
    }
  } catch { /* no catalogue — routes only */ }
}

// News — published posts from the database plus the built-in articles.
for (const a of live.news || []) {
  if (a && a.slug) add(`/news/${a.slug}`, day(a.updatedAt || a.publishedAt), 'monthly', 0.6);
}
for (const a of NEWS_ARTICLES) {
  if (a.slug) add(`/news/${a.slug}`, day(a.publishedAt), 'monthly', 0.6);
}

const list = [...urls.values()];
const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  list.map(u =>
    `  <url>\n` +
    `    <loc>${escXml(u.loc)}</loc>\n` +
    `    <lastmod>${u.lastmod}</lastmod>\n` +
    `    <changefreq>${u.changefreq}</changefreq>\n` +
    `    <priority>${Number(u.priority).toFixed(1)}</priority>\n` +
    `  </url>`
  ).join('\n') +
  `\n</urlset>\n`;

writeFileSync(join(DIST, 'sitemap.xml'), xml, 'utf8');
console.log(`[sitemap] Wrote ${list.length} URLs to dist/sitemap.xml (${Array.isArray(live.products) ? 'live catalogue' : 'built-in catalogue'}).`);
