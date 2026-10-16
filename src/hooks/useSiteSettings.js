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
import { useState, useEffect } from 'react';
import { siteSettingsApi } from '@/lib/api';

const SETTINGS_KEY = 'ng_admin_site_settings';

export const defaultSettings = {
  tenderBanner:    { enabled: true,  text: 'Live Tenders Available — Click to View' },
  socialProof:     { enabled: true,  intervalSecs: 14 },
  exitPopup:       { enabled: true,  couponCode: 'NAVGROW10', discountPct: 10 },
  mobileContactBar:{ enabled: true,  showAfterSecs: 2 },
  chatbot:         { enabled: true,  proactiveAfterSecs: 45, greeting: '' },
  maintenance:     { enabled: false, message: 'Site under maintenance. Back soon!' },
  announcementBar: { enabled: false, text: '', type: 'info' },
  shopSettings:    { freeShippingThreshold: 5000, showStockBadge: true, enableWishlist: true },
};

const loadSettings = () => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(stored) };
  } catch {
    return defaultSettings;
  }
};

/*
 * One request shared by every component on the page. Five widgets use this
 * hook (banner, announcement bar, social proof, contact bar, exit popup) and
 * each used to fetch /site-settings on its own — five identical calls per page.
 */
const SHARE_MS = 60_000;
let shared = null;               // { at, promise }
const fetchSettingsShared = () => {
  const now = Date.now();
  if (shared && now - shared.at < SHARE_MS) return shared.promise;
  const promise = siteSettingsApi.get().catch((err) => { shared = null; throw err; });
  shared = { at: now, promise };
  return promise;
};

/**
 * useSiteSettings — reads site settings from localStorage and re-fires when:
 * 1. Admin saves settings (CustomEvent: ng:settings-updated)
 * 2. localStorage changes in another tab (StorageEvent)
 *
 * Components should use this hook instead of reading localStorage directly.
 */
export const useSiteSettings = () => {
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    const handleCustom = (e) => {
      shared = null;             // the admin just saved — next read goes to the server
      if (e.detail) setSettings({ ...defaultSettings, ...e.detail });
      else setSettings(loadSettings());
    };
    const handleStorage = (e) => {
      if (e.key === SETTINGS_KEY) setSettings(loadSettings());
    };
    window.addEventListener('ng:settings-updated', handleCustom);
    window.addEventListener('storage', handleStorage);

    // Sync from backend so settings apply globally (not just the admin's browser)
    let cancelled = false;
    fetchSettingsShared()
      .then(({ data }) => {
        if (cancelled || !data?.settings) return;
        let parsed = {};
        try { parsed = typeof data.settings === 'string' ? JSON.parse(data.settings) : data.settings; }
        catch { parsed = {}; }
        if (parsed && Object.keys(parsed).length) {
          const merged = { ...defaultSettings, ...parsed };
          try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed)); } catch {}
          setSettings(merged);
        }
      })
      .catch(() => { /* offline / not configured — fall back to localStorage */ });

    return () => {
      cancelled = true;
      window.removeEventListener('ng:settings-updated', handleCustom);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return settings;
};

export default useSiteSettings;
