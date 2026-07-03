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
import { siteSettingsApi } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, Eye, EyeOff, Save, RefreshCw, Bell,
  MessageSquare, BarChart2, Layout, Palette,
  AlertCircle, CheckCircle, Globe, Zap,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const SETTINGS_KEY = 'ng_admin_site_settings';

const defaultSettings = {
  tenderBanner:      { enabled: true,  text: 'Live Tenders Available — Click to View' },
  socialProof:       { enabled: true,  intervalSecs: 14 },
  exitPopup:         { enabled: true,  couponCode: 'NAVGROW10', discountPct: 10 },
  mobileContactBar:  { enabled: true,  showAfterSecs: 2 },
  chatbot:           { enabled: true,  proactiveAfterSecs: 45, greeting: '' },
  maintenance:       { enabled: false, message: 'Site under maintenance. Back soon!' },
  announcementBar:   { enabled: false, text: '', type: 'info' },  // 'info' | 'success' | 'warning'
  shopSettings:      { freeShippingThreshold: 5000, showStockBadge: true, enableWishlist: true },
};

const Toggle = ({ value, onChange, label, sub }) => (
  <div className="flex items-center justify-between gap-4 py-3">
    <div>
      <p className="text-sm font-semibold text-white">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
    <button onClick={() => onChange(!value)}
      className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${value ? 'bg-blue-600' : 'bg-gray-600'}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-6' : ''}`}/>
    </button>
  </div>
);

const Field = ({ label, sub, type='text', value, onChange, placeholder }) => (
  <div className="mt-3">
    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">{label}</label>
    {sub && <p className="text-xs text-gray-500 mb-1.5">{sub}</p>}
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white
                 focus:outline-none focus:border-blue-500 placeholder-gray-600"/>
  </div>
);

const Card = ({ icon: Icon, title, color='text-blue-400', children }) => (
  <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
    <div className="flex items-center gap-2.5 mb-4 pb-4 border-b border-gray-700">
      <Icon className={`h-5 w-5 ${color}`}/>
      <h3 className="font-bold text-white text-sm">{title}</h3>
    </div>
    {children}
  </div>
);

const AdminSettings = () => {
  const { toast } = useToast();
  const [s, setS] = useState(() => {
    try { return { ...defaultSettings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; }
    catch { return defaultSettings; }
  });
  const [saved, setSaved] = useState(false);

  const set = (section, key, val) => setS(prev => ({
    ...prev, [section]: { ...prev[section], [key]: val }
  }));

  const save = async () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    // Dispatch event so components re-read settings live
    window.dispatchEvent(new CustomEvent('ng:settings-updated', { detail: s }));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    // Persist to backend so settings apply for ALL visitors (not just this browser)
    try {
      await siteSettingsApi.save(JSON.stringify(s));
      toast({ title: '✓ Settings saved', description: 'Live for all visitors.' });
    } catch {
      toast({ title: '✓ Saved locally', description: 'Could not reach server — applies on this device only.' });
    }
  };

  const reset = () => {
    setS(defaultSettings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
    toast({ title: 'Settings reset to defaults' });
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <Settings className="h-6 w-6 text-blue-400"/> Site Settings
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Control frontend features and UI elements in real-time</p>
        </div>
        <div className="flex gap-2">
          <button onClick={reset}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-sm font-semibold transition-colors">
            <RefreshCw className="h-3.5 w-3.5"/> Reset Defaults
          </button>
          <button onClick={save}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all ${saved ? 'bg-green-600 text-white' : 'brand-gradient text-white hover:opacity-90'}`}>
            {saved ? <><CheckCircle className="h-4 w-4"/> Saved!</> : <><Save className="h-4 w-4"/> Save Changes</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Announcement Bar */}
        <Card icon={Bell} title="Announcement Bar" color="text-amber-400">
          <Toggle value={s.announcementBar.enabled} onChange={v=>set('announcementBar','enabled',v)}
            label="Show Announcement Bar" sub="Top banner above the header for urgent notices"/>
          {s.announcementBar.enabled && (
            <>
              <Field label="Message Text" value={s.announcementBar.text}
                onChange={v=>set('announcementBar','text',v)}
                placeholder="🚀 Free shipping on orders above ₹5,000 this month!"/>
              <div className="mt-3">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Type</label>
                <div className="flex gap-2">
                  {['info','success','warning'].map(t=>(
                    <button key={t} onClick={()=>set('announcementBar','type',t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
                        s.announcementBar.type===t ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}>{t}</button>
                  ))}
                </div>
              </div>
            </>
          )}
        </Card>

        {/* Tender Banner */}
        <Card icon={Layout} title="Tender Banner (Top Ticker)" color="text-blue-400">
          <Toggle value={s.tenderBanner.enabled} onChange={v=>set('tenderBanner','enabled',v)}
            label="Show Tender Banner" sub="Scrolling ticker showing live tenders"/>
          {s.tenderBanner.enabled && (
            <Field label="Custom ticker prefix text" value={s.tenderBanner.text}
              onChange={v=>set('tenderBanner','text',v)}
              placeholder="Live Tenders Available — Click to View"/>
          )}
        </Card>

        {/* Exit Popup */}
        <Card icon={Zap} title="Exit Intent Popup" color="text-green-400">
          <Toggle value={s.exitPopup.enabled} onChange={v=>set('exitPopup','enabled',v)}
            label="Enable Exit Intent Popup" sub="Shows discount offer when user moves cursor to leave"/>
          {s.exitPopup.enabled && (
            <>
              <Field label="Coupon Code" value={s.exitPopup.couponCode}
                onChange={v=>set('exitPopup','couponCode',v)} placeholder="NAVGROW10"/>
              <Field label="Discount %" type="number" value={s.exitPopup.discountPct}
                onChange={v=>set('exitPopup','discountPct',v)} placeholder="10"/>
            </>
          )}
        </Card>

        {/* Social Proof */}
        <Card icon={BarChart2} title="Social Proof Notifications" color="text-purple-400">
          <Toggle value={s.socialProof.enabled} onChange={v=>set('socialProof','enabled',v)}
            label="Show Live Activity Notifications" sub="Bottom-left popups showing orders, reviews, inquiries"/>
          {s.socialProof.enabled && (
            <Field label="Interval (seconds)" type="number" value={s.socialProof.intervalSecs}
              onChange={v=>set('socialProof','intervalSecs',parseInt(v)||14)} placeholder="14"/>
          )}
        </Card>

        {/* Mobile Contact Bar */}
        <Card icon={Globe} title="Mobile Contact Bar" color="text-cyan-400">
          <Toggle value={s.mobileContactBar.enabled} onChange={v=>set('mobileContactBar','enabled',v)}
            label="Show Mobile Sticky Bar" sub="Bottom bar on mobile with Call, WhatsApp, Quote buttons"/>
          {s.mobileContactBar.enabled && (
            <Field label="Show after (seconds)" type="number" value={s.mobileContactBar.showAfterSecs}
              onChange={v=>set('mobileContactBar','showAfterSecs',parseInt(v)||2)} placeholder="2"/>
          )}
        </Card>

        {/* ChatBot */}
        <Card icon={MessageSquare} title="NavBot ChatBot" color="text-blue-400">
          <Toggle value={s.chatbot.enabled} onChange={v=>set('chatbot','enabled',v)}
            label="Enable NavBot" sub="AI chat assistant (bottom-left floating button)"/>
          {s.chatbot.enabled && (
            <Field label="Proactive badge after (seconds)" type="number"
              value={s.chatbot.proactiveAfterSecs}
              onChange={v=>set('chatbot','proactiveAfterSecs',parseInt(v)||45)} placeholder="45"/>
          )}
        </Card>

        {/* Shop Settings */}
        <Card icon={Palette} title="Shop Settings" color="text-amber-400">
          <Field label="Free Shipping Threshold (₹)" type="number"
            value={s.shopSettings.freeShippingThreshold}
            onChange={v=>set('shopSettings','freeShippingThreshold',parseInt(v)||5000)} placeholder="5000"/>
          <div className="mt-3">
            <Toggle value={s.shopSettings.showStockBadge} onChange={v=>set('shopSettings','showStockBadge',v)}
              label="Show Stock Level Badge" sub="Show 'Only 3 left' on products"/>
            <Toggle value={s.shopSettings.enableWishlist} onChange={v=>set('shopSettings','enableWishlist',v)}
              label="Enable Wishlist Feature" sub="Allow users to save products to wishlist"/>
          </div>
        </Card>

        {/* Maintenance Mode */}
        <Card icon={AlertCircle} title="Maintenance Mode" color="text-red-400">
          <Toggle value={s.maintenance.enabled} onChange={v=>set('maintenance','enabled',v)}
            label="Enable Maintenance Mode"
            sub="⚠ Shows maintenance message to all non-admin visitors"/>
          {s.maintenance.enabled && (
            <Field label="Maintenance Message" value={s.maintenance.message}
              onChange={v=>set('maintenance','message',v)}
              placeholder="Site under maintenance. We'll be back shortly."/>
          )}
          {s.maintenance.enabled && (
            <div className="mt-3 p-3 bg-red-950/50 border border-red-800/50 rounded-xl">
              <p className="text-xs text-red-300 font-semibold">⚠ Maintenance mode is ON. Public visitors see the maintenance page. Admins see the site normally.</p>
            </div>
          )}
        </Card>

      </div>

      <div className="mt-6 p-4 bg-blue-950/30 border border-blue-800/30 rounded-2xl">
        <p className="text-xs text-blue-300 font-semibold">ℹ️ Settings are stored in localStorage and dispatched via browser events. For production, connect to a backend settings API to persist across devices and users.</p>
      </div>
    </div>
  );
};

export default AdminSettings;
export { SETTINGS_KEY, defaultSettings };
