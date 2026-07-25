/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 | navgrow.org | info@navgrow.org
 *
 * PROPRIETARY & CONFIDENTIAL — Navgrow Engineering Platform v1.0
 * Unauthorised copying or distribution is strictly prohibited.
 */
/**
 * RequireAuth — gates a page behind sign-in.
 *
 * Renders a sign-in prompt rather than redirecting, so the visitor keeps their
 * place and lands back on the same page once authenticated. While the session is
 * still being restored it shows a skeleton, otherwise a signed-in user would see
 * a flash of "please sign in" on every refresh.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, LogIn } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import AuthModal from '@/components/AuthModal';

export default function RequireAuth({
  children,
  title = 'Please sign in',
  message = 'Sign in to view this page.',
}) {
  const { isLoggedIn, loading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  if (loading) {
    return (
      <section className="py-20 bg-gray-50 min-h-[60vh]">
        <div className="container mx-auto px-4 max-w-md">
          <div className="h-40 bg-gray-200 animate-pulse rounded-2xl" />
        </div>
      </section>
    );
  }

  if (isLoggedIn) return children;

  return (
    <section className="py-16 bg-gray-50 min-h-[60vh]">
      <div className="container mx-auto px-4 max-w-md">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <Lock className="h-7 w-7 text-blue-600" />
          </div>
          <h1 className="text-xl font-extrabold text-gray-900 mb-2">{title}</h1>
          <p className="text-gray-500 text-sm mb-6">{message}</p>
          <button
            onClick={() => setAuthOpen(true)}
            className="w-full inline-flex items-center justify-center gap-2 py-3 btn-gold rounded-xl text-sm">
            <LogIn className="h-4 w-4" /> Sign in
          </button>
          <Link to="/shop" className="block mt-3 text-sm text-gray-500 hover:text-gray-700">
            Continue browsing
          </Link>
        </div>
      </div>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </section>
  );
}
