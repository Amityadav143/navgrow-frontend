/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 | navgrow.org | info@navgrow.org
 *
 * PROPRIETARY & CONFIDENTIAL
 * This file is part of the Navgrow Engineering Platform.
 * Unauthorised copying, modification, distribution, or use is prohibited
 * without prior written consent of Navgrow Engineering Service Pvt. Ltd.
 *
 * Licensed for: navgrow.org (Production Deployment Only)
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import App from '@/App';
import { initVitals } from '@/lib/vitals';
import '@/index.css';
import { Toaster } from '@/components/ui/toaster';
import { CartProvider } from '@/context/CartContext';
import { CompareProvider } from '@/components/CompareDrawer';
import { AuthProvider } from '@/context/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ConfirmProvider } from '@/components/ConfirmDialog';
import { RfqProvider } from '@/context/RfqContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <RfqProvider>
              <CompareProvider>
              <ConfirmProvider>
                <App />
                <Toaster />
              </ConfirmProvider>
              </CompareProvider>
            </RfqProvider>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
      </MotionConfig>
    </ErrorBoundary>
  </React.StrictMode>
);

initVitals();

// ── Progressive Web App: register the service worker (production only) ────────
// Gives repeat visitors instant loads and offline browsing. Registered after
// load so it never competes with the initial render. Safe to no-op if
// unsupported. The SW itself never caches the API or HTML aggressively, so new
// deploys are always picked up.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // When a new SW is installed and there's an existing controller, a new
      // version is available — activate it on next navigation automatically.
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            nw.postMessage('SKIP_WAITING');
          }
        });
      });
    }).catch(() => { /* SW registration is best-effort */ });
  });
}
