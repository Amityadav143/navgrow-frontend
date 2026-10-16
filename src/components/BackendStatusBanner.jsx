/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 *
 * Backend connectivity banner.
 *
 * The whole app degrades gracefully to static data when the API is unreachable —
 * good for resilience, but it means a misconfigured or not-running backend looks
 * like "features are broken" rather than "the server isn't connected". This
 * banner removes that ambiguity: it pings a lightweight endpoint once on load and,
 * only if it fails, shows a dismissible notice explaining what's happening and
 * where the frontend is trying to reach. On a healthy connection it renders
 * nothing at all.
 *
 * It intentionally checks a real data endpoint (not just /actuator/health), so a
 * running-but-empty database is distinguished from an unreachable server.
 */
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { api, API_BASE } from '@/lib/api';
import { useLocation } from 'react-router-dom';
import AuthContext from '@/context/AuthContext';

export default function BackendStatusBanner() {
  const [state, setState] = React.useState('checking'); // checking | ok | offline | empty
  const [dismissed, setDismissed] = React.useState(false);
  // The technical detail (API address, "run the migrations") is for the team.
  // Customers get a plain notice — or nothing, when the shop is merely empty.
  const auth = React.useContext(AuthContext);
  const staff = !!auth?.canAccessAdmin || !import.meta.env.PROD;
  // The shop page explains its own offline mode right above the products.
  const { pathname } = useLocation();

  React.useEffect(() => {
    let cancelled = false;
    // Hit a public, cheap endpoint. We check the full active list (not just
    // featured) so "no products flagged featured" is never mistaken for "empty
    // catalogue" — the banner only reports a truly empty shop.
    api.get('/products', { params: { size: 1, active: true }, skipErrorToast: true, timeout: 8000 })
      .then(({ data }) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : (data?.content || []);
        const total = data?.totalElements ?? list.length;
        setState(total > 0 ? 'ok' : 'empty');
      })
      .catch(() => { if (!cancelled) setState('offline'); });
    return () => { cancelled = true; };
  }, []);

  if (dismissed || state === 'checking' || state === 'ok') return null;

  const offline = state === 'offline';
  if (!staff && (!offline || pathname === '/shop')) return null;
  if (!staff) {
    return (
      <div role="status" className="w-full text-sm bg-amber-50 border-b border-amber-200 text-amber-900">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
          <p className="flex-1 leading-relaxed">
            <strong>Live prices and stock are temporarily unavailable.</strong>{' '}
            You can keep browsing and request a quote — online checkout will be back shortly.
          </p>
          <button onClick={() => setDismissed(true)} aria-label="Dismiss"
            className="p-1 rounded hover:bg-amber-100 shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className={`w-full text-sm ${offline ? 'bg-red-600' : 'bg-amber-500'} text-white`}>
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <div className="flex-1 leading-relaxed">
          {offline ? (
            <>
              <strong>Backend not reachable.</strong> The site is showing its built-in
              sample catalogue, so admin-managed products, live stock and coupons won't
              appear. The frontend is trying to reach <code className="bg-black/20 px-1 rounded">{API_BASE}</code>.
              {' '}Start the API (or fix the proxy) and reload.
            </>
          ) : (
            <>
              <strong>Connected, but the product catalogue is empty.</strong> Run the
              database migrations (which seed the shop) or add products in the admin panel.
            </>
          )}
        </div>
        <button onClick={() => setDismissed(true)} aria-label="Dismiss"
          className="p-1 rounded hover:bg-black/20 shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
