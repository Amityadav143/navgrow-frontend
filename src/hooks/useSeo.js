import { useEffect, useRef } from 'react';

const BASE     = 'Navgrow Engineering Service Pvt. Ltd.';
const BASE_URL = 'https://navgrow.org';
const DEFAULT_DESC = 'DPIIT-recognised, MSME-registered engineering company in Siliguri, West Bengal — Indian Railways infrastructure, industrial & civil engineering, government contracts, and B2B safety products, machinery and tooling products, Call +91 89270 70972.';
const DEFAULT_KW   = 'Navgrow Engineering, railway contractor, Indian Railways, loco modification, shed construction, industrial engineering, civil works, government contracts, Siliguri, West Bengal, DPIIT, MSME';

/**
 * useSeo — Sets all page-level SEO meta tags in the DOM.
 * Fully reactive: re-runs whenever any argument changes.
 */
const useSeo = ({
  title,
  description,
  path = '',
  keywords,
  image = '/ng_logo.png',
  type = 'website',
  schema,
  noindex    = false,
} = {}) => {
  const schemaRef = useRef(null);

  useEffect(() => {
    const fullTitle = title ? `${title} | ${BASE}` : BASE;
    const desc      = description || DEFAULT_DESC;
    const kw        = keywords    || DEFAULT_KW;
    const canonical = BASE_URL + (path.startsWith('/') ? path : '/' + path);
    const imgUrl    = image.startsWith('http') ? image : `${BASE_URL}${image}`;

    /* ── Helper: upsert a <meta> tag ─────────────────────────────────────── */
    const setMeta = (selector, attrName, attrValue, content) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrValue);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    /* ── Title ───────────────────────────────────────────────────────────── */
    document.title = fullTitle;

    /* ── Standard meta ───────────────────────────────────────────────────── */
    setMeta('meta[name="description"]',    'name', 'description',  desc);
    setMeta('meta[name="keywords"]',       'name', 'keywords',     kw);
    setMeta('meta[name="robots"]',         'name', 'robots',
      noindex ? 'noindex, nofollow' : 'index, follow, max-snippet:-1, max-image-preview:large');

    /* ── Open Graph ─────────────────────────────────────────────────────── */
    setMeta('meta[property="og:type"]',        'property', 'og:type',        type);
    setMeta('meta[property="og:title"]',       'property', 'og:title',       fullTitle);
    setMeta('meta[property="og:description"]', 'property', 'og:description', desc);
    setMeta('meta[property="og:url"]',         'property', 'og:url',         canonical);
    setMeta('meta[property="og:image"]',       'property', 'og:image',       imgUrl);
    setMeta('meta[property="og:image:width"]', 'property', 'og:image:width', '1200');
    setMeta('meta[property="og:image:height"]','property', 'og:image:height','630');
    setMeta('meta[property="og:site_name"]',   'property', 'og:site_name',   BASE);
    setMeta('meta[property="og:locale"]',      'property', 'og:locale',      'en_IN');

    /* ── Twitter Card ───────────────────────────────────────────────────── */
    setMeta('meta[name="twitter:card"]',        'name', 'twitter:card',        'summary_large_image');
    setMeta('meta[name="twitter:title"]',       'name', 'twitter:title',       fullTitle);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', desc);
    setMeta('meta[name="twitter:image"]',       'name', 'twitter:image',       imgUrl);
    setMeta('meta[name="twitter:site"]',        'name', 'twitter:site',        '@NavgrowEng');

    /* ── Canonical ──────────────────────────────────────────────────────── */
    let canon = document.querySelector('link[rel="canonical"]');
    if (!canon) {
      canon = document.createElement('link');
      canon.rel = 'canonical';
      document.head.appendChild(canon);
    }
    canon.href = canonical;

    /* ── JSON-LD schema ─────────────────────────────────────────────────── */
    if (schema) {
      // Stable script element: create once, update content on change
      if (!schemaRef.current) {
        const s = document.createElement('script');
        s.type = 'application/ld+json';
        s.id   = 'page-jsonld';
        // Remove old one from prior page if navigated
        document.getElementById('page-jsonld')?.remove();
        document.head.appendChild(s);
        schemaRef.current = s;
      }
      schemaRef.current.textContent = JSON.stringify(schema);
    }

    /* ── Cleanup: remove JSON-LD when component unmounts ───────────────── */
    return () => {
      if (schemaRef.current) {
        schemaRef.current.remove();
        schemaRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, path, keywords, image, type, noindex, JSON.stringify(schema)]);
};

export default useSeo;
