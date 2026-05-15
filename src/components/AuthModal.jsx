import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, EyeOff, Mail, Lock, User, Phone, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const AuthModal = ({ open, onClose, defaultTab = 'login' }) => {
  const { login, register, forgotPassword, loading, error, clearError } = useAuth();
  const [tab, setTab]         = useState(defaultTab);
  const [showPw, setShowPw]   = useState(false);
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', phone: '', confirmPassword: '',
  });

  const ch = (k) => (e) => {
    clearError();
    setSuccess('');
    setForm(p => ({ ...p, [k]: e.target.value }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const res = await login(form.email, form.password);
    if (res.success) onClose();
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) return;
    const res = await register({ fullName: form.fullName, email: form.email, password: form.password, phone: form.phone });
    if (res.success) {
      setSuccess('Account created! Please log in.');
      setTab('login');
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    const res = await forgotPassword(form.email);
    if (res.success) setSuccess('Password reset link sent to your email.');
  };

  const inputCls = 'w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors bg-white';

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[150] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}>

            {/* Header */}
            <div className="brand-gradient p-6 text-center relative">
              <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30">
                <X className="h-4 w-4" />
              </button>
              <img src="/ng_white_logo.png" alt="Navgrow" className="h-10 w-auto object-contain mx-auto mb-2" />
              <p className="text-blue-100 text-sm">
                {tab === 'login' ? 'Welcome back' : tab === 'register' ? 'Create your account' : 'Reset your password'}
              </p>
            </div>

            {/* Tabs */}
            {tab !== 'forgot' && (
              <div className="flex border-b border-gray-100">
                {[['login','Sign In'],['register','Register']].map(([t, l]) => (
                  <button key={t} onClick={() => { setTab(t); clearError(); setSuccess(''); }}
                    className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === t ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                    {l}
                  </button>
                ))}
              </div>
            )}

            <div className="p-6">
              {/* Error / Success */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl mb-4 text-sm text-green-700">
                  <CheckCircle className="h-4 w-4 shrink-0" /> {success}
                </div>
              )}

              {/* Login Form */}
              {tab === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                    <input type="email" required placeholder="Email address" value={form.email} onChange={ch('email')} className={inputCls} />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                    <input type={showPw ? 'text' : 'password'} required placeholder="Password" value={form.password} onChange={ch('password')} className={inputCls + ' pr-10'} />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="text-right">
                    <button type="button" onClick={() => setTab('forgot')} className="text-xs text-blue-600 hover:underline">
                      Forgot password?
                    </button>
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full py-3 btn-gold font-bold rounded-xl hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2">
                    {loading ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                    {loading ? 'Signing in…' : 'Sign In'}
                  </button>
                </form>
              )}

              {/* Register Form */}
              {tab === 'register' && (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                    <input required placeholder="Full name" value={form.fullName} onChange={ch('fullName')} className={inputCls} />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                    <input type="email" required placeholder="Email address" value={form.email} onChange={ch('email')} className={inputCls} />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                    <input type="tel" placeholder="Phone number" value={form.phone} onChange={ch('phone')} className={inputCls} />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                    <input type={showPw ? 'text' : 'password'} required minLength={8} placeholder="Password (min 8 chars)" value={form.password} onChange={ch('password')} className={inputCls} />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                    <input type="password" required placeholder="Confirm password" value={form.confirmPassword} onChange={ch('confirmPassword')} className={inputCls} />
                    {form.confirmPassword && form.password !== form.confirmPassword && (
                      <p className="text-xs text-red-500 mt-1">Passwords don't match</p>
                    )}
                  </div>
                  <button type="submit" disabled={loading || (form.confirmPassword && form.password !== form.confirmPassword)}
                    className="w-full py-3 btn-gold font-bold rounded-xl hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2">
                    {loading ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                    {loading ? 'Creating account…' : 'Create Account'}
                  </button>
                </form>
              )}

              {/* Forgot Password */}
              {tab === 'forgot' && (
                <form onSubmit={handleForgot} className="space-y-4">
                  <p className="text-sm text-gray-500 mb-2">Enter your email and we'll send a password reset link.</p>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                    <input type="email" required placeholder="Email address" value={form.email} onChange={ch('email')} className={inputCls} />
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full py-3 btn-gold font-bold rounded-xl hover:opacity-90 disabled:opacity-60">
                    {loading ? 'Sending…' : 'Send Reset Link'}
                  </button>
                  <button type="button" onClick={() => setTab('login')} className="w-full text-sm text-gray-500 hover:text-gray-700">
                    ← Back to Sign In
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;
