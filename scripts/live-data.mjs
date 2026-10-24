/**
 * © 2024–2026 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 *
 * live-data.mjs — the LIVE catalogue and news, fetched from the API at build
 * time for scripts/prerender.mjs and scripts/generate-sitemap.mjs.
 *
 * Products and posts created in the admin live only in the database. Without
 * this, the build prerendered (and listed in sitemap.xml) only the built-in
 * sample catalogue, so the real products had no crawlable page of their own.
 *
 *   PRERENDER_API_URL  API base (default https://navgrow.org/api)
 *   PRERENDER_LIVE=0   skip the live fetch (offline builds)
 *
 * Never fails the build: if the API can't be reached the lists come back null
 * and the scripts fall back to the built-in catalogue. The result is cached for
 * 10 minutes so the two scripts of one build see the same data.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE = join(__dirname, '..', 'node_modules', '.cache', 'navgrow', 'live-data.json');
export const LIVE_API = (process.env.PRERENDER_API_URL || 'https://navgrow.org/api').replace(/\/+$/, '');
const ENABLED = process.env.PRERENDER_LIVE !== '0';

async function fetchJson(url, timeoutMs = 10000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Every page of a Spring Page<T> endpoint; null when the first page fails. */
async function fetchAllPages(path, size, maxPages = 40) {
  const out = [];
  for (let page = 0; page < maxPages; page++) {
    const sep = path.includes('?') ? '&' : '?';
    const data = await fetchJson(`${LIVE_API}${path}${sep}page=${page}&size=${size}`);
    const list = Array.isArray(data?.content) ? data.content : (Array.isArray(data) ? data : null);
    if (!list) return page === 0 ? null : out;
    out.push(...list);
    if (data?.last === true || list.length < size) break;
  }
  return out;
}

/**
 * { products, news, source } — products/news are arrays, or null when the API
 * could not be reached (or PRERENDER_LIVE=0).
 */
export async function loadLiveData() {
  if (!ENABLED) return { products: null, news: null, source: 'disabled' };
  try {
    if (existsSync(CACHE) && Date.now() - statSync(CACHE).mtimeMs < 10 * 60 * 1000) {
      const cached = JSON.parse(readFileSync(CACHE, 'utf8'));
      if (cached && cached.source === LIVE_API) return cached;
    }
  } catch { /* ignore a bad cache */ }
  const [products, news] = await Promise.all([
    fetchAllPages('/products?sort=name', 300),
    fetchAllPages('/news', 100),
  ]);
  const data = { products, news, source: LIVE_API, fetchedAt: new Date().toISOString() };
  try {
    mkdirSync(dirname(CACHE), { recursive: true });
    writeFileSync(CACHE, JSON.stringify(data));
  } catch { /* cache is optional */ }
  return data;
}

/** Newline (or array) list → trimmed non-empty strings. */
export function lines(v) {
  if (Array.isArray(v)) return v.map(x => String(x ?? '').trim()).filter(Boolean);
  return String(v || '').split('\n').map(x => x.trim()).filter(Boolean);
}

/**
 * A product in one shape for the build scripts, whether it came from the API
 * (genuine=true) or the built-in catalogue (genuine=false — its ratings are
 * placeholders and must never reach structured data).
 */
export function normalizeProduct(p, genuine) {
  const variants = Array.isArray(p.variants) ? p.variants.filter(Boolean) : [];
  const optionNames = Array.isArray(p.optionNames) && p.optionNames.length
    ? p.optionNames
    : [p.option1Name, p.option2Name, p.option3Name].filter(x => x && String(x).trim());
  const specs = Array.isArray(p.specs)
    ? p.specs.map(s => (s && typeof s === 'object' ? [s.label, s.value].filter(Boolean).join(': ') : String(s || '')))
    : lines(p.specifications);
  return {
    id: p.id,
    slug: p.slug || p.id,
    name: p.name,
    category: p.category || p.cat || '',
    summary: p.summary || '',
    description: p.description || p.desc || '',
    tagline: p.tagline || '',
    price: Number(p.price),
    mrp: p.mrp != null ? Number(p.mrp) : null,
    priceMax: p.priceMax != null ? Number(p.priceMax) : null,
    sku: p.sku || '',
    hsnCode: p.hsnCode || '',
    gstRate: p.gstRate ?? null,
    unitLabel: p.unitLabel || '',
    image: p.imageUrl || p.image || '',
    stockQty: p.stockQty,
    minOrderQty: p.minOrderQty || 1,
    inStock: p.inStock,
    rating: genuine ? Number(p.rating) || 0 : 0,
    reviewCount: genuine ? Number(p.reviewCount) || 0 : 0,
    variants,
    optionNames,
    hasVariants: variants.length > 0,
    features: lines(p.features),
    specs: lines(specs),
    priceTiers: p.priceTiers || '',
    updatedAt: p.updatedAt || p.priceUpdatedAt || null,
    genuine,
  };
}
