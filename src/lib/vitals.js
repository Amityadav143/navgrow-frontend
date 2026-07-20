/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * Real-user Web Vitals → our own analytics (no third-party tracker).
 * Production only; every call is fire-and-forget and can never surface errors.
 */
import { onLCP, onCLS, onINP, onTTFB } from 'web-vitals';
import { analyticsApi } from '@/lib/api';

const sessionId = (() => {
  try {
    const k = 'ng_vitals_session';
    let v = sessionStorage.getItem(k);
    if (!v) { v = Math.random().toString(36).slice(2, 12); sessionStorage.setItem(k, v); }
    return v;
  } catch { return 'anon'; }
})();

function report(metric) {
  try {
    analyticsApi.track({
      eventName: `web_vital_${metric.name}`,
      label: metric.rating,                       // good | needs-improvement | poor
      value: Math.round(metric.value * 1000) / 1000,
      sessionId,
      path: window.location.pathname,
    }).catch(() => {});
  } catch { /* never disturb the user */ }
}

export function initVitals() {
  if (!import.meta.env.PROD) return;
  try {
    onLCP(report); onCLS(report); onINP(report); onTTFB(report);
  } catch { /* older browsers */ }
}
