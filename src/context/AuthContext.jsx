/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 · navgrow.org · info@navgrow.org
 * Unauthorised reproduction, modification or distribution is strictly prohibited.
 */
/**
 * AuthContext — Authentication + Session Management
 *
 * Session features:
 *  - Idle timeout (30 min default, 7 days with "remember me")
 *  - 5-minute countdown warning modal
 *  - Activity tracking (mouse / keyboard / touch)
 *  - Multi-tab sync (logout in one tab → logout in all)
 *  - Force-logout on 401 / token refresh failure
 */
import React, {
  createContext, useContext, useState, useEffect,
  useCallback, useRef,
} from 'react';
import { authApi, userApi } from '@/lib/api';
import { useSession, recordActivity, clearSession, setRememberMe, getRememberMe } from '@/hooks/useSession';
import SessionWarningModal from '@/components/SessionWarningModal';

const AuthContext = createContext(null);

const TOKEN_KEY   = 'ng_access_token';
const REFRESH_KEY = 'ng_refresh_token';
const USER_KEY    = 'ng_user';

const parseRoles = (roles) => {
  if (!Array.isArray(roles)) return [];
  return roles.map(r => {
    if (typeof r === 'string') return r;
    if (r?.authority) return r.authority;
    return '';
  }).filter(Boolean);
};

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)) || null; }
    catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const isLoggedIn = !!user;
  const isAdmin   = user?.isAdmin   || false;
  const isManager = user?.isManager || false;
  const isEditor  = user?.isEditor  || false;

  // ── Session management ────────────────────────────────────────────────────
  const handleSessionExpire = useCallback(() => {
    // Soft logout — don't show login modal, just clear and redirect
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    clearSession();
    setUser(null);
  }, []);

  const { warning, secondsLeft, extendSession } = useSession({
    enabled: isLoggedIn,
    onExpire: handleSessionExpire,
  });

  // ── Forced logout event (from token refresh failure in api.js) ─────────────
  useEffect(() => {
    const handler = () => handleSessionExpire();
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, [handleSessionExpire]);

  // ── Fetch full profile after login ────────────────────────────────────────
  const enrichUser = useCallback(async (base) => {
    try {
      const { data } = await userApi.profile();
      return {
        ...base,
        fullName:  data.fullName  || base.fullName  || '',
        phone:     data.phone     || '',
        avatarUrl: data.avatarUrl || base.avatarUrl || '',
        company:   data.company   || '',
        city:      data.city      || '',
        state:     data.state     || '',
        bio:       data.bio       || '',
      };
    } catch { return base; }
  }, []);

  // ── Login ─────────────────────────────────────────────────────────────────
  // ── Apply a session from a token response (e.g. OTP login, OAuth) ──────────
  const applySession = useCallback(async (data) => {
    if (!data || !data.accessToken) return { success: false };
    localStorage.setItem(TOKEN_KEY,   data.accessToken);
    localStorage.setItem(REFRESH_KEY, data.refreshToken);
    recordActivity();

    const roles = parseRoles(data.roles);
    const userData = {
      email:     data.email    || '',
      fullName:  data.fullName || '',
      avatarUrl: data.avatarUrl || '',
      roles,
      isAdmin:   roles.some(r => r === 'ROLE_ADMIN'),
      isManager: roles.some(r => r === 'ROLE_MANAGER'),
      isEditor:  roles.some(r => r === 'ROLE_EDITOR'),
    };
    const enriched = await enrichUser(userData);
    localStorage.setItem(USER_KEY, JSON.stringify(enriched));
    setUser(enriched);
    return { success: true };
  }, [enrichUser]);

  const login = useCallback(async (emailOrPhone, password, rememberMe = false) => {
    setLoading(true); setError(null);
    try {
      const isPhone = /^[+]?[0-9]{10,13}$/.test(emailOrPhone.replace(/\s/g, ''));
      const { data } = isPhone
        ? await authApi.loginWithPhone(emailOrPhone.replace(/\s/g, ''), password)
        : await authApi.login(emailOrPhone, password);

      localStorage.setItem(TOKEN_KEY,   data.accessToken);
      localStorage.setItem(REFRESH_KEY, data.refreshToken);
      setRememberMe(rememberMe);
      recordActivity();

      const roles    = parseRoles(data.roles);
      const userData = {
        email:     data.email    || emailOrPhone,
        fullName:  data.fullName || '',
        avatarUrl: data.avatarUrl || '',
        roles,
        isAdmin:   roles.some(r => r === 'ROLE_ADMIN'),
        isManager: roles.some(r => r === 'ROLE_MANAGER'),
        isEditor:  roles.some(r => r === 'ROLE_EDITOR'),
      };

      const enriched = await enrichUser(userData);
      localStorage.setItem(USER_KEY, JSON.stringify(enriched));
      setUser(enriched);
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(msg);
      return { success: false, error: msg };
    } finally { setLoading(false); }
  }, [enrichUser]);

  // ── Register ──────────────────────────────────────────────────────────────
  const register = useCallback(async (data) => {
    setLoading(true); setError(null);
    try {
      await authApi.register(data);
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed.';
      setError(msg);
      return { success: false, error: msg };
    } finally { setLoading(false); }
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    try { authApi.logout().catch(() => {}); } catch {}
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    clearSession();
    setUser(null); setError(null);
  }, []);

  // ── Refresh user data (called after profile update) ───────────────────────
  const refreshUser = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const { data } = await userApi.profile();
      const current  = JSON.parse(localStorage.getItem(USER_KEY) || '{}');
      const updated  = { ...current, ...data };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      setUser(updated);
    } catch {}
  }, [isLoggedIn]);

  return (
    <AuthContext.Provider value={{
      user, loading, error, isLoggedIn,
      isAdmin, isManager, isEditor,
      login, register, logout, refreshUser, applySession,
      clearError: () => setError(null),
    }}>
      {children}

      {/* Session expiry warning modal — shown when session is about to expire */}
      {warning && secondsLeft > 0 && (
        <SessionWarningModal
          secondsLeft={secondsLeft}
          onExtend={() => { extendSession(); recordActivity(); }}
          onLogout={logout}
        />
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

export default AuthContext;
