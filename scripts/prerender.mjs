/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 *
 * prerender.mjs — post-build SEO prerendering for the Vite SPA.
 *
 * A client-only SPA ships an empty <div id="root"> to crawlers, so only the
 * shell is indexable — the reported "only 2 pages indexed" symptom. This script
 * runs AFTER `vite build` and, for every route in seo-routes.mjs, writes a static
 * HTML file (e.g. dist/about/index.html) that is a copy of the built index.html
 * but with:
 *   · a real, route-specific <title> and meta description/keywords
 *   · canonical + Open Graph + Twitter tags for that URL
 *   · JSON-LD (Organization, and WebPage/Breadcrumb) in the head
 *   · a <noscript> block with the page's heading and description as real text,
 *     so even a non-JS crawl sees meaningful content for the route
 *
 * The React app still hydrates and takes over on load, so users get the full SPA;
 * crawlers get indexable HTML. No headless browser required, so it's fast and
 * reliable in CI.
 *
 * Usage: `node scripts/prerender.mjs` (wired into the build script).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROUTES, SITE, siteNavigationSchema, NEWS_ARTICLES, articleSchema, articleBreadcrumb, faqSchema } from '../src/lib/seo-routes.mjs';
import { buildProductSchema, buildProductBreadcrumb, plainText, liveOptions, variantRef } from '../src/lib/productSchema.js';
import { buildServiceSchemas, serviceTitle, serviceDescription } from '../src/lib/serviceSchema.js';
import { SERVICES } from '../src/data/servicesData.js';
import { loadLiveData, normalizeProduct } from './live-data.mjs';
import { SEO_CONTENT, renderSeoContent } from '../src/lib/seo-content.mjs';
import { readFileSync as _rf } from 'node:fs';

// ── Load listing data up-front for ItemList schema on /shop, /news, /services ──
// ItemList/CollectionPage schema helps Google understand these collection pages
// and can surface list/carousel rich results, improving reach for the catalogue.
let _PRODUCTS_FOR_LIST = [];
try {
  const mod = await import('../src/lib/productData.js');
  _PRODUCTS_FOR_LIST = mod.ALL_PRODUCTS || mod.PRODUCTS || mod.default || [];
} catch { /* listing schema is best-effort */ }

// Services are defined in the ServicesPage component; parse their id + title so
// we can enumerate them without importing the React page (which pulls in JSX).
let _SERVICES_FOR_LIST = [];
try {
  const src = _rf(new URL('../src/pages/ServicesPage.jsx', import.meta.url), 'utf8');
  // Match { id: 'slug', ... title: 'Name' ... } blocks (title follows id nearby).
  const re = /id:\s*'([a-z0-9-]+)'[\s\S]{0,200}?title:\s*'([^']+)'/g;
  let m;
  const seen = new Set();
  while ((m = re.exec(src)) !== null) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    _SERVICES_FOR_LIST.push({ id: m[1], title: m[2] });
  }
} catch { /* best-effort */ }

// ── Live catalogue & news (from the API, when reachable at build time) ──────
const LIVE = await loadLiveData();
const LIVE_PRODUCTS = Array.isArray(LIVE.products)
  ? LIVE.products.filter(p => p && p.slug && p.active !== false) : null;
const LIVE_NEWS = Array.isArray(LIVE.news) ? LIVE.news.filter(a => a && a.slug) : null;
console.log(LIVE_PRODUCTS
  ? `[prerender] Live data from ${LIVE.source}: ${LIVE_PRODUCTS.length} products, ${LIVE_NEWS ? LIVE_NEWS.length : 0} news posts.`
  : `[prerender] Live API not reachable (${LIVE.source}) — using the built-in catalogue. DB-only pages are still served live by og.php.`);

// News: published posts from the database, plus the built-in articles not in it.
const ALL_ARTICLES = (() => {
  const bySlug = new Map();
  for (const a of NEWS_ARTICLES) if (a.slug) bySlug.set(a.slug, { ...a });
  for (const a of LIVE_NEWS || []) {
    bySlug.set(a.slug, {
      slug: a.slug,
      title: a.title,
      category: a.category || 'News',
      publishedAt: String(a.publishedAt || a.createdAt || '').slice(0, 10),
      updatedAt: String(a.updatedAt || a.publishedAt || '').slice(0, 10),
      image: a.imageUrl || '',
      excerpt: a.excerpt || plainText(a.content, 300),
      content: a.content || '',
      authorName: a.authorName || '',
    });
  }
  return [...bySlug.values()];
})();

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');
// Local images live in dist/ after the Vite build (public/ is copied there);
// fall back to the source public/ folder just in case.
const PUBLIC_DIR = existsSync(join(DIST, 'favicon.png')) ? DIST : join(__dirname, '..', 'public');
const TEMPLATE_PATH = join(DIST, 'index.html');

// ── One folder of pages per build ───────────────────────────────────────────
// Product, news and service pages are written to dist/_p/<build>/… and
// .htaccess (stamped below with this build's id) serves ONLY that folder.
// Uploading a build never deletes the files of older uploads; those old pages
// — with the old markup Google kept reporting — used to go on being served.
// Every page also carries <meta name="navgrow-build">, and .htaccess sends the
// same id as an X-Navgrow-Build header, so `npm run verify:seo` can tell a page
// from this build from a leftover one.
const BUILD_ID = String(process.env.NAVGROW_BUILD_ID || new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14))
  .replace(/[^0-9A-Za-z_-]/g, '') || 'build';
const PAGES_ROOT = join(DIST, '_p', BUILD_ID);
const BUILD_META = `<meta name="navgrow-build" content="${BUILD_ID}"/>`;

// News posts and service pages are ALSO written to their old address
// (dist/news/<slug>/, dist/services/<slug>/). The new .htaccess never serves
// these copies. They keep those pages working if the server still has an older
// .htaccess — it's a hidden file, easily left out of an upload — where crawlers
// would otherwise get the empty app (services) or a 404 (articles that exist
// only in the code). Products need no copy: there og.php serves them to
// crawlers from the live catalogue.
function writeFallbackCopy(kind, slug, html) {
  const dir = join(DIST, kind, String(slug));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html, 'utf8');
}

if (!existsSync(TEMPLATE_PATH)) {
  console.error('[prerender] dist/index.html not found — run `vite build` first.');
  process.exit(1);
}
const template = readFileSync(TEMPLATE_PATH, 'utf8');
// dist/index.html is overwritten with the prerendered HOMEPAGE below. Running
// this script a second time without a fresh `vite build` would use that page as
// the template and stamp the homepage's tags onto every page — refuse instead.
if (template.includes('id="prerendered-seo-content"')) {
  console.error('[prerender] dist/index.html is already prerendered — run `vite build` (or `npm run build`) first.');
  process.exit(1);
}

const esc = (s) => String(s || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// Social platforms (WhatsApp, Facebook, LinkedIn, X) render a large link preview
// only when og:image is a reliably-fetchable, correctly-sized image (ideally
// 1200x630). Product photos are Unsplash URLs; we normalise them to a cropped
// 1200x630 rendition so they always come back at the right ratio and size, and
// we emit og:image:width/height/alt so platforms know to show the big card.
// Returns { url, width, height } — falls back to the branded share image.
const OG_W = 1200, OG_H = 630;
// Read intrinsic dimensions of a local image (PNG/JPEG/GIF/WebP) from the public
// folder — dependency-free, by parsing header bytes. Returns {w,h} or null.
// This lets us declare ACCURATE og:image:width/height (a mismatch between the
// declared size and the real image makes some platforms drop the preview and
// fall back to a cached logo).
function localImageSize(publicPath) {
  try {
    const rel = publicPath.replace(/^\//, '');
    const file = join(PUBLIC_DIR, rel);
    if (!existsSync(file)) return null;
    const b = readFileSync(file);
    // PNG
    if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50) {
      return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
    }
    // GIF
    if (b.length > 10 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) {
      return { w: b.readUInt16LE(6), h: b.readUInt16LE(8) };
    }
    // JPEG — scan for Start-Of-Frame marker
    if (b.length > 4 && b[0] === 0xFF && b[1] === 0xD8) {
      let i = 2;
      while (i < b.length) {
        if (b[i] !== 0xFF) { i++; continue; }
        const marker = b[i + 1];
        // SOF0..SOF15 (except DHT=C4, DNL=C8, DRI=CC) carry dimensions
        if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
          return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
        }
        const len = b.readUInt16BE(i + 2);
        i += 2 + len;
      }
    }
    // WebP (VP8X)
    if (b.length > 30 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
      const fmt = b.toString('ascii', 12, 16);
      if (fmt === 'VP8X') return { w: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), h: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
    }
  } catch { /* ignore */ }
  return null;
}

function socialImage(rawImage, altText) {
  let url = rawImage;
  let width = OG_W, height = OG_H, sizeKnown = true;
  if (url && /images\.unsplash\.com/.test(url)) {
    // Strip existing sizing params and request an explicit social crop → 1200x630.
    url = url.split('?')[0] +
      `?ixlib=rb-4.0.3&auto=format&fit=crop&w=${OG_W}&h=${OG_H}&q=80`;
  } else if (url && url.startsWith('/')) {
    // Local image on our domain — declare its ACTUAL size (not an assumed 1200x630).
    const size = localImageSize(url);
    if (size && (size.w < 300 || size.h < 200)) {
      // Too small for a good social card — platforms may drop it. Use the
      // branded 1200x630 share image instead so the preview always looks right.
      url = `${SITE.url}/og-share.jpg`;
      width = OG_W; height = OG_H;
    } else {
      url = `${SITE.url}${url}`;
      if (size) { width = size.w; height = size.h; }
      else { sizeKnown = false; }
    }
  } else if (!url || !/^https?:\/\//.test(url)) {
    // Missing/unknown → branded 1200x630 share image.
    url = `${SITE.url}/og-share.jpg`;
  } else {
    // Absolute external (non-Unsplash) URL — size unknown, don't assert it.
    sizeKnown = false;
  }
  return { url, width, height, sizeKnown, alt: altText || SITE.name };
}

// Render the full set of OG/Twitter image tags. Dimensions are emitted only when
// known and correct, so we never declare a size that mismatches the real image.
function ogImageTags(image, altText) {
  const s = socialImage(image, altText);
  const dims = s.sizeKnown
    ? `\n    <meta property="og:image:width" content="${s.width}"/>\n    <meta property="og:image:height" content="${s.height}"/>`
    : '';
  return `
    <meta property="og:image" content="${esc(s.url)}"/>
    <meta property="og:image:secure_url" content="${esc(s.url)}"/>${dims}
    <meta property="og:image:alt" content="${esc(s.alt)}"/>
    <meta name="twitter:image" content="${esc(s.url)}"/>
    <meta name="twitter:image:alt" content="${esc(s.alt)}"/>`;
}

// Build an ItemList (within a CollectionPage) enumerating the items on a listing
// page, so search engines see the collection's members with stable URLs.
function listingSchema(route) {
  const url = SITE.url + route.path;
  let name, items;
  if (route.path === '/shop') {
    name = 'Navgrow Engineering Shop';
    items = PRODUCT_PAGES.map(p => ({ name: p.name, path: `/shop/${p.slug || p.id}` }));
  } else if (route.path === '/news') {
    name = 'Navgrow News & Insights';
    items = ALL_ARTICLES
      .filter(a => a.slug)
      .map(a => ({ name: a.title, path: `/news/${a.slug}` }));
  } else if (route.path === '/services') {
    name = 'Navgrow Engineering & Sustainability Services';
    items = (SERVICES.length ? SERVICES.map(s => ({ name: s.title, path: `/services/${s.slug}` }))
      : _SERVICES_FOR_LIST.map(s => ({ name: s.title, path: `/services/${s.id}` })));
  } else {
    return null;
  }
  if (!items.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${url}#collection`,
    name,
    url,
    isPartOf: { '@id': `${SITE.url}/#website` },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items.map((it, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: it.name,
        url: `${SITE.url}${it.path}`,
      })),
    },
  };
}

function headFor(route) {
  const url = SITE.url + (route.path === '/' ? '/' : route.path);
  const fullTitle = route.path === '/'
    ? `${SITE.name} | ${route.title}`
    : `${route.title} | ${SITE.shortName}`;
  const img = '/og-share.jpg';

  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    name: fullTitle,
    description: route.description,
    url,
    isPartOf: { '@id': `${SITE.url}/#website` },
    about: { '@id': `${SITE.url}/#organization` },
    publisher: { '@id': `${SITE.url}/#organization` },
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
      ...(route.path === '/' ? [] : [{
        '@type': 'ListItem', position: 2,
        name: route.title.split(' — ')[0].split(' | ')[0],
        item: url,
      }]),
    ],
  };

  return `
    <title>${esc(fullTitle)}</title>
    <meta name="description" content="${esc(route.description)}" />
    <meta name="keywords" content="${esc(route.keywords)}" />
    <link rel="canonical" href="${esc(url)}" />
    <link rel="alternate" hreflang="en-in" href="${esc(url)}" />
    <link rel="alternate" hreflang="en" href="${esc(url)}" />
    <link rel="alternate" hreflang="x-default" href="${esc(url)}" />
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${esc(SITE.name)}" />
    <meta property="og:locale" content="${SITE.locale}" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:title" content="${esc(fullTitle)}" />
    <meta property="og:description" content="${esc(route.description)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(fullTitle)}" />
    <meta name="twitter:description" content="${esc(route.description)}" />${ogImageTags(img, fullTitle)}
    <script type="application/ld+json">${JSON.stringify(webPage)}</script>
    <script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>${route.path === '/' ? `
    <script type="application/ld+json">${JSON.stringify(siteNavigationSchema())}</script>
    <script type="application/ld+json" id="page-jsonld">${JSON.stringify(faqSchema())}</script>` : ''}${(() => {
      const ls = listingSchema(route);
      return ls ? `\n    <script type="application/ld+json">${JSON.stringify(ls)}</script>` : '';
    })()}`;
}

// A real-text fallback so a non-JS crawl still sees the page's purpose.
// A compact, crawlable navigation block included in every prerendered page's
// noscript. Static <a href> links in the initial HTML help search engines
// understand site structure and are a key input to Google sitelinks — which the
// JS-rendered SPA nav alone does not provide to a non-executing crawler.
function crawlableNav() {
  const links = [
    ['/', 'Home'], ['/about', 'About Us'], ['/services', 'Engineering & Sustainability Services'],
    ['/projects', 'Projects'], ['/shop', 'B2B Engineering Shop'], ['/news', 'News & Insights'],
    ['/careers', 'Careers'], ['/quote-calculator', 'Get a Quote'], ['/contact', 'Contact'],
  ];
  const items = links.map(([href, label]) =>
    `<li><a href="${href}">${esc(label)}</a></li>`).join('');
  return `<nav aria-label="Primary"><ul>${items}</ul></nav>`;
}

// A persistent, crawlable footer of internal links injected AFTER #root. The SPA
// only manages #root, so this survives hydration and is seen by search engines
// that render JS — giving Google a reliable static map of the site's main
// sections (a strong input to sitelinks) even though the app nav is JS-driven.
// It is visually minimal and placed at the very bottom so it doesn't affect UX.
function crawlableFooter() {
  const links = [
    ['/', 'Home'], ['/about', 'About Navgrow'], ['/services', 'Services'],
    ['/projects', 'Projects'], ['/shop', 'Shop'], ['/news', 'News'],
    ['/careers', 'Careers'], ['/quote-calculator', 'Get a Quote'], ['/contact', 'Contact'],
  ];
  const items = links.map(([href, label]) =>
    `<a href="${href}">${esc(label)}</a>`).join(' · ');
  return `\n  <footer id="site-crawl-links" style="border-top:1px solid #eee;padding:16px;text-align:center;font:13px system-ui,Arial,sans-serif;color:#555">
    <nav aria-label="Site links">${items}</nav>
  </footer>
  <script>/* Hide the static crawl-links footer once the app has rendered its own nav,
     so human visitors don't see a duplicate. Search crawlers render the initial
     HTML and still index these links. */
  (function(){function h(){var r=document.getElementById('root');var f=document.getElementById('site-crawl-links');if(f&&r&&r.children.length>0){f.style.display='none';}}
  if(document.readyState!=='loading'){setTimeout(h,1200);}else{document.addEventListener('DOMContentLoaded',function(){setTimeout(h,1200);});}})();
  </script>`;
}

function noscriptFor(route) {
  return `<noscript><div style="max-width:820px;margin:40px auto;padding:0 20px;font-family:system-ui,Arial,sans-serif">
    <p>${esc(route.description)}</p>
    ${crawlableNav()}
    <p>Navgrow Engineering Service Pvt. Ltd., Ward No-47, Old Matigara Road, Pati Colony, Siliguri, West Bengal – 734001, India — ${esc(SITE.phone)} — ${esc(SITE.email)}</p>
  </div></noscript>`;
}

// Remove the hardcoded, homepage-oriented tags baked into index.html so each
// prerendered page carries ONLY its own correct canonical, og:url and meta.
// Leaving the base canonical in place made every page canonicalise to the
// homepage — a duplicate-content signal that blocks indexing.
function stripBaseTags(html) {
  return html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name="description"[^>]*>/gi, '')
    .replace(/<meta\s+name="keywords"[^>]*>/gi, '')
    .replace(/<meta\s+name="robots"[^>]*>/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>/gi, '')
    .replace(/<meta\s+property="og:url"[^>]*>/gi, '')
    .replace(/<meta\s+property="og:locale"[^>]*>/gi, '')
    .replace(/<meta\s+property="og:title"[^>]*>/gi, '')
    .replace(/<meta\s+property="og:description"[^>]*>/gi, '')
    // Remove ALL og:image* variants (image, secure_url, width, height, type, alt)
    // so each page emits exactly one, correctly-sized image with no duplicates.
    .replace(/<meta\s+property="og:image(:[a-z_]+)?"[^>]*>/gi, '')
    .replace(/<meta\s+name="twitter:title"[^>]*>/gi, '')
    .replace(/<meta\s+name="twitter:description"[^>]*>/gi, '')
    .replace(/<meta\s+name="twitter:image(:[a-z]+)?"[^>]*>/gi, '')
    // Each page sets these itself; the base copies made them appear twice.
    .replace(/<meta\s+property="og:type"[^>]*>/gi, '')
    .replace(/<meta\s+property="og:site_name"[^>]*>/gi, '')
    .replace(/<meta\s+name="twitter:card"[^>]*>/gi, '')
    // The base hreflang links point at the HOMEPAGE — on any other page they
    // told Google that page's alternate was the homepage.
    .replace(/<link\s+rel="alternate"\s+hreflang="[^"]*"[^>]*>/gi, '')
    .replace('</head>', `    ${BUILD_META}\n</head>`);
}

// ── Data every page can link to ─────────────────────────────────────────────
const inr = (n) => '₹' + Number(n).toLocaleString('en-IN', Number.isInteger(Number(n)) ? {} : { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function priceSummary(p) {
  const opts = liveOptions(p);
  const per = p.unitLabel ? ` per ${p.unitLabel}` : '';
  if (opts.length) {
    const prices = opts.map(v => Number(v.price));
    const lo = Math.min(...prices), hi = Math.max(...prices);
    return { text: (lo === hi ? inr(lo) : `${inr(lo)} – ${inr(hi)}`) + per, low: lo, options: opts };
  }
  if (Number(p.price) > 0) return { text: inr(p.price) + per, low: Number(p.price), options: [] };
  return { text: 'Price on request', low: 0, options: [] };
}

const PRODUCT_PAGES = (LIVE_PRODUCTS
  ? LIVE_PRODUCTS.map(p => normalizeProduct(p, true))
  : _PRODUCTS_FOR_LIST.map(p => normalizeProduct(p, false))).filter(p => (p.slug || p.id) && p.name);

const byCategory = (products) => {
  const groups = new Map();
  for (const p of products) {
    const c = p.category || 'Other';
    if (!groups.has(c)) groups.set(c, []);
    groups.get(c).push(p);
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
};
const productLink = (p) => `<a href="/shop/${esc(String(p.slug || p.id))}">${esc(p.name)}</a>`;
const articleDate = (a) => String(a.publishedAt || '').slice(0, 10);

/**
 * Crawlable links to the pages a listing page lists — every product on /shop,
 * every post on /news, every service on /services, highlights on the homepage
 * and everything on /sitemap. They used to carry only the menu, so products were
 * found only through the sitemap file: a weak signal ("Discovered – currently
 * not indexed").
 */
function listingLinks(route) {
  const productsBlock = (products, heading) => (products.length ? `
    <h2>${esc(heading)}</h2>${byCategory(products).map(([cat, list]) => `
    <h3>${esc(cat)}</h3>
    <ul>${list.map(p => `<li>${productLink(p)} — ${esc(priceSummary(p).text)}</li>`).join('')}</ul>`).join('')}` : '');
  const servicesBlock = (heading) => `
    <h2>${esc(heading)}</h2>
    <ul>${SERVICES.filter(sv => sv && sv.slug).map(sv => `<li><a href="/services/${esc(sv.slug)}">${esc(sv.title)}</a>${sv.tagline ? ` — ${esc(sv.tagline)}` : ''}</li>`).join('')}</ul>`;
  const newsBlock = (articles, heading) => (articles.length ? `
    <h2>${esc(heading)}</h2>
    <ul>${articles.map(a => `<li><a href="/news/${esc(a.slug)}">${esc(a.title)}</a>${articleDate(a) ? ` — ${esc(articleDate(a))}` : ''}</li>`).join('')}</ul>` : '');
  const newest = [...ALL_ARTICLES].filter(a => a.slug).sort((a, b) => articleDate(b).localeCompare(articleDate(a)));
  switch (route.path) {
    case '/shop': return productsBlock(PRODUCT_PAGES, `All products (${PRODUCT_PAGES.length})`);
    case '/news': return newsBlock(newest, 'All news & insights');
    case '/services': return servicesBlock('All services');
    case '/': return `${servicesBlock('Engineering & sustainability services')}${productsBlock(PRODUCT_PAGES.slice(0, 12), 'From the shop')}${PRODUCT_PAGES.length > 12 ? `
    <p><a href="/shop">See all ${PRODUCT_PAGES.length} products</a></p>` : ''}${newsBlock(newest.slice(0, 5), 'Latest news')}`;
    case '/sitemap': return `
    <h2>Pages</h2>
    <ul>${ROUTES.filter(r => r.path !== '/sitemap').map(r => `<li><a href="${esc(r.path)}">${esc(r.title.split(' — ')[0].split(' | ')[0])}</a></li>`).join('')}</ul>${servicesBlock('Services')}${productsBlock(PRODUCT_PAGES, 'Products')}${newsBlock(newest, 'News')}`;
    default: return '';
  }
}

function render(route) {
  let html = stripBaseTags(template);
  // Inject our head block right before </head>.
  html = html.replace('</head>', `${headFor(route)}\n</head>`);
  // Real, crawlable page content rendered INSIDE #root. React replaces #root on
  // hydration, so human visitors never see this — but search engines (and users
  // with JS disabled) get substantive, indexable content immediately instead of
  // an empty div. This is the key fix for thin server-rendered content.
  const contentSections = SEO_CONTENT[route.path];
  // Every route gets at least a heading and its description as real text (the
  // legal pages used to ship an empty #root).
  const prerenderedBody = `<div id="prerendered-seo-content" style="max-width:900px;margin:0 auto;padding:24px;font-family:system-ui,Arial,sans-serif;line-height:1.6">
    <h1>${esc(route.title.split(' — ')[0].split(' | ')[0])}</h1>
    ${contentSections ? renderSeoContent(contentSections) : `<p>${esc(route.description)}</p>`}${listingLinks(route)}
  </div>`;
  html = html.replace('<div id="root"></div>',
    `${noscriptFor(route)}\n  <div id="root">${prerenderedBody}</div>${crawlableFooter()}`);
  return html;
}

let count = 0;
for (const route of ROUTES) {
  const html = render(route);
  const outDir = route.path === '/' ? DIST : join(DIST, route.path.replace(/^\//, ''));
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'index.html'), html, 'utf8');
  count++;
}

console.log(`[prerender] Wrote ${count} SEO HTML files.`);

// ── Product detail pages ────────────────────────────────────────────────────
// Built from the LIVE catalogue when the API answered at build time (today's
// prices, options, stock and genuine review counts); otherwise from the
// built-in catalogue, whose placeholder ratings are never put in the markup.
// Product JSON-LD comes from src/lib/productSchema.js — the same builder the
// product page uses — so the prerendered and rendered markup always agree.
function headForProduct(p) {
  const slug = p.slug || p.id;
  const url = `${SITE.url}/shop/${slug}`;
  const price = priceSummary(p);
  const title = `${p.name} — Buy Online | ${SITE.shortName}`;
  const desc = plainText(`${p.name}${price.low ? ` at ${price.text}` : ''} (incl. GST). ${p.summary || p.description || ''} GST invoice with HSN, bulk prices and pan-India delivery.`, 300);
  const img = p.image && /^https?:\/\//.test(p.image) ? p.image : (p.image || '/og-share.jpg');
  const product = buildProductSchema(p, { siteUrl: SITE.url, genuineRatings: p.genuine });
  const crumb = buildProductBreadcrumb(p, { siteUrl: SITE.url });
  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: title,
    isPartOf: { '@id': `${SITE.url}/#website` },
    breadcrumb: { '@id': `${url}#breadcrumb` },
    ...(product ? { mainEntity: { '@id': `${url}#product` } } : {}),
  };
  // Same script id as the product page uses, so the app replaces (never
  // duplicates) this markup once it has loaded.
  const pageLd = [product, crumb].filter(Boolean);
  return `
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(desc)}"/>
    <meta name="keywords" content="${esc([p.name, p.category, ...(p.optionNames || []), 'buy online', 'price', 'GST invoice', 'Navgrow Engineering'].filter(Boolean).join(', '))}"/>
    <link rel="canonical" href="${url}"/>
    <link rel="alternate" hreflang="en-in" href="${url}"/>
    <link rel="alternate" hreflang="x-default" href="${url}"/>
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"/>
    <meta property="og:type" content="product"/>
    <meta property="og:title" content="${esc(title)}"/>
    <meta property="og:description" content="${esc(desc)}"/>
    <meta property="og:url" content="${url}"/>
    <meta property="og:site_name" content="${esc(SITE.name)}"/>${price.low ? `
    <meta property="product:price:amount" content="${price.low.toFixed(2)}"/>
    <meta property="product:price:currency" content="INR"/>` : ''}
    <meta name="twitter:card" content="summary_large_image"/>
    <meta name="twitter:title" content="${esc(title)}"/>
    <meta name="twitter:description" content="${esc(desc)}"/>${ogImageTags(img, p.name)}
    <script type="application/ld+json" id="page-jsonld">${jsonLd(pageLd)}</script>
    <script type="application/ld+json">${jsonLd(webPage)}</script>`;
}

/** JSON for a <script> block — "</" can never close the tag early. */
function jsonLd(obj) {
  return JSON.stringify(obj).replace(/<\//g, '<\\/');
}

/** Real, crawlable product content: name, price, options, description, features, specs. */
function productBody(p) {
  const price = priceSummary(p);
  const names = (p.optionNames || []).slice(0, 3);
  const opts = price.options.slice(0, 80);
  const avail = (v) => {
    const moq = Math.max(1, Number(v.minOrderQty) || Number(p.minOrderQty) || 1);
    return Number(v.stockQty ?? v.liveStock) >= moq ? 'In stock' : 'On request';
  };
  const table = opts.length ? `
      <h2>${esc(p.name)} — all options &amp; prices</h2>
      <table>
        <thead><tr>${names.map(n => `<th>${esc(n)}</th>`).join('')}<th>Price${p.unitLabel ? ` per ${esc(p.unitLabel)}` : ''}</th><th>Availability</th></tr></thead>
        <tbody>${opts.map((v, idx) => `<tr>${names.map((_, i) => `<td>${i === 0
          ? `<a href="/shop/${esc(String(p.slug || p.id))}?variant=${esc(encodeURIComponent(variantRef(v, idx)))}">${esc(v[`option${i + 1}`] || '')}</a>`
          : esc(v[`option${i + 1}`] || '')}</td>`).join('')}<td>${esc(inr(v.price))}</td><td>${avail(v)}</td></tr>`).join('')}</tbody>
      </table>` : '';
  const list = (title, items) => (items.length ? `\n      <h2>${esc(title)}</h2>\n      <ul>${items.slice(0, 30).map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '');
  return `<div id="prerendered-seo-content" style="max-width:900px;margin:0 auto;padding:24px;font-family:system-ui,Arial,sans-serif;line-height:1.6">
      <p><a href="/">Home</a> › <a href="/shop">Shop</a>${p.category ? ` › ${esc(p.category)}` : ''}</p>
      <h1>${esc(p.name)}</h1>
      <p><strong>Price: ${esc(price.text)}</strong> (incl. GST)${p.hsnCode ? ` &middot; HSN ${esc(String(p.hsnCode))}` : ''}${p.category ? ` &middot; Category: ${esc(p.category)}` : ''}</p>
      ${p.tagline ? `<p><em>${esc(p.tagline)}</em></p>` : ''}
      <p>${esc(plainText(p.summary || p.description, 800))}</p>${table}
      ${p.description && p.description !== p.summary ? `<p>${esc(plainText(p.description, 1500))}</p>` : ''}${list('Key features', p.features || [])}${list('Specifications', p.specs || [])}
      <h2>Buy ${esc(p.name)} online from Navgrow Engineering</h2>
      <p>GST tax invoice with HSN for input-tax credit, bulk prices for larger quantities, request-for-quote for project requirements, and pan-India delivery (free within Siliguri; elsewhere charged by pincode at checkout). Call ${esc(SITE.phone)} or email ${esc(SITE.email)}.</p>${(() => {
        const related = PRODUCT_PAGES.filter(x => x !== p && (x.category || '') === (p.category || '')).slice(0, 8);
        return related.length ? `
      <h2>More in ${esc(p.category || 'the shop')}</h2>
      <ul>${related.map(r => `<li>${productLink(r)} — ${esc(priceSummary(r).text)}</li>`).join('')}</ul>` : '';
      })()}
      <p><a href="/shop">Browse all products</a></p>
    </div>`;
}

function noscriptForProduct(p) {
  return `<noscript><div style="max-width:720px;margin:40px auto;padding:0 20px;font-family:system-ui,Arial,sans-serif">
    <p><strong>${esc(p.name)} — ${esc(priceSummary(p).text)}</strong> (incl. GST). ${esc(plainText(p.summary || p.description, 400))}</p>
    <p>Navgrow Engineering Service Pvt. Ltd., Siliguri, West Bengal, India — ${esc(SITE.phone)} — ${esc(SITE.email)}</p>
  </div></noscript>`;
}

let productCount = 0;
for (const p of PRODUCT_PAGES) {
  const slug = p.slug || p.id;
  if (!slug || !p.name) continue;
  try {
    let html = stripBaseTags(template);
    html = html.replace('</head>', `${headForProduct(p)}\n</head>`);
    html = html.replace('<div id="root"></div>', `${noscriptForProduct(p)}\n  <div id="root">${productBody(p)}</div>${crawlableFooter()}`);
    const outDir = join(PAGES_ROOT, 'shop', String(slug));
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'index.html'), html, 'utf8');
    productCount++;
  } catch (e) {
    console.warn(`[prerender] Product "${slug}" skipped: ${e.message}`);
  }
}
console.log(`[prerender] Wrote ${productCount} product SEO HTML files (${LIVE_PRODUCTS ? 'live catalogue' : 'built-in catalogue'}).`);

// ── News / blog articles ────────────────────────────────────────────────────
// Each article is prerendered with a BlogPosting + Breadcrumb schema and full
// meta, so posts are immediately indexable and eligible for article rich results.
function headForArticle(a) {
  const url = `${SITE.url}/news/${a.slug}`;
  const title = `${a.title} | Navgrow News`;
  const desc = plainText(a.excerpt || a.title, 300);
  const img = a.image && /^https?:\/\//.test(a.image) ? a.image : (a.image || '/og-share.jpg');
  const schema = articleSchema(a);
  if (a.updatedAt) schema.dateModified = a.updatedAt;
  const crumb = articleBreadcrumb(a);
  const webPage = {
    '@context': 'https://schema.org', '@type': 'WebPage', '@id': `${url}#webpage`,
    url, name: title, isPartOf: { '@id': `${SITE.url}/#website` },
    breadcrumb: { '@id': `${url}#breadcrumb` },
  };
  return `
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(desc)}"/>
    <meta name="keywords" content="${esc((a.category || '') + ', Navgrow Engineering, Indian Railways, Siliguri, ' + a.title)}"/>
    <link rel="canonical" href="${url}"/>
    <link rel="alternate" hreflang="en-in" href="${url}"/>
    <link rel="alternate" hreflang="x-default" href="${url}"/>
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"/>
    <meta property="og:type" content="article"/>
    <meta property="article:published_time" content="${esc(a.publishedAt)}"/>
    <meta property="article:section" content="${esc(a.category || 'News')}"/>
    <meta property="og:title" content="${esc(title)}"/>
    <meta property="og:description" content="${esc(desc)}"/>
    <meta property="og:url" content="${url}"/>
    <meta property="og:site_name" content="${esc(SITE.name)}"/>
    <meta name="twitter:card" content="summary_large_image"/>
    <meta name="twitter:title" content="${esc(title)}"/>
    <meta name="twitter:description" content="${esc(desc)}"/>${ogImageTags(img, a.title)}
    <script type="application/ld+json" id="page-jsonld">${jsonLd(schema)}</script>
    <script type="application/ld+json">${jsonLd(webPage)}</script>
    <script type="application/ld+json">${jsonLd(crumb)}</script>`;
}

function noscriptForArticle(a) {
  return `<noscript><article style="max-width:720px;margin:40px auto;padding:0 20px;font-family:system-ui,Arial,sans-serif">
    <p style="color:#666;text-transform:uppercase;font-size:12px;letter-spacing:1px">${esc(a.category || 'News')} &middot; ${esc(a.publishedAt)}</p>
    <p>${esc(a.excerpt || '')}</p>
    <p>Read more from Navgrow Engineering Service Pvt. Ltd., Siliguri, West Bengal &mdash; ${esc(SITE.phone)} &middot; ${esc(SITE.email)}.</p>
  </article></noscript>`;
}

let newsCount = 0;
for (const a of ALL_ARTICLES) {
  if (!a.slug) continue;
  try {
    let html = stripBaseTags(template);
    html = html.replace('</head>', `${headForArticle(a)}\n</head>`);
    const body = plainText(a.content || '', 2500);
    const artBody = `<div id="prerendered-seo-content" style="max-width:900px;margin:0 auto;padding:24px;font-family:system-ui,Arial,sans-serif;line-height:1.6">
      <article>
      <p><a href="/">Home</a> › <a href="/news">News</a></p>
      <h1>${esc(a.title)}</h1>
      <p><em>${esc(a.category || 'News')} &middot; ${esc(a.publishedAt || '')} &middot; ${esc(a.authorName || 'Navgrow Engineering')}</em></p>
      <p>${esc(a.excerpt || '')}</p>${body ? `\n      <p>${esc(body)}</p>` : ''}
      <p>Read more news and insights from Navgrow Engineering Service Pvt. Ltd., a DPIIT-recognised engineering firm in Siliguri, West Bengal, India, serving railways, industry and government across India.</p>
      </article>
    </div>`;
    html = html.replace('<div id="root"></div>', `${noscriptForArticle(a)}\n  <div id="root">${artBody}</div>${crawlableFooter()}`);
    const outDir = join(PAGES_ROOT, 'news', a.slug);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'index.html'), html, 'utf8');
    writeFallbackCopy('news', a.slug, html);
    newsCount++;
  } catch (e) {
    console.warn(`[prerender] Article "${a.slug}" skipped: ${e.message}`);
  }
}
console.log(`[prerender] Wrote ${newsCount} news SEO HTML files.`);

// ── Service detail pages (/services/<slug>) ─────────────────────────────────
// These ten pages had no prerendered file, so crawlers were handed the
// homepage's HTML — including its canonical — and Google filed every one of
// them as a duplicate of the homepage ("Alternate page with proper canonical
// tag"). Each now gets its own complete, indexable page.
function headForService(sv) {
  const url = `${SITE.url}/services/${sv.slug}`;
  const title = serviceTitle(sv);
  const desc = serviceDescription(sv);
  // The same array the service page publishes once it has loaded (src/lib/serviceSchema.js).
  const pageLd = buildServiceSchemas(sv, { siteUrl: SITE.url });
  return `
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(desc)}"/>
    <meta name="keywords" content="${esc([sv.title, ...(sv.standards || []).slice(0, 4), 'Siliguri', 'West Bengal', 'India', 'Navgrow Engineering'].join(', '))}"/>
    <link rel="canonical" href="${url}"/>
    <link rel="alternate" hreflang="en-in" href="${url}"/>
    <link rel="alternate" hreflang="x-default" href="${url}"/>
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"/>
    <meta property="og:type" content="website"/>
    <meta property="og:title" content="${esc(title)}"/>
    <meta property="og:description" content="${esc(desc)}"/>
    <meta property="og:url" content="${url}"/>
    <meta property="og:site_name" content="${esc(SITE.name)}"/>
    <meta name="twitter:card" content="summary_large_image"/>
    <meta name="twitter:title" content="${esc(title)}"/>
    <meta name="twitter:description" content="${esc(desc)}"/>${ogImageTags(sv.image || '/og-share.jpg', sv.imageAlt || sv.title)}
    <script type="application/ld+json" id="page-jsonld">${jsonLd(pageLd)}</script>`;
}

function serviceBody(sv) {
  const related = (sv.related || []).map(slug => SERVICES.find(x => x.slug === slug)).filter(Boolean);
  const list = (title, items) => (items.length ? `\n      <h2>${esc(title)}</h2>\n      <ul>${items.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '');
  return `<div id="prerendered-seo-content" style="max-width:900px;margin:0 auto;padding:24px;font-family:system-ui,Arial,sans-serif;line-height:1.6">
      <p><a href="/">Home</a> › <a href="/services">Services</a></p>
      <h1>${esc(sv.title)}</h1>
      ${sv.tagline ? `<p><strong>${esc(sv.tagline)}</strong></p>` : ''}
      <p>${esc(sv.description)}</p>
      ${(sv.overview || []).map(t => `<p>${esc(t)}</p>`).join('\n      ')}${list('What we deliver', sv.deliverables || [])}${(sv.process || []).length ? `
      <h2>How we work</h2>
      <ol>${sv.process.map(st => `<li><strong>${esc(st.title)}</strong> — ${esc(st.text)}</li>`).join('')}</ol>` : ''}${(sv.outcomes || []).length ? `
      <h2>Outcomes</h2>
      <ul>${sv.outcomes.map(o => `<li><strong>${esc(o.title)}</strong> — ${esc(o.text)}</li>`).join('')}</ul>` : ''}${list('Standards & compliance', sv.standards || [])}${(sv.faqs || []).length ? `
      <h2>Frequently asked questions</h2>
      ${sv.faqs.map(f => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('\n      ')}` : ''}${related.length ? `
      <h2>Related services</h2>
      <ul>${related.map(r => `<li><a href="/services/${esc(r.slug)}">${esc(r.title)}</a></li>`).join('')}</ul>` : ''}
      <p>Discuss your requirement: <a href="/quote-calculator">get a quote</a>, call ${esc(SITE.phone)} or email ${esc(SITE.email)}.</p>
    </div>`;
}

let serviceCount = 0;
for (const sv of SERVICES) {
  if (!sv || !sv.slug) continue;
  try {
    let html = stripBaseTags(template);
    html = html.replace('</head>', `${headForService(sv)}\n</head>`);
    html = html.replace('<div id="root"></div>', `<noscript><p>${esc(sv.description)}</p>${crawlableNav()}</noscript>\n  <div id="root">${serviceBody(sv)}</div>${crawlableFooter()}`);
    const outDir = join(PAGES_ROOT, 'services', sv.slug);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'index.html'), html, 'utf8');
    writeFallbackCopy('services', sv.slug, html);
    serviceCount++;
  } catch (e) {
    console.warn(`[prerender] Service "${sv.slug}" skipped: ${e.message}`);
  }
}
console.log(`[prerender] Wrote ${serviceCount} service SEO HTML files.`);

// ── The SPA fallback shell (dist/app.html) ──────────────────────────────────
// Served (by .htaccess / _redirects, and by og.php) for any URL that has no
// prerendered page: account pages, new products before the next build, etc.
// It deliberately has NO canonical, og:url or hreflang. The old fallback was
// the HOMEPAGE's HTML, so every such URL told Google "my canonical is the
// homepage" and was dropped as a duplicate. The app sets the right canonical
// for the page once it has loaded.
{
  let html = stripBaseTags(template);
  const desc = 'Navgrow Engineering Service Pvt. Ltd. — DPIIT-recognised, MSME-registered engineering company in Siliguri, West Bengal: railway infrastructure, industrial & civil works, sustainability solutions and a B2B engineering shop with GST invoices.';
  html = html.replace('</head>', `
    <title>${esc(SITE.name)}</title>
    <meta name="description" content="${esc(desc)}"/>
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"/>
    <meta property="og:type" content="website"/>
    <meta property="og:site_name" content="${esc(SITE.name)}"/>
    <meta property="og:title" content="${esc(SITE.name)}"/>
    <meta property="og:description" content="${esc(desc)}"/>
    <meta name="twitter:card" content="summary_large_image"/>
    <meta name="twitter:title" content="${esc(SITE.name)}"/>
    <meta name="twitter:description" content="${esc(desc)}"/>${ogImageTags('/og-share.jpg', SITE.name)}
</head>`);
  writeFileSync(join(DIST, 'app.html'), html, 'utf8');
  console.log('[prerender] Wrote dist/app.html (neutral SPA fallback — no canonical).');
}

// ── Stamp this build's id into .htaccess and build-id.txt (read by og.php) ───
{
  writeFileSync(join(DIST, 'build-id.txt'), `${BUILD_ID}\n`, 'utf8');
  const htaccess = join(DIST, '.htaccess');
  if (existsSync(htaccess)) {
    const t = readFileSync(htaccess, 'utf8');
    if (!t.includes('__NAVGROW_BUILD__')) {
      console.warn('[prerender] dist/.htaccess has no __NAVGROW_BUILD__ placeholder — product, news and service pages will not be served from this build.');
    }
    writeFileSync(htaccess, t.split('__NAVGROW_BUILD__').join(BUILD_ID), 'utf8');
  } else {
    console.warn('[prerender] dist/.htaccess not found — copy public/.htaccess, or the prerendered product pages will not be served.');
  }
  console.log(`[prerender] Build ${BUILD_ID}: product, news and service pages are in dist/_p/${BUILD_ID}/ (.htaccess serves only this build's pages).`);
}
