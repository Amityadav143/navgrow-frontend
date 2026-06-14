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
 * SessionWarningModal — shows a countdown before session expires.
 * Gives user choice: "Stay Logged In" (extends session) or "Logout Now".
 */
import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ShieldAlert, LogOut, RefreshCw } from 'lucide-react';

const fmt = (secs) => {
  if (secs <= 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const SessionWarningModal = ({ secondsLeft, onExtend, onLogout }) => {
  const pct  = Math.min(100, Math.max(0, (secondsLeft / 300) * 100)); // 300s = 5 min
  const urgent = secondsLeft <= 60;

  // Accessibility: announce urgency via live region
  const liveRef = useRef(null);
  useEffect(() => {
    if (liveRef.current) {
      liveRef.current.textContent = `Session expires in ${fmt(secondsLeft)}`;
    }
  }, [Math.floor(secondsLeft / 30)]); // announce every 30s

  return (
    <AnimatePresence>
      {secondsLeft > 0 && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm z-[200]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -20 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="session-warning-title"
          >
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-sm overflow-hidden">

              {/* Header */}
              <div className={`px-6 pt-6 pb-4 flex flex-col items-center text-center ${urgent ? 'bg-red-50' : 'bg-amber-50'}`}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                  urgent ? 'bg-red-100' : 'bg-amber-100'
                }`}>
                  {urgent
                    ? <ShieldAlert className="h-8 w-8 text-red-600 animate-pulse"/>
                    : <Clock className="h-8 w-8 text-amber-600"/>
                  }
                </div>
                <h2 id="session-warning-title" className="text-xl font-extrabold text-gray-900 mb-1">
                  Session Expiring
                </h2>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Your session will expire due to inactivity. You will be logged out automatically.
                </p>
              </div>

              {/* Countdown */}
              <div className="px-6 py-5">
                {/* Progress ring */}
                <div className="flex items-center justify-center mb-4">
                  <div className="relative w-24 h-24">
                    <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                      <circle cx="48" cy="48" r="40"
                        fill="none" stroke="#f3f4f6" strokeWidth="8"/>
                      <circle cx="48" cy="48" r="40"
                        fill="none"
                        stroke={urgent ? '#dc2626' : '#d97706'}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - pct / 100)}`}
                        style={{ transition: 'stroke-dashoffset 1s linear' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-2xl font-black tabular-nums ${urgent ? 'text-red-600' : 'text-amber-600'}`}>
                        {fmt(secondsLeft)}
                      </span>
                    </div>
                  </div>
                </div>

                <p className={`text-center text-sm font-semibold mb-5 ${urgent ? 'text-red-600' : 'text-amber-700'}`}>
                  {urgent ? '⚠️ Less than 1 minute remaining!' : 'Time remaining before automatic logout'}
                </p>

                {/* Actions */}
                <div className="space-y-3">
                  <button
                    onClick={onExtend}
                    className="w-full py-3.5 brand-gradient text-white font-bold rounded-2xl shadow-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-sm"
                  >
                    <RefreshCw className="h-4 w-4"/> Stay Logged In
                  </button>
                  <button
                    onClick={onLogout}
                    className="w-full py-3.5 border-2 border-gray-200 text-gray-600 font-semibold rounded-2xl hover:border-red-200 hover:text-red-600 hover:bg-red-50 transition-all text-sm flex items-center justify-center gap-2"
                  >
                    <LogOut className="h-4 w-4"/> Logout Now
                  </button>
                </div>

                <p className="text-xs text-gray-400 text-center mt-4">
                  Moving the mouse or pressing a key also extends your session.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Accessibility live region */}
          <div ref={liveRef} aria-live="polite" aria-atomic="true" className="sr-only"/>
        </>
      )}
    </AnimatePresence>
  );
};

export default SessionWarningModal;
