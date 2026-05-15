import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X, Settings, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

const COOKIE_KEY = 'navgrow_cookie_consent';

const CookieBanner = () => {
  const [visible, setVisible]   = useState(false);
  const [showDetail, setDetail] = useState(false);
  const [prefs, setPrefs]       = useState({ analytics: true, marketing: false });

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_KEY);
    if (!stored) setTimeout(() => setVisible(true), 1500);
  }, []);

  const accept = (all = true) => {
    localStorage.setItem(COOKIE_KEY, JSON.stringify(all ? { analytics: true, marketing: true } : prefs));
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-[200]"
        >
          <div className="bg-gray-950 rounded-3xl shadow-2xl border border-gray-800 overflow-hidden">
            {!showDetail ? (
              <div className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600/20 flex items-center justify-center shrink-0">
                    <Cookie className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1">We use cookies</h4>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      We use cookies to improve your experience. See our{' '}
                      <Link to="/privacy" onClick={() => setVisible(false)} className="text-blue-400 hover:text-blue-300 underline">Privacy Policy</Link>.
                    </p>
                  </div>
                  <button onClick={() => setVisible(false)} className="text-gray-600 hover:text-gray-400 shrink-0 mt-0.5">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => accept(true)} className="flex-1 py-2.5 btn-gold font-bold rounded-xl text-sm hover:opacity-90">
                    Accept All
                  </button>
                  <button onClick={() => setDetail(true)} className="flex items-center gap-1 px-3 py-2.5 border border-gray-700 text-gray-300 rounded-xl text-sm hover:border-gray-500">
                    <Settings className="h-4 w-4" /> Manage
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5">
                <h4 className="font-bold text-white mb-4 flex items-center gap-2"><Settings className="h-4 w-4 text-blue-400" /> Cookie Preferences</h4>
                {[
                  { id: 'essential', label: 'Essential', desc: 'Required for the website to function.', locked: true },
                  { id: 'analytics', label: 'Analytics', desc: 'Help us understand how visitors use the site.' },
                  { id: 'marketing', label: 'Marketing', desc: 'Personalised ads and remarketing.' },
                ].map(({ id, label, desc, locked }) => (
                  <div key={id} className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0">
                    <div>
                      <p className="text-white text-sm font-semibold">{label}</p>
                      <p className="text-gray-500 text-xs">{desc}</p>
                    </div>
                    {locked ? (
                      <div className="w-9 h-5 rounded-full bg-blue-600 flex items-center justify-end pr-1">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    ) : (
                      <button
                        onClick={() => setPrefs(p => ({ ...p, [id]: !p[id] }))}
                        className={`w-9 h-5 rounded-full transition-colors relative ${prefs[id] ? 'bg-blue-600' : 'bg-gray-700'}`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${prefs[id] ? 'left-4' : 'left-0.5'}`} />
                      </button>
                    )}
                  </div>
                ))}
                <div className="flex gap-2 mt-4">
                  <button onClick={() => accept(false)} className="flex-1 py-2.5 btn-gold font-bold rounded-xl text-sm">Save Preferences</button>
                  <button onClick={() => setDetail(false)} className="px-4 py-2.5 border border-gray-700 text-gray-300 rounded-xl text-sm hover:border-gray-500">Back</button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieBanner;
