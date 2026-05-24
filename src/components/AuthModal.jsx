import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Mail, Lock, User, Eye, EyeOff, AlertCircle,
  Chrome, Loader2, ArrowLeft, Smartphone, Phone, Shield,
  KeyRound, RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/lib/api';

/* ─────────────────────────────────────────────────────── helpers */
const EMAIL_RE  = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE  = /^[6-9]\d{9}$/;   // Indian 10-digit mobile
const PWD_MIN   = 8;

/* ─────────────────────────────────────────────────────── InputField */
const InputField = ({
  label, type = 'text', value, onChange, placeholder,
  icon: Icon, error, suffix, maxLength, pattern, inputMode,
}) => {
  const [show, setShow] = useState(false);
  const realType = type === 'password' ? (show ? 'text' : 'password') : type;
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide">{label}</label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        )}
        <input
          type={realType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          maxLength={maxLength}
          pattern={pattern}
          inputMode={inputMode}
          className={`w-full ${Icon ? 'pl-10' : 'pl-4'} ${suffix ? 'pr-10' : 'pr-4'} py-3
            border-2 rounded-xl text-sm transition-all focus:outline-none
            ${error
              ? 'border-red-300 focus:border-red-500 bg-red-50'
              : 'border-gray-200 focus:border-blue-500 bg-white hover:border-gray-300'
            }`}
        />
        {suffix && (
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
          <AlertCircle className="h-3 w-3 shrink-0" />{error}
        </p>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────── OTP boxes */
const OtpInput = ({ value, onChange, onPaste }) => {
  const refs = useRef([]);
  const digits = (value + '      ').slice(0, 6).split('');

  const handle = (idx, raw) => {
    const d = raw.replace(/\D/g, '').slice(-1);
    const next = value.split('');
    next[idx] = d;
    const joined = next.join('').slice(0, 6);
    onChange(joined);
    if (d && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handleKey = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx].trim() && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, 5);
    refs.current[focusIdx]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i]?.trim() || ''}
          onChange={e => handle(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          className={`w-11 h-12 text-center text-xl font-bold border-2 rounded-xl
            focus:outline-none transition-colors
            ${digits[i]?.trim()
              ? 'border-blue-500 bg-blue-50 text-blue-800'
              : 'border-gray-200 focus:border-blue-500 bg-white'}`}
        />
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────────────── OTP panel (login) */
const OtpLoginPanel = ({ onSuccess }) => {
  const [phone,      setPhone]      = useState('');
  const [phoneErr,   setPhoneErr]   = useState('');
  const [otp,        setOtp]        = useState('');
  const [stage,      setStage]      = useState('phone'); // phone | otp
  const [sending,    setSending]    = useState(false);
  const [verifying,  setVerifying]  = useState(false);
  const [otpErr,     setOtpErr]     = useState('');
  const [countdown,  setCountdown]  = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  const startCountdown = () => {
    setCountdown(30);
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timerRef.current); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const sendOtp = async () => {
    const cleaned = phone.replace(/\s/g, '');
    if (!PHONE_RE.test(cleaned)) {
      setPhoneErr('Enter a valid 10-digit Indian mobile number'); return;
    }
    setSending(true); setPhoneErr('');
    try {
      await authApi.sendOtp(cleaned);
      setStage('otp');
      startCountdown();
    } catch (err) {
      setPhoneErr(err.response?.data?.message || 'Failed to send OTP. Try again.');
    } finally { setSending(false); }
  };

  const verifyOtp = async () => {
    if (otp.length < 6) { setOtpErr('Enter the complete 6-digit OTP'); return; }
    setVerifying(true); setOtpErr('');
    try {
      const { data } = await authApi.verifyOtp(phone.replace(/\s/g, ''), otp);
      onSuccess(data);
    } catch (err) {
      setOtpErr(err.response?.data?.message || 'Invalid OTP. Please try again.');
      setOtp('');
    } finally { setVerifying(false); }
  };

  if (stage === 'phone') {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3.5 bg-blue-50 rounded-xl border border-blue-100">
          <Shield className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700 leading-relaxed">
            Enter your registered mobile number. We'll send a one-time password to verify your identity.
          </p>
        </div>
        <InputField
          label="Mobile Number"
          type="tel"
          icon={Smartphone}
          value={phone}
          onChange={e => { setPhone(e.target.value); setPhoneErr(''); }}
          placeholder="98765 43210"
          error={phoneErr}
          maxLength={10}
          inputMode="numeric"
        />
        <button
          type="button"
          onClick={sendOtp}
          disabled={sending}
          className="w-full py-3.5 btn-gold rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {sending
            ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Sending OTP…</>
            : 'Send OTP'
          }
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
          <Smartphone className="h-7 w-7 text-green-600" />
        </div>
        <p className="text-sm font-semibold text-gray-800">OTP sent to +91 {phone}</p>
        <p className="text-xs text-gray-500 mt-1">Check your SMS inbox for the 6-digit code</p>
      </div>
      <OtpInput value={otp} onChange={setOtp} />
      {otpErr && (
        <p className="text-xs text-red-500 flex items-center justify-center gap-1">
          <AlertCircle className="h-3 w-3" />{otpErr}
        </p>
      )}
      <button
        type="button"
        onClick={verifyOtp}
        disabled={verifying || otp.length < 6}
        className="w-full py-3.5 btn-gold rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {verifying
          ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Verifying…</>
          : <><Shield className="h-4 w-4" />Verify &amp; Sign In</>
        }
      </button>
      <div className="flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={() => { setStage('phone'); setOtp(''); setOtpErr(''); }}
          className="text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />Change number
        </button>
        {countdown > 0 ? (
          <span className="text-gray-400">Resend in {countdown}s</span>
        ) : (
          <button
            type="button"
            onClick={sendOtp}
            disabled={sending}
            className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className="h-3 w-3" />Resend OTP
          </button>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────── Main Modal */
const AuthModal = ({ open, onClose, defaultTab = 'login' }) => {
  const { login, register, loading, error: authError, clearError } = useAuth();

  const [tab,          setTab]          = useState(defaultTab);
  const [loginMethod,  setLoginMethod]  = useState('email'); // 'email' | 'mobile' | 'otp'
  const [form,         setForm]         = useState({
    name: '', email: '', phone: '', password: '', confirm: '',
  });
  const [errors,       setErrors]       = useState({});
  const [success,      setSuccess]      = useState('');
  const [oauthLoading, setOauthLoading] = useState('');
  const [forgotStep,   setForgotStep]   = useState(null);
  const [forgotLoading,setForgotLoading]= useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setTab(defaultTab);
      setLoginMethod('email');
      setForm({ name: '', email: '', phone: '', password: '', confirm: '' });
      setErrors({});
      setSuccess('');
      setForgotStep(null);
      clearError?.();
    }
  }, [open, defaultTab]);

  const ch = key => e => {
    setForm(p => ({ ...p, [key]: e.target.value }));
    setErrors(p => ({ ...p, [key]: '' }));
    clearError?.();
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validateEmailLogin = () => {
    const e = {};
    if (!form.email.trim())  e.email    = 'Email is required';
    else if (!EMAIL_RE.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.password)      e.password = 'Password is required';
    else if (form.password.length < PWD_MIN) e.password = `At least ${PWD_MIN} characters`;
    return e;
  };

  const validateMobileLogin = () => {
    const e = {};
    const cleaned = form.phone.replace(/\s/g, '');
    if (!cleaned)           e.phone    = 'Mobile number is required';
    else if (!PHONE_RE.test(cleaned)) e.phone = 'Enter a valid 10-digit Indian mobile number';
    if (!form.password)     e.password = 'Password is required';
    else if (form.password.length < PWD_MIN) e.password = `At least ${PWD_MIN} characters`;
    return e;
  };

  const validateRegister = () => {
    const e = {};
    if (!form.name.trim())   e.name     = 'Full name is required';
    // At least one of email or phone is required
    const hasEmail = form.email.trim();
    const hasPhone = form.phone.replace(/\s/g, '');
    if (!hasEmail && !hasPhone) {
      e.email = 'Email or mobile number is required';
      e.phone = 'Email or mobile number is required';
    }
    if (hasEmail && !EMAIL_RE.test(form.email)) e.email = 'Enter a valid email address';
    if (hasPhone && !PHONE_RE.test(hasPhone))   e.phone = 'Enter a valid 10-digit Indian mobile number';
    if (!form.password)      e.password = 'Password is required';
    else if (form.password.length < PWD_MIN) e.password = `At least ${PWD_MIN} characters`;
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    return e;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async e => {
    e.preventDefault();
    setSuccess('');

    let errs = {};
    if (tab === 'login') {
      errs = loginMethod === 'mobile' ? validateMobileLogin() : validateEmailLogin();
    } else {
      errs = validateRegister();
    }
    if (Object.keys(errs).length) { setErrors(errs); return; }

    let result;
    if (tab === 'login') {
      if (loginMethod === 'mobile') {
        result = await login(form.phone.replace(/\s/g, ''), form.password);
      } else {
        result = await login(form.email, form.password);
      }
    } else {
      result = await register({
        fullName: form.name,
        email:    form.email  || undefined,
        phone:    form.phone.replace(/\s/g, '') || undefined,
        password: form.password,
      });
    }

    if (result.success) {
      setSuccess(tab === 'login' ? 'Welcome back!' : 'Account created successfully!');
      setTimeout(onClose, 750);
    }
  };

  const handleOtpSuccess = (data) => {
    setSuccess('Signed in via OTP!');
    setTimeout(onClose, 750);
  };

  const handleGoogleLogin = () => {
    setOauthLoading('google');
    window.location.href = `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || ''}/oauth2/authorization/google`;
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!form.email.trim()) { setErrors({ email: 'Email is required' }); return; }
    if (!EMAIL_RE.test(form.email)) { setErrors({ email: 'Enter a valid email' }); return; }
    setForgotLoading(true); setErrors({}); setSuccess('');
    try {
      await authApi.forgotPw(form.email);
      setSuccess('Check your email for reset instructions.');
      setForgotStep('code');
    } catch (err) {
      setErrors({ email: err.response?.data?.message || 'Failed to send reset email.' });
    } finally { setForgotLoading(false); }
  };

  const handleBackToLogin = () => {
    setForgotStep(null); setTab('login'); setLoginMethod('email');
    setErrors({}); setSuccess('');
    setForm({ name: '', email: '', phone: '', password: '', confirm: '' });
  };

  if (!open) return null;

  /* ── Tab button labels ──────────────────────────────────────────────────── */
  const tabLabel = { login: 'Sign In', register: 'Sign Up' };   // ← "Sign Up" not "Register"

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
            onClick={onClose}
          />

          {/* ── Modal wrapper — full viewport flex centering ── */}
          {/* FIX: pointer-events on wrapper, actual scrolling on inner div */}
          <div
            className="fixed inset-0 z-[201] flex items-center justify-center p-3 sm:p-4"
            style={{ pointerEvents: 'none' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 24 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col"
              style={{
                pointerEvents: 'auto',
                /* Never exceed viewport height; modal scrolls internally */
                maxHeight: 'min(680px, calc(100dvh - 24px))',
              }}
            >
              {/* ── Fixed header ─────────────────────────────────────────── */}
              <div className="brand-gradient px-6 py-5 flex items-center justify-between rounded-t-3xl shrink-0">
                <div>
                  <h2 className="text-xl font-extrabold text-white">
                    {forgotStep === 'email'  ? 'Reset Password'
                    : forgotStep === 'code'  ? 'Check Your Email'
                    : tab === 'login'        ? 'Welcome Back'
                    :                          'Create Your Account'}
                  </h2>
                  <p className="text-blue-200 text-sm mt-0.5">
                    {forgotStep === 'email'  ? 'Enter your email to receive reset instructions'
                    : forgotStep === 'code'  ? 'We sent a reset link to your email'
                    : tab === 'login'        ? 'Sign in to your Navgrow account'
                    :                          'Sign up — it\'s free!'}
                  </p>
                </div>
                <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/15 text-white transition-colors" aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* ── Fixed tab bar ─────────────────────────────────────────── */}
              {!forgotStep && (
                <div className="flex border-b border-gray-100 shrink-0">
                  {['login', 'register'].map(t => (
                    <button
                      key={t}
                      onClick={() => { setTab(t); setErrors({}); setSuccess(''); clearError?.(); setLoginMethod('email'); setForm({ name: '', email: '', phone: '', password: '', confirm: '' }); }}
                      className={`flex-1 py-3.5 text-sm font-bold transition-all ${tab === t ? 'text-blue-700 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {tabLabel[t]}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Scrollable body ──────────────────────────────────────── */}
              <div className="overflow-y-auto flex-1 px-6 py-5">

                {/* ── LOGIN form ───────────────────────────────────────── */}
                {!forgotStep && tab === 'login' && (
                  <div className="space-y-4">
                    {/* Method tabs */}
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 rounded-xl">
                      {[
                        { id: 'email',  icon: Mail,       label: 'Email' },
                        { id: 'mobile', icon: Smartphone,  label: 'Mobile' },
                        { id: 'otp',    icon: KeyRound,    label: 'OTP' },
                      ].map(({ id, icon: Icon, label }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => { setLoginMethod(id); setErrors({}); setSuccess(''); clearError?.(); }}
                          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${loginMethod === id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          <Icon className="h-3.5 w-3.5" />{label}
                        </button>
                      ))}
                    </div>

                    {/* OTP login (separate panel) */}
                    {loginMethod === 'otp' && <OtpLoginPanel onSuccess={handleOtpSuccess} />}

                    {/* Email / Mobile + Password */}
                    {loginMethod !== 'otp' && (
                      <>
                        {/* Google */}
                        <button
                          type="button"
                          onClick={handleGoogleLogin}
                          disabled={!!oauthLoading}
                          className="flex items-center justify-center gap-2.5 w-full py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 hover:shadow-sm disabled:opacity-50 transition-all text-gray-700"
                        >
                          {oauthLoading === 'google' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Chrome className="h-4 w-4" />}
                          {oauthLoading === 'google' ? 'Redirecting…' : 'Continue with Google'}
                        </button>

                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-px bg-gray-200" />
                          <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
                            or with {loginMethod === 'mobile' ? 'mobile' : 'email'}
                          </span>
                          <div className="flex-1 h-px bg-gray-200" />
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                          {loginMethod === 'mobile' ? (
                            <InputField
                              label="Mobile Number *"
                              type="tel"
                              icon={Phone}
                              value={form.phone}
                              onChange={ch('phone')}
                              placeholder="98765 43210"
                              error={errors.phone}
                              maxLength={10}
                              inputMode="numeric"
                            />
                          ) : (
                            <InputField
                              label="Email Address *"
                              type="email"
                              icon={Mail}
                              value={form.email}
                              onChange={ch('email')}
                              placeholder="you@company.com"
                              error={errors.email}
                            />
                          )}
                          <InputField
                            label="Password *"
                            type="password"
                            icon={Lock}
                            value={form.password}
                            onChange={ch('password')}
                            placeholder={`Minimum ${PWD_MIN} characters`}
                            error={errors.password}
                            suffix
                          />

                          {(authError || success) && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                              className={`flex items-center gap-2 p-3 rounded-xl text-sm ${authError ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                              <AlertCircle className="h-4 w-4 shrink-0" />
                              {authError || success}
                            </motion.div>
                          )}

                          <button type="submit" disabled={loading}
                            className="w-full py-3.5 btn-gold rounded-xl font-bold text-base flex items-center justify-center gap-2 disabled:opacity-60 transition-all">
                            {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                            Sign In
                          </button>
                        </form>

                        <p className="text-center text-xs text-gray-400">
                          <button
                            onClick={() => { setForgotStep('email'); setErrors({}); setSuccess(''); clearError?.(); }}
                            className="text-blue-600 hover:underline font-semibold"
                            type="button"
                          >
                            Forgot your password?
                          </button>
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* ── REGISTER / SIGN-UP form ───────────────────────────── */}
                {!forgotStep && tab === 'register' && (
                  <div className="space-y-4">
                    {/* Google */}
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={!!oauthLoading}
                      className="flex items-center justify-center gap-2.5 w-full py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 hover:shadow-sm disabled:opacity-50 transition-all text-gray-700"
                    >
                      {oauthLoading === 'google' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Chrome className="h-4 w-4" />}
                      {oauthLoading === 'google' ? 'Redirecting…' : 'Sign up with Google'}
                    </button>

                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-xs text-gray-400 font-medium">or fill in your details</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                      <InputField
                        label="Full Name *"
                        icon={User}
                        value={form.name}
                        onChange={ch('name')}
                        placeholder="Your full name"
                        error={errors.name}
                      />
                      <InputField
                        label="Email Address"
                        type="email"
                        icon={Mail}
                        value={form.email}
                        onChange={ch('email')}
                        placeholder="you@company.com (optional if phone given)"
                        error={errors.email}
                      />
                      <InputField
                        label="Mobile Number"
                        type="tel"
                        icon={Phone}
                        value={form.phone}
                        onChange={ch('phone')}
                        placeholder="98765 43210 (optional if email given)"
                        error={errors.phone}
                        maxLength={10}
                        inputMode="numeric"
                      />

                      {/* hint */}
                      <p className="text-xs text-gray-400 -mt-2 pl-1">
                        ✦ Provide at least email <em>or</em> mobile number
                      </p>

                      <InputField
                        label="Password *"
                        type="password"
                        icon={Lock}
                        value={form.password}
                        onChange={ch('password')}
                        placeholder={`Minimum ${PWD_MIN} characters`}
                        error={errors.password}
                        suffix
                      />
                      <InputField
                        label="Confirm Password *"
                        type="password"
                        icon={Lock}
                        value={form.confirm}
                        onChange={ch('confirm')}
                        placeholder="Repeat your password"
                        error={errors.confirm}
                        suffix
                      />

                      {/* Password strength hint */}
                      {form.password.length > 0 && form.password.length < PWD_MIN && (
                        <div className="flex gap-1">
                          {[...Array(PWD_MIN)].map((_, i) => (
                            <div key={i} className={`h-1 flex-1 rounded-full ${i < form.password.length ? 'bg-amber-400' : 'bg-gray-200'}`} />
                          ))}
                        </div>
                      )}

                      {(authError || success) && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className={`flex items-center gap-2 p-3 rounded-xl text-sm ${authError ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          {authError || success}
                        </motion.div>
                      )}

                      <button type="submit" disabled={loading}
                        className="w-full py-3.5 btn-gold rounded-xl font-bold text-base flex items-center justify-center gap-2 disabled:opacity-60 transition-all">
                        {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                        Create Account
                      </button>
                    </form>

                    <p className="text-xs text-gray-400 text-center leading-relaxed">
                      By signing up you agree to our{' '}
                      <a href="/terms" className="text-blue-600 hover:underline">Terms</a> and{' '}
                      <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>.
                    </p>
                  </div>
                )}

                {/* ── FORGOT PASSWORD step 1: email ──────────────────────── */}
                {forgotStep === 'email' && (
                  <form onSubmit={handleForgotPassword} className="space-y-4" noValidate>
                    <InputField
                      label="Email Address"
                      type="email"
                      icon={Mail}
                      value={form.email}
                      onChange={ch('email')}
                      placeholder="you@company.com"
                      error={errors.email}
                    />
                    {success && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="flex items-center gap-2 p-3 rounded-xl text-sm bg-green-50 text-green-700 border border-green-200">
                        <AlertCircle className="h-4 w-4 shrink-0" />{success}
                      </motion.div>
                    )}
                    <button type="submit" disabled={forgotLoading}
                      className="w-full py-3.5 btn-gold rounded-xl font-bold text-base flex items-center justify-center gap-2 disabled:opacity-60 transition-all">
                      {forgotLoading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                      Send Reset Link
                    </button>
                    <button type="button" onClick={handleBackToLogin}
                      className="w-full py-2.5 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:border-blue-300 hover:text-blue-600 transition-colors">
                      <ArrowLeft className="h-4 w-4" />Back to Sign In
                    </button>
                  </form>
                )}

                {/* ── FORGOT PASSWORD step 2: check email ───────────────── */}
                {forgotStep === 'code' && (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
                      <Mail className="h-8 w-8 text-blue-600" />
                    </div>
                    <p className="text-gray-700 font-semibold">Reset link sent!</p>
                    <p className="text-gray-500 text-sm leading-relaxed">
                      Click the link in your email to set a new password. It expires in 1 hour.
                    </p>
                    <p className="text-gray-400 text-xs">Didn't receive it? Check your spam folder.</p>
                    <button type="button" onClick={() => { setForgotStep('email'); setErrors({}); setSuccess(''); }}
                      className="w-full py-2.5 text-blue-600 text-sm font-semibold hover:underline">
                      Send another link
                    </button>
                    <button type="button" onClick={handleBackToLogin}
                      className="w-full py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:border-blue-300 hover:text-blue-600 transition-colors">
                      Back to Sign In
                    </button>
                  </div>
                )}

              </div>{/* end scrollable body */}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;
