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
    queue.push({
      event,
      label: opts.label != null ? String(opts.label).slice(0, 200) : undefined,
      value: typeof opts.value === 'number' ? opts.value : undefined,
      sessionId: getSessionId(),
      path: opts.path || (typeof window !== 'undefined' ? window.location.pathname : undefined),
    });
    if (queue.length >= MAX_BATCH) flush();
    else scheduleFlush();
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
