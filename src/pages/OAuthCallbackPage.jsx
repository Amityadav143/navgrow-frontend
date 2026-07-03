/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 · navgrow.org
 *
 * PROPRIETARY & CONFIDENTIAL — Navgrow Engineering Platform v1.0
 *
 * OAuthCallbackPage — lands here after a social login redirect from the backend.
 * It reads the tokens from the URL, establishes the session via the auth context,
 * and forwards the user on. No tokens are ever shown to the user.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const OAuthCallbackPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { applySession } = useAuth();
  const [status, setStatus] = useState('loading'); // loading | ok | error
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const token = params.get('token');
    const refresh = params.get('refresh');
    const email = params.get('email');
    const name = params.get('name');
    const authError = params.get('auth_error');

    if (authError || !token) {
      setStatus('error');
      setTimeout(() => navigate('/', { replace: true }), 2200);
      return;
    }

    (async () => {
      try {
        await applySession({
          accessToken: token,
          refreshToken: refresh,
          email,
          fullName: name,
          roles: ['ROLE_USER'],
        });
        setStatus('ok');
        // Clean the tokens out of the URL history, then continue.
        setTimeout(() => navigate('/account', { replace: true }), 900);
      } catch {
        setStatus('error');
        setTimeout(() => navigate('/', { replace: true }), 2200);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        {status === 'loading' && (
          <>
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-extrabold text-gray-900 mb-1">Signing you in…</h1>
            <p className="text-sm text-gray-500">Securely completing your sign-in.</p>
          </>
        )}
        {status === 'ok' && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-xl font-extrabold text-gray-900 mb-1">Welcome!</h1>
            <p className="text-sm text-gray-500">Taking you to your account…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="text-xl font-extrabold text-gray-900 mb-1">Sign-in failed</h1>
            <p className="text-sm text-gray-500">We couldn't complete your sign-in. Redirecting you home…</p>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
