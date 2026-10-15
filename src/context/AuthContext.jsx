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

// Normalise a permission list (array of names or GrantedAuthority objects,
// possibly "PERM_"-prefixed) into a clean Set of bare permission names.
const parsePermissions = (perms) => {
  const out = new Set();
  if (Array.isArray(perms)) {
    perms.forEach(p => {
      const v = typeof p === 'string' ? p : (p?.authority || '');
      if (v) out.add(v.replace(/^PERM_/, '').toUpperCase());
    });
  }
  return out;
};

// Derive the role booleans + effective permission set from a role list and an
// explicit permissions list. SUPER_ADMIN and ADMIN implicitly get everything;
// MANAGER / EDITOR get their role baseline plus any custom grants.
const deriveFlags = (roles, permsList) => {
  const isSuperAdmin = roles.includes('ROLE_SUPER_ADMIN');
  const isAdmin      = roles.includes('ROLE_ADMIN');
  const isManager    = roles.includes('ROLE_MANAGER');
  const isEditor     = roles.includes('ROLE_EDITOR');
  let permissions = parsePermissions(permsList);
  if (isSuperAdmin || isAdmin) permissions = new Set(ALL_PERMISSIONS);
  else {
    if (isManager) ROLE_DEFAULT_PERMISSIONS.MANAGER.forEach(p => permissions.add(p));
    if (isEditor)  ROLE_DEFAULT_PERMISSIONS.EDITOR.forEach(p => permissions.add(p));
  }
  return {
    isSuperAdmin, isAdmin, isManager, isEditor,
    permissions: Array.from(permissions),
  };
};

// Keep in sync with com.navgrow.enums.Permission. Used so ADMIN/SUPER_ADMIN get
// the full set client-side even if the API didn't enumerate them.
export const ALL_PERMISSIONS = [
  'ORDERS','PRODUCTS','QUOTES','CATALOGUE_LEADS','TAX_RULES','DELIVERY_ZONES','RFQS','COUPONS',
  'MESSAGES','USERS','NEWS','PROJECTS','GALLERY','JOBS','TENDERS','CATALOG',
  'SETTINGS','NOTIFICATIONS','AUDIT',
];

// Sections each role gets WITHOUT a custom grant. Mirror of
// com.navgrow.enums.Permission#defaultsFor — keep the two in sync. A Super Admin
// can grant extra sections on top of these from Admin → Users → Access.
export const ROLE_DEFAULT_PERMISSIONS = {
  MANAGER: ['ORDERS','QUOTES','RFQS','MESSAGES','CATALOGUE_LEADS','TAX_RULES','DELIVERY_ZONES',
            'CATALOG','AUDIT','NEWS','PROJECTS','GALLERY','JOBS','TENDERS','SETTINGS'],
  EDITOR:  ['NEWS','PROJECTS','GALLERY','JOBS','TENDERS','SETTINGS'],
};

/** Can this (plain) user object reach the admin panel? Pure — usable right
 *  after login, before the context re-renders, to route staff to /admin. */
export const userCanAccessAdmin = (u) => !!(u && (
  u.isSuperAdmin || u.isAdmin || u.isManager || u.isEditor ||
  (Array.isArray(u.permissions) && u.permissions.length > 0)
));

/**
 * Build the client user object from the server profile (/users/me). The profile
 * is AUTHORITATIVE for role + permissions. Single source of truth used by login,
 * OAuth/OTP sessions, profile refresh and the on-load revalidation — so the role
 * flags can never drift between code paths again.
 */
export const buildUserFromProfile = (base, data) => {
  const roles = data?.role ? [`ROLE_${data.role}`] : (base?.roles || []);
  const perms = Array.isArray(data?.effectivePermissions) ? data.effectivePermissions : base?.permissions;
  return {
    ...(base || {}),
    email:     data?.email     || base?.email     || '',
    fullName:  data?.fullName  || base?.fullName  || '',
    phone:     data?.phone     || base?.phone     || '',
    avatarUrl: data?.avatarUrl || base?.avatarUrl || '',
    company:   data?.company   || base?.company   || '',
    city:      data?.city      || base?.city      || '',
    state:     data?.state     || base?.state     || '',
    bio:       data?.bio       || base?.bio       || '',
    role:      data?.role      || base?.role      || '',
    roles,
    ...deriveFlags(roles, perms),
  };
};

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)) || null; }
    catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  // False while a cached session is being re-checked with the server on load.
  // Admin screens wait for this instead of bouncing a just-promoted Super Admin
  // (whose cached role is stale) back to the home page.
  const [sessionChecked, setSessionChecked] = useState(() => {
    try { return !localStorage.getItem(TOKEN_KEY); } catch { return true; }
  });

  const isLoggedIn = !!user;
  const isSuperAdmin = user?.isSuperAdmin || false;
  const isAdmin   = user?.isAdmin   || false;
  const isManager = user?.isManager || false;
  const isEditor  = user?.isEditor  || false;
  const permissions = user?.permissions || [];
  // Can this user reach the admin panel at all? True for SUPER_ADMIN, ADMIN,
  // MANAGER, EDITOR, or anyone granted at least one custom permission. Use this
  // for every admin-panel entry point so a Super Admin (whose role is NOT ADMIN)
  // is never locked out of the dashboard.
  const canAccessAdmin = !!(user && (
    user.isSuperAdmin || user.isAdmin || user.isManager || user.isEditor ||
    (user.permissions || []).length > 0
  ));
  // can('ORDERS') — does the current user have access to a given admin area?
  // SUPER_ADMIN/ADMIN implicitly have all; MANAGER/EDITOR have their role
  // baseline (checked here too, so a session cached before an update still
  // works on first paint); anything else needs an explicit grant.
  const can = useCallback((perm) => {
    if (!perm) return false;
    if (user?.isSuperAdmin || user?.isAdmin) return true;
    const p = String(perm).toUpperCase();
    if (user?.isManager && ROLE_DEFAULT_PERMISSIONS.MANAGER.includes(p)) return true;
    if (user?.isEditor  && ROLE_DEFAULT_PERMISSIONS.EDITOR.includes(p))  return true;
    return (user?.permissions || []).includes(p);
  }, [user]);

  // ── Session management ────────────────────────────────────────────────────
  const handleSessionExpire = useCallback(() => {
    // Soft logout — don't show login modal, just clear and redirect
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    clearSession();
    setUser(null);
    setSessionChecked(true);
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
  // The profile is authoritative for role + permissions — without this, admins
  // signing in via Google/OTP would be stuck as plain users.
  const enrichUser = useCallback(async (base) => {
    try {
      const { data } = await userApi.profile();
      return buildUserFromProfile(base, data);
    } catch { return base; }
  }, []);

  // ── Revalidate the cached session against the server on every app load ─────
  // The user object is restored from localStorage, so without this a role change
  // (e.g. an account promoted to Super Admin) only took effect after a full
  // logout/login — the account kept showing "normal" customer access for days.
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) { setSessionChecked(true); return; }
    let cancelled = false;
    userApi.profile()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setUser(prev => {
          const next = buildUserFromProfile(prev, data);
          try { localStorage.setItem(USER_KEY, JSON.stringify(next)); } catch {}
          return next;
        });
      })
      .catch(() => { /* offline / expired: the 401 flow in api.js handles logout */ })
      .finally(() => { if (!cancelled) setSessionChecked(true); });
    return () => { cancelled = true; };
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
      ...deriveFlags(roles, data.permissions),
    };
    const enriched = await enrichUser(userData);
    localStorage.setItem(USER_KEY, JSON.stringify(enriched));
    setUser(enriched);
    setSessionChecked(true);
    return { success: true, user: enriched };
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
        ...deriveFlags(roles, data.permissions),
      };

      const enriched = await enrichUser(userData);
      localStorage.setItem(USER_KEY, JSON.stringify(enriched));
      setUser(enriched);
      setSessionChecked(true);
      return { success: true, user: enriched };
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
      const updated  = buildUserFromProfile(current, data);
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      setUser(updated);
    } catch {}
  }, [isLoggedIn]);

  return (
    <AuthContext.Provider value={{
      user, loading, error, isLoggedIn, sessionChecked,
      isSuperAdmin, isAdmin, isManager, isEditor, permissions, can, canAccessAdmin,
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
