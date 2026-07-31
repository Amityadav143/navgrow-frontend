/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 · navgrow.org
 *
 * PROPRIETARY & CONFIDENTIAL — Navgrow Engineering Platform v1.0
 *
 * ResetPasswordPage — the landing page for the password-reset link emailed to
 * users (…/reset-password?token=…). It reads the token from the URL, lets the
 * user set a new password, and calls the reset API. Previously this route did
 * not exist, so the emailed link produced a 404.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, XCircle, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { authApi } from '@/lib/api';

const PWD_MIN = 8;

// Mirror the strength meter used in the auth modal for a consistent experience.
const passwordStrength = (pwd) => {
  let score = 0;
  if (pwd.length >= PWD_MIN) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const meta = [
    { label: 'Too weak', cls: 'bg-red-500', text: 'text-red-600', w: '25%' },
    { label: 'Weak', cls: 'bg-orange-500', text: 'text-orange-600', w: '50%' },
    { label: 'Good', cls: 'bg-yellow-500', text: 'text-yellow-600', w: '75%' },
    { label: 'Strong', cls: 'bg-green-500', text: 'text-green-600', w: '100%' },
  ];
  return { score, ...(meta[Math.max(0, score - 1)] || meta[0]) };
};

const PasswordInput = ({ label, value, onChange, placeholder, error }) => {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      <div className="relative">
        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-300" />
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full pl-10 pr-10 py-2.5 border-2 rounded-xl text-sm focus:outline-none transition-colors ${
            error ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
          }`}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
};

const ResetPasswordPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';

  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const strength = useMemo(() => passwordStrength(pwd), [pwd]);

  // A missing/blank token means the link was malformed or truncated.
  const tokenMissing = !token.trim();

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (pwd.length < PWD_MIN) errs.pwd = `Password must be at least ${PWD_MIN} characters.`;
    if (pwd !== confirm) errs.confirm = 'Passwords do not match.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSubmitting(true);
    try {
      await authApi.resetPw(token, pwd);
      setDone(true);
    } catch (err) {
      const msg = err.response?.data?.message || 'This reset link is invalid or has expired. Please request a new one.';
      setErrors({ form: msg });
    } finally {
      setSubmitting(false);
    }
  };

  // After success, send the user to the homepage (where they can sign in) shortly.
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => navigate('/?login=1'), 3500);
    return () => clearTimeout(t);
  }, [done, navigate]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header band */}
          <div className="brand-gradient px-8 py-7 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-xl font-extrabold text-white">Reset your password</h1>
            <p className="text-white/80 text-sm mt-1">Choose a new password for your Navgrow account</p>
          </div>

          <div className="p-8">
            {done ? (
              <div className="text-center py-4">
                <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto mb-4" />
                <h2 className="text-lg font-extrabold text-gray-900 mb-1">Password updated</h2>
                <p className="text-gray-500 text-sm mb-6">
                  Your password has been changed. You can now sign in with your new password.
                </p>
                <Link
                  to="/?login=1"
                  className="inline-flex items-center justify-center gap-2 w-full py-3 brand-gradient text-white font-bold rounded-xl text-sm hover:opacity-90 transition-opacity"
                >
                  Continue to sign in <ArrowRight className="h-4 w-4" />
                </Link>
                <p className="text-xs text-gray-400 mt-3">Redirecting you automatically…</p>
              </div>
            ) : tokenMissing ? (
              <div className="text-center py-4">
                <XCircle className="h-14 w-14 text-red-400 mx-auto mb-4" />
                <h2 className="text-lg font-extrabold text-gray-900 mb-1">Invalid reset link</h2>
                <p className="text-gray-500 text-sm mb-6">
                  This link is missing its security token, or it was broken across lines by your email app.
                  Please request a fresh reset link.
                </p>
                <Link
                  to="/?forgot=1"
                  className="inline-flex items-center justify-center gap-2 w-full py-3 brand-gradient text-white font-bold rounded-xl text-sm hover:opacity-90 transition-opacity"
                >
                  Request a new link <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4" noValidate>
                <PasswordInput
                  label="New Password"
                  value={pwd}
                  onChange={(e) => { setPwd(e.target.value); setErrors(p => ({ ...p, pwd: undefined, form: undefined })); }}
                  placeholder="Min 8 characters"
                  error={errors.pwd}
                />

                {/* strength meter */}
                {pwd && (
                  <div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${strength.cls} transition-all`} style={{ width: strength.w }} />
                    </div>
                    <p className={`text-xs mt-1 font-semibold ${strength.text}`}>{strength.label}</p>
                  </div>
                )}

                <PasswordInput
                  label="Confirm New Password"
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setErrors(p => ({ ...p, confirm: undefined })); }}
                  placeholder="Repeat new password"
                  error={errors.confirm}
                />

                {errors.form && (
                  <div className="flex items-start gap-2 p-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">
                    <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{errors.form}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 brand-gradient text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60 hover:opacity-90 transition-opacity"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  {submitting ? 'Updating…' : 'Update password'}
                </button>

                <p className="text-center text-xs text-gray-400">
                  Remembered it?{' '}
                  <Link to="/?login=1" className="text-blue-600 font-semibold hover:underline">Back to sign in</Link>
                </p>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-4">
          For your security, this link can only be used once and expires after a short time.
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
