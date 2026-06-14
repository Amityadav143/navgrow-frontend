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
      if (e.detail) setSettings({ ...defaultSettings, ...e.detail });
      else setSettings(loadSettings());
    };
    const handleStorage = (e) => {
      if (e.key === SETTINGS_KEY) setSettings(loadSettings());
    };
    window.addEventListener('ng:settings-updated', handleCustom);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('ng:settings-updated', handleCustom);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return settings;
};

export default useSiteSettings;
