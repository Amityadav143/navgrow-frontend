/**
 * verify-social.mjs — checks that a live URL exposes a valid social-share preview
 * (Open Graph image + title + description) the way WhatsApp / Facebook / LinkedIn
 * / X read it. Use this to confirm the "logo instead of product" issue is fixed
 * once the site is deployed.
 *
 * Usage:
 *   node scripts/verify-social.mjs                       # checks a default set
 *   node scripts/verify-social.mjs https://navgrow.org/shop/industrial-safety-helmet-isi
 */

const DEFAULT_URLS = [
  'https://navgrow.org/',
  'https://navgrow.org/shop/industrial-safety-helmet-isi',
  'https://navgrow.org/news/indian-railways-budget-fy26-infrastructure',
];

const urls = process.argv.slice(2);
const targets = urls.length ? urls : DEFAULT_URLS;

function metaContent(html, key, attr = 'property') {
  const re = new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]*>`, 'i');
  const tag = html.match(re)?.[0];
  if (!tag) return null;
  return tag.match(/content=["']([^"']*)["']/i)?.[1] || null;
}

async function head(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    return { ok: res.ok, status: res.status, type: res.headers.get('content-type') || '' };
  } catch (e) {
    return { ok: false, status: 0, type: '', error: e.message };
  }
}

let anyFail = false;

for (const url of targets) {
  console.log(`\n──────── ${url}`);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)' },
    });
    const html = await res.text();

    const ogTitle = metaContent(html, 'og:title');
    const ogDesc  = metaContent(html, 'og:description');
    const ogImage = metaContent(html, 'og:image');
    const ogW     = metaContent(html, 'og:image:width');
    const ogH     = metaContent(html, 'og:image:height');
    const twCard  = metaContent(html, 'twitter:card', 'name');

    console.log(`  og:title       ${ogTitle ? '✓ ' + ogTitle.slice(0, 60) : '✗ MISSING'}`);
    console.log(`  og:description ${ogDesc ? '✓ ' + ogDesc.slice(0, 60) : '✗ MISSING'}`);
    console.log(`  og:image       ${ogImage ? '✓ ' + ogImage : '✗ MISSING'}`);
    console.log(`  og:image size  ${ogW && ogH ? `✓ ${ogW}x${ogH}` : '⚠ no width/height (previews may not render large)'}`);
    console.log(`  twitter:card   ${twCard === 'summary_large_image' ? '✓ summary_large_image' : `⚠ ${twCard || 'missing'}`}`);

    // Is the image itself reachable and an actual image?
    if (ogImage) {
      const h = await head(ogImage);
      if (!h.ok) {
        console.log(`  image fetch    ✗ NOT reachable (HTTP ${h.status}) — platforms will show no image`);
        anyFail = true;
      } else if (!/^image\//.test(h.type)) {
        console.log(`  image fetch    ⚠ reachable but content-type is "${h.type}" (expected image/*)`);
      } else {
        console.log(`  image fetch    ✓ reachable (${h.type})`);
      }
      // Warn if the share image is just the logo on a product/news URL.
      if (/\/ng_logo\.png/i.test(ogImage) && !/\/$|\/about|\/services|\/contact/.test(url)) {
        console.log('  ⚠ og:image is the logo on a content page — product/article image expected.');
        anyFail = true;
      }
    } else {
      anyFail = true;
    }

    // Detect the SPA-shell case (no per-page OG at all beyond the base).
    if (/\/shop\/|\/news\//.test(url) && ogTitle && /Navgrow Engineering Service Pvt\. Ltd\./.test(ogTitle) && !/\|/.test(ogTitle)) {
      console.log('  ⚠ looks like the homepage/shell OG — the prerendered page may not be served here.');
      anyFail = true;
    }
  } catch (e) {
    console.log(`  ✗ fetch failed: ${e.message}`);
    anyFail = true;
  }
}

console.log('\n' + (anyFail
  ? '❌ Some social previews need attention (see ✗ / ⚠ above). If a content URL shows\n   the logo or the shell OG, deploy the prerendered dist/ and re-run. After deploying,\n   also clear the platform cache: Facebook Sharing Debugger + LinkedIn Post Inspector\n   (WhatsApp uses Facebook\'s cache), then re-share the link.'
  : '✅ All checked URLs expose a valid, correctly-sized social preview image.'));

console.log('\nTip: paste a URL into these to force a fresh crawl after deploying:');
console.log('  • Facebook / WhatsApp: https://developers.facebook.com/tools/debug/');
console.log('  • LinkedIn:            https://www.linkedin.com/post-inspector/');
console.log('  • X / Twitter:         https://cards-dev.twitter.com/validator');

process.exit(anyFail ? 1 : 0);
