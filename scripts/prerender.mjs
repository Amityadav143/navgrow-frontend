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
import { ROUTES, SITE, organizationSchema } from '../src/lib/seo-routes.mjs';

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

function headFor(route) {
  const url = SITE.url + (route.path === '/' ? '/' : route.path);
  const fullTitle = route.path === '/'
    ? `${SITE.name} | ${route.title}`
    : `${route.title} | ${SITE.shortName}`;
  const img = SITE.logo;

  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: fullTitle,
    description: route.description,
    url,
    isPartOf: { '@type': 'WebSite', name: SITE.name, url: SITE.url },
    publisher: { '@type': 'Organization', name: SITE.name, logo: SITE.logo },
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
    <meta property="og:image" content="${esc(img)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(fullTitle)}" />
    <meta name="twitter:description" content="${esc(route.description)}" />
    <meta name="twitter:image" content="${esc(img)}" />
    <script type="application/ld+json">${JSON.stringify(organizationSchema())}</script>
    <script type="application/ld+json">${JSON.stringify(webPage)}</script>
    <script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>`;
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

function render(route) {
  let html = template;

  // Replace the <title> if present, else inject.
  html = html.replace(/<title>[\s\S]*?<\/title>/i, '').replace(
    /<meta name="description"[^>]*>/i, '');

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
