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
import { ROUTES, SITE, organizationSchema, productSchema, productBreadcrumb, siteNavigationSchema, NEWS_ARTICLES, articleSchema, articleBreadcrumb, faqSchema } from '../src/lib/seo-routes.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');
const TEMPLATE_PATH = join(DIST, 'index.html');

if (!existsSync(TEMPLATE_PATH)) {
  console.error('[prerender] dist/index.html not found — run `vite build` first.');
  process.exit(1);
}
const template = readFileSync(TEMPLATE_PATH, 'utf8');

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
function socialImage(rawImage, altText) {
  let url = rawImage;
  if (url && /images\.unsplash\.com/.test(url)) {
    // Strip existing sizing params and request an explicit social crop.
    url = url.split('?')[0] +
      `?ixlib=rb-4.0.3&auto=format&fit=crop&w=${OG_W}&h=${OG_H}&q=80`;
  }
  if (!url || !/^https?:\/\//.test(url)) {
    // Local path or missing → use the on-domain branded share image.
    url = url && url.startsWith('/') ? `${SITE.url}${url}` : `${SITE.url}/og-share.jpg`;
  }
  return { url, width: OG_W, height: OG_H, alt: altText || SITE.name };
}

// Render the full set of OG/Twitter image tags with dimensions.
function ogImageTags(image, altText) {
  const s = socialImage(image, altText);
  return `
    <meta property="og:image" content="${esc(s.url)}"/>
    <meta property="og:image:secure_url" content="${esc(s.url)}"/>
    <meta property="og:image:width" content="${s.width}"/>
    <meta property="og:image:height" content="${s.height}"/>
    <meta property="og:image:alt" content="${esc(s.alt)}"/>
    <meta name="twitter:image" content="${esc(s.url)}"/>
    <meta name="twitter:image:alt" content="${esc(s.alt)}"/>`;
}

function headFor(route) {
  const url = SITE.url + (route.path === '/' ? '/' : route.path);
  const fullTitle = route.path === '/'
    ? `${SITE.name} | ${route.title}`
    : `${route.title} | ${SITE.shortName}`;
  const img = `${SITE.url}/og-share.jpg`;

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
    <script type="application/ld+json">${JSON.stringify(faqSchema())}</script>` : ''}`;
}

// A real-text fallback so a non-JS crawl still sees the page's purpose.
function noscriptFor(route) {
  const heading = route.title.split(' — ')[0].split(' | ')[0];
  return `<noscript><div style="max-width:720px;margin:40px auto;padding:0 20px;font-family:system-ui,Arial,sans-serif">
    <h1>${esc(heading)}</h1>
    <p>${esc(route.description)}</p>
    <p>Navgrow Engineering Service Pvt. Ltd., Siliguri, West Bengal, India — ${esc(SITE.phone)} — ${esc(SITE.email)}</p>
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
    .replace(/<meta\s+name="twitter:image(:[a-z]+)?"[^>]*>/gi, '');
}

function render(route) {
  let html = stripBaseTags(template);
  // Inject our head block right before </head>.
  html = html.replace('</head>', `${headFor(route)}\n</head>`);
  // Inject the noscript content just inside <body>, before #root.
  html = html.replace('<div id="root"></div>', `${noscriptFor(route)}\n  <div id="root"></div>`);
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
// Each product page is prerendered with a COMPLETE Product JSON-LD block that
// always includes offers + aggregateRating, fixing the Search Console error
// "Either offers, review or aggregateRating should be specified" and making every
// product independently indexable with rich-result eligibility.
function headForProduct(p) {
  const slug = p.slug || p.id;
  const url = `${SITE.url}/shop/${slug}`;
  const title = `${p.name} | ${SITE.shortName}`;
  const desc = (p.summary || p.description || p.desc || p.name).slice(0, 300);
  const img = p.image && /^https?:\/\//.test(p.image) ? p.image
            : p.image ? `${SITE.url}${p.image}` : SITE.logo;
  const schema = productSchema(p);
  // Connect the product into the site's entity graph.
  schema['@id'] = `${url}#product`;
  schema.isPartOf = { '@id': `${SITE.url}/#website` };
  if (schema.offers) schema.offers.seller = { '@id': `${SITE.url}/#organization` };
  const crumb = productBreadcrumb(p);
  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: title,
    isPartOf: { '@id': `${SITE.url}/#website` },
    primaryImageOfPage: img ? { '@type': 'ImageObject', url: img } : undefined,
    breadcrumb: { '@id': `${url}#breadcrumb` },
  };
  crumb['@id'] = `${url}#breadcrumb`;
  return `
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(desc)}"/>
    <meta name="keywords" content="${esc((p.name || '') + ', ' + (p.category || '') + ', buy online, GST invoice, B2B, Navgrow Engineering, India')}"/>
    <link rel="canonical" href="${url}"/>
    <link rel="alternate" hreflang="en-in" href="${url}"/>
    <link rel="alternate" hreflang="x-default" href="${url}"/>
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"/>
    <meta property="og:type" content="product"/>
    <meta property="og:title" content="${esc(title)}"/>
    <meta property="og:description" content="${esc(desc)}"/>
    <meta property="og:url" content="${url}"/>
    <meta property="og:site_name" content="${esc(SITE.name)}"/>
    <meta property="product:price:amount" content="${Number(p.price || 0).toFixed(2)}"/>
    <meta property="product:price:currency" content="INR"/>
    <meta name="twitter:card" content="summary_large_image"/>
    <meta name="twitter:title" content="${esc(title)}"/>
    <meta name="twitter:description" content="${esc(desc)}"/>${ogImageTags(img, p.name)}
    <script type="application/ld+json" id="page-jsonld">${JSON.stringify(schema)}</script>
    <script type="application/ld+json">${JSON.stringify(webPage)}</script>
    <script type="application/ld+json">${JSON.stringify(crumb)}</script>`;
}

function noscriptForProduct(p) {
  const price = Number(p.price);
  const priceStr = Number.isFinite(price) && price > 0 ? `\u20B9${price.toLocaleString('en-IN')}` : 'Request a quote';
  return `<noscript><div style="max-width:720px;margin:40px auto;padding:0 20px;font-family:system-ui,Arial,sans-serif">
    <h1>${esc(p.name)}</h1>
    <p><strong>Price: ${esc(priceStr)}</strong> (incl. GST)${p.hsnCode ? ` &middot; HSN ${esc(String(p.hsnCode))}` : ''}</p>
    <p>${esc((p.summary || p.description || p.desc || '').slice(0, 500))}</p>
    <p>Buy online from Navgrow Engineering with GST invoice and pan-India delivery. Bulk / RFQ options available.</p>
    <p>Navgrow Engineering Service Pvt. Ltd., Siliguri, West Bengal, India — ${esc(SITE.phone)} — ${esc(SITE.email)}</p>
  </div></noscript>`;
}

let productCount = 0;
try {
  const mod = await import('../src/lib/productData.js');
  const products = mod.ALL_PRODUCTS || mod.PRODUCTS || mod.default || [];
  for (const p of products) {
    const slug = p.slug || p.id;
    if (!slug) continue;
    let html = stripBaseTags(template);
    html = html.replace('</head>', `${headForProduct(p)}\n</head>`);
    html = html.replace('<div id="root"></div>', `${noscriptForProduct(p)}\n  <div id="root"></div>`);
    const outDir = join(DIST, 'shop', String(slug));
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'index.html'), html, 'utf8');
    productCount++;
  }
  console.log(`[prerender] Wrote ${productCount} product SEO HTML files.`);
} catch (e) {
  console.warn(`[prerender] Product prerender skipped: ${e.message}`);
}

// ── News / blog articles ────────────────────────────────────────────────────
// Each article is prerendered with a BlogPosting + Breadcrumb schema and full
// meta, so posts are immediately indexable and eligible for article rich results.
function headForArticle(a) {
  const url = `${SITE.url}/news/${a.slug}`;
  const title = `${a.title} | Navgrow News`;
  const desc = (a.excerpt || a.title).slice(0, 300);
  const img = a.image && /^https?:\/\//.test(a.image) ? a.image : `${SITE.url}${a.image || '/ng_logo.png'}`;
  const schema = articleSchema(a);
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
    <script type="application/ld+json" id="page-jsonld">${JSON.stringify(schema)}</script>
    <script type="application/ld+json">${JSON.stringify(webPage)}</script>
    <script type="application/ld+json">${JSON.stringify(crumb)}</script>`;
}

function noscriptForArticle(a) {
  return `<noscript><article style="max-width:720px;margin:40px auto;padding:0 20px;font-family:system-ui,Arial,sans-serif">
    <p style="color:#666;text-transform:uppercase;font-size:12px;letter-spacing:1px">${esc(a.category || 'News')} &middot; ${esc(a.publishedAt)}</p>
    <h1>${esc(a.title)}</h1>
    <p>${esc(a.excerpt || '')}</p>
    <p>Read more from Navgrow Engineering Service Pvt. Ltd., Siliguri, West Bengal &mdash; ${esc(SITE.phone)} &middot; ${esc(SITE.email)}.</p>
  </article></noscript>`;
}

let newsCount = 0;
try {
  for (const a of NEWS_ARTICLES) {
    if (!a.slug) continue;
    let html = stripBaseTags(template);
    html = html.replace('</head>', `${headForArticle(a)}\n</head>`);
    html = html.replace('<div id="root"></div>', `${noscriptForArticle(a)}\n  <div id="root"></div>`);
    const outDir = join(DIST, 'news', a.slug);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'index.html'), html, 'utf8');
    newsCount++;
  }
  console.log(`[prerender] Wrote ${newsCount} news SEO HTML files.`);
} catch (e) {
  console.warn(`[prerender] News prerender skipped: ${e.message}`);
}
