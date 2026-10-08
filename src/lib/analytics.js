/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 | navgrow.org
 *
 * analytics.js — lightweight, privacy-respecting funnel tracking.
 *
 * Design goals:
 *  - No PII. Only an anonymous, rotating session id (random, not tied to identity).
 *  - Never break the UX: all failures are swallowed silently.
 *  - Batched + sendBeacon on unload so we don't spam the network.
 *  - Respects Do Not Track and a simple opt-out flag.
 */
import { api } from '@/lib/api';

const SESSION_KEY = 'ng_sid';
const OPTOUT_KEY = 'ng_analytics_optout';
const SESSION_TTL_MS = 1000 * 60 * 30; // 30 minutes of inactivity ends a session

// ── Google Analytics 4 (optional) ────────────────────────────────────────────
// Activates ONLY when VITE_GA_ID is set (e.g. "G-XXXXXXXXXX") at build time, so
// there's zero effect until you choose to add it. Every event tracked below is
// mirrored to GA4, so you get both first-party AND Google reporting (useful for
// Google Ads conversion tracking and familiar dashboards) with no extra calls.
const GA_ID = import.meta.env.VITE_GA_ID;
let gaReady = false;

function initGA() {
  if (gaReady || !GA_ID || typeof window === 'undefined') return;
  try {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    // We send page_view manually on route change, so disable automatic ones.
    window.gtag('config', GA_ID, { send_page_view: false });
    gaReady = true;
  } catch { /* best-effort */ }
}

function gaSend(event, opts = {}) {
  if (!GA_ID) return;
  try {
    if (!gaReady) initGA();
    if (typeof window.gtag !== 'function') return;
    if (event === 'page_view') {
      window.gtag('event', 'page_view', { page_path: opts.path, page_location: window.location.href });
    } else {
      window.gtag('event', event, {
        event_label: opts.label,
        value: opts.value,
        page_path: opts.path,
      });
    }
  } catch { /* ignore */ }
}

/** Generate a short random id (anonymous, no PII). */
function randomId() {
  try {
    const a = new Uint8Array(12);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  }
}

/** Get or create an anonymous session id with a sliding 30-min expiry. */
function getSessionId() {
  try {
    const now = Date.now();
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id && now - parsed.ts < SESSION_TTL_MS) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ id: parsed.id, ts: now }));
        return parsed.id;
      }
    }
    const id = randomId();
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id, ts: now }));
    return id;
  } catch {
    return 'anon';
  }
}

function isOptedOut() {
  try {
    if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return true;
    return localStorage.getItem(OPTOUT_KEY) === '1';
  } catch {
    return false;
  }
}

/** Allow users to opt out (e.g. from a privacy toggle). */
export function setAnalyticsOptOut(value) {
  try {
    if (value) localStorage.setItem(OPTOUT_KEY, '1');
    else localStorage.removeItem(OPTOUT_KEY);
  } catch { /* ignore */ }
}

// ── Batching ────────────────────────────────────────────────────────────────
let queue = [];
let flushTimer = null;
const FLUSH_DELAY = 1500;
const MAX_BATCH = 12;

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(flush, FLUSH_DELAY);
}

function flush() {
  flushTimer && clearTimeout(flushTimer);
  flushTimer = null;
  if (!queue.length) return;
  const batch = queue.splice(0, queue.length);
  // Fire each event; the endpoint is intentionally cheap and returns 204.
  batch.forEach((evt) => {
    api.post('/analytics/events', evt).catch(() => { /* swallow */ });
  });
}

/**
 * track(event, { label, value, path }) — record a single funnel event.
 * Safe to call anywhere; never throws.
 */
export function track(event, opts = {}) {
  try {
    if (!event || isOptedOut()) return;
    const path = opts.path || (typeof window !== 'undefined' ? window.location.pathname : undefined);
    queue.push({
      event,
      label: opts.label != null ? String(opts.label).slice(0, 200) : undefined,
      value: typeof opts.value === 'number' ? opts.value : undefined,
      sessionId: getSessionId(),
      path,
    });
    if (queue.length >= MAX_BATCH) flush();
    else scheduleFlush();
    // Mirror to GA4 (no-op unless VITE_GA_ID is configured).
    gaSend(event, { label: opts.label, value: opts.value, path });
  } catch { /* never break the UX */ }
}

/** Convenience helper for page views. */
export function trackPageView(path) {
  track('page_view', { path: path || window.location.pathname });
}

// Flush any pending events when the tab is hidden or closed (best-effort).
if (typeof window !== 'undefined') {
  const beaconFlush = () => {
    try {
      if (!queue.length) return;
      const base = api?.defaults?.baseURL || '';
      const batch = queue.splice(0, queue.length);
      if (navigator.sendBeacon && base) {
        batch.forEach((evt) => {
          const blob = new Blob([JSON.stringify(evt)], { type: 'application/json' });
          navigator.sendBeacon(`${base}/analytics/events`, blob);
        });
      } else {
        flush();
      }
    } catch { /* ignore */ }
  };
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') beaconFlush();
  });
  window.addEventListener('pagehide', beaconFlush);
}

export default track;
