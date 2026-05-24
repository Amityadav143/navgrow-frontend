import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, userApi } from '@/lib/api';

const AuthContext = createContext(null);

const TOKEN_KEY   = 'ng_access_token';
const REFRESH_KEY = 'ng_refresh_token';
const USER_KEY    = 'ng_user';

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)) || null; }
    catch (err) { console.warn('[AuthContext] Failed to parse stored user:', err); return null; }
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  // ── Listen for forced logout (token refresh failure) ──────────────────────
  useEffect(() => {
    const handleLogout = () => logout();
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await authApi.login(email, password);
      localStorage.setItem(TOKEN_KEY,   data.accessToken);
      localStorage.setItem(REFRESH_KEY, data.refreshToken);

      const userData = {
        email:    data.email,
        fullName: data.fullName || data.name || '',
        roles:    data.roles,
        isAdmin:   data.roles?.some(r => r.authority === 'ROLE_ADMIN'),
        isManager: data.roles?.some(r => r.authority === 'ROLE_MANAGER'),
        isEditor:  data.roles?.some(r => r.authority === 'ROLE_EDITOR'),
      };
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      setUser(userData);
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Register ──────────────────────────────────────────────────────────────
  const register = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      await authApi.register(data);
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setError(null);
  }, []);

  // ── Forgot password ───────────────────────────────────────────────────────
  const forgotPassword = useCallback(async (email) => {
    setLoading(true);
    try {
      await authApi.forgotPw(email);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to send reset email.' };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Reset password ────────────────────────────────────────────────────────
  const resetPassword = useCallback(async (token, password) => {
    setLoading(true);
    try {
      await authApi.resetPw(token, password);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Reset failed.' };
    } finally {
      setLoading(false);
    }
  }, []);

  const isLoggedIn = !!user;
  const isAdmin    = user?.isAdmin   || false;
  const isManager  = user?.isManager || user?.isAdmin || false;
  const isEditor   = user?.isEditor  || user?.isAdmin || user?.isManager || false;

  return (
    <AuthContext.Provider value={{
      user, loading, error, isLoggedIn, isAdmin, isManager, isEditor,
      login, register, logout, forgotPassword, resetPassword,
      clearError: () => setError(null),
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
