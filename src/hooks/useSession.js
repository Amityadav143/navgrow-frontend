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
/**
 * useSession — Complete session management for Navgrow Engineering
 *
 * Features:
 *  - Idle timeout with configurable duration (default 30 min)
 *  - Activity tracking (mouse, keyboard, touch, scroll)
 *  - 5-minute countdown warning before session expires
 *  - "Remember me" support — extends timeout to 7 days
 *  - Multi-tab sync via StorageEvent
 *  - Force logout across all open tabs
 *  - Session events: session:warning, session:expired, session:refreshed
 */
import { useEffect, useRef, useCallback, useState } from 'react';

const IDLE_KEY         = 'ng_last_activity';
const SESSION_OPT_KEY  = 'ng_session_options';
const DEFAULT_TIMEOUT  = 30 * 60 * 1000;    // 30 minutes
const REMEMBER_TIMEOUT = 7  * 24 * 60 * 60 * 1000; // 7 days
const WARNING_BEFORE   = 5  * 60 * 1000;    // warn 5 minutes before expiry
const ACTIVITY_EVENTS  = ['mousedown','mousemove','keydown','touchstart','scroll','click','wheel'];
const CHECK_INTERVAL   = 30 * 1000;         // check every 30 seconds

export const setRememberMe = (enabled) => {
  try { localStorage.setItem(SESSION_OPT_KEY, JSON.stringify({ rememberMe: enabled })); } catch {}
};

export const getRememberMe = () => {
  try {
    const s = localStorage.getItem(SESSION_OPT_KEY);
    return s ? JSON.parse(s).rememberMe : false;
  } catch { return false; }
};

const getTimeout = () => getRememberMe() ? REMEMBER_TIMEOUT : DEFAULT_TIMEOUT;

export const recordActivity = () => {
  try { localStorage.setItem(IDLE_KEY, Date.now().toString()); } catch {}
};

export const clearSession = () => {
  try {
    localStorage.removeItem(IDLE_KEY);
    localStorage.removeItem(SESSION_OPT_KEY);
  } catch {}
};

/**
 * @param {Object} opts
 * @param {Function} opts.onExpire  — called when session expires
 * @param {boolean}  opts.enabled   — only run when user is logged in
 */
export function useSession({ onExpire, enabled = true } = {}) {
  const [secondsLeft, setSecondsLeft] = useState(null); // null = not warning
  const [warning,     setWarning]     = useState(false);
  const checkRef    = useRef(null);
  const onExpireRef = useRef(onExpire);

  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);

  // ── Record user activity ──────────────────────────────────────────────────
  const handleActivity = useCallback(() => { recordActivity(); }, []);

  // ── Heartbeat check ───────────────────────────────────────────────────────
  const checkIdle = useCallback(() => {
    if (!enabled) return;
    const last    = parseInt(localStorage.getItem(IDLE_KEY) || '0', 10);
    const now     = Date.now();
    const timeout = getTimeout();
    const elapsed = now - last;
    const remaining = timeout - elapsed;

    if (remaining <= 0) {
      // Session expired
      setWarning(false); setSecondsLeft(null);
      onExpireRef.current?.();
      clearSession();
      return;
    }

    if (remaining <= WARNING_BEFORE) {
      // In warning zone
      const secs = Math.ceil(remaining / 1000);
      setWarning(true); setSecondsLeft(secs);
    } else {
      setWarning(false); setSecondsLeft(null);
    }
  }, [enabled]);

  const extendSession = useCallback(() => {
    recordActivity();
    setWarning(false); setSecondsLeft(null);
  }, []);

  // ── Multi-tab sync — if another tab logs out, expire here too ────────────
  useEffect(() => {
    if (!enabled) return;
    const handleStorage = (e) => {
      if (e.key === 'ng_access_token' && !e.newValue) {
        // Token removed in another tab → expire here
        onExpireRef.current?.();
      }
      if (e.key === IDLE_KEY && e.newValue) {
        // Activity in another tab — reset warning
        checkIdle();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [enabled, checkIdle]);

  // ── Activity listeners ────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, handleActivity, { passive: true }));
    return () => ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, handleActivity));
  }, [enabled, handleActivity]);

  // ── Periodic check ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    // Init last activity if not set
    if (!localStorage.getItem(IDLE_KEY)) recordActivity();
    checkRef.current = setInterval(checkIdle, CHECK_INTERVAL);
    checkIdle(); // immediate check
    return () => clearInterval(checkRef.current);
  }, [enabled, checkIdle]);

  return { warning, secondsLeft, extendSession };
}

export default useSession;
