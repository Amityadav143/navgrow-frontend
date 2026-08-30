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
import { SEO_CONTENT, renderSeoContent } from '../src/lib/seo-content.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');
// Local images live in dist/ after the Vite build (public/ is copied there);
// fall back to the source public/ folder just in case.
const PUBLIC_DIR = existsSync(join(DIST, 'favicon.png')) ? DIST : join(__dirname, '..', 'public');
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
    <script type="application/ld+json">${JSON.stringify(faqSchema())}</script>` : ''}`;
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
    .replace(/<meta\s+name="twitter:image(:[a-z]+)?"[^>]*>/gi, '');
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
  const prerenderedBody = contentSections
    ? `<div id="prerendered-seo-content" style="max-width:900px;margin:0 auto;padding:24px;font-family:system-ui,Arial,sans-serif;line-height:1.6">
    <h1>${esc(route.title.split(' — ')[0].split(' | ')[0])}</h1>
    ${renderSeoContent(contentSections)}
  </div>`
    : '';
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
            : (p.image || '/og-share.jpg');
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
    const price = Number(p.price);
    const priceStr = Number.isFinite(price) && price > 0 ? `\u20B9${price.toLocaleString('en-IN')}` : 'Request a quote';
    const prodBody = `<div id="prerendered-seo-content" style="max-width:900px;margin:0 auto;padding:24px;font-family:system-ui,Arial,sans-serif;line-height:1.6">
      <h1>${esc(p.name)}</h1>
      <p><strong>Price: ${esc(priceStr)}</strong> (incl. GST)${p.hsnCode ? ` &middot; HSN ${esc(String(p.hsnCode))}` : ''}${p.category ? ` &middot; Category: ${esc(p.category)}` : ''}</p>
      <p>${esc((p.summary || p.description || p.desc || '').slice(0, 800))}</p>
      <h2>Buy ${esc(p.name)} online from Navgrow Engineering</h2>
      <p>Certified product with a GST tax invoice (HSN codes) for input-tax credit, pan-India delivery (free within Siliguri), and bulk / RFQ options for B2B and institutional buyers. Contact ${esc(SITE.phone)} or ${esc(SITE.email)}.</p>
    </div>`;
    html = html.replace('<div id="root"></div>', `${noscriptForProduct(p)}\n  <div id="root">${prodBody}</div>${crawlableFooter()}`);
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
  const img = a.image && /^https?:\/\//.test(a.image) ? a.image : (a.image || '/og-share.jpg');
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
    const artBody = `<div id="prerendered-seo-content" style="max-width:900px;margin:0 auto;padding:24px;font-family:system-ui,Arial,sans-serif;line-height:1.6">
      <article>
      <h1>${esc(a.title)}</h1>
      <p><em>${esc(a.category || 'News')} &middot; ${esc(a.publishedAt || '')} &middot; Navgrow Engineering</em></p>
      <p>${esc(a.excerpt || '')}</p>
      <p>Read more news and insights from Navgrow Engineering Service Pvt. Ltd., a DPIIT-recognised engineering firm in Siliguri, West Bengal, India, serving railways, industry and government across India.</p>
      </article>
    </div>`;
    html = html.replace('<div id="root"></div>', `${noscriptForArticle(a)}\n  <div id="root">${artBody}</div>${crawlableFooter()}`);
    const outDir = join(DIST, 'news', a.slug);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'index.html'), html, 'utf8');
    newsCount++;
  }
  console.log(`[prerender] Wrote ${newsCount} news SEO HTML files.`);
} catch (e) {
  console.warn(`[prerender] News prerender skipped: ${e.message}`);
}
