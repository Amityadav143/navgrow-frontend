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
import React, { useState, useEffect } from 'react';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Copy, Check, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const ExitIntentPopup = () => {
  const settings = useSiteSettings();
  const [show,    setShow]    = useState(false);
  const [copied,  setCopied]  = useState(false);
  const [done,    setDone]    = useState(false);

  useEffect(() => {
    if (!settings.exitPopup?.enabled) return;
    const dismissed = sessionStorage.getItem('ng_exit_dismissed');
    if (dismissed) return;

    const onMouseLeave = (e) => {
      if (e.clientY < 8) {   // cursor left viewport from top
        setShow(true);
        document.removeEventListener('mouseleave', onMouseLeave);
      }
    };

    // Only on desktop — mobile uses mobile bar
    const isMobile = window.innerWidth < 768;
    if (!isMobile) {
      const timer = setTimeout(() => {
        document.addEventListener('mouseleave', onMouseLeave);
      }, 30000); // only after 30s on page
      return () => { clearTimeout(timer); document.removeEventListener('mouseleave', onMouseLeave); };
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    setDone(true);
    sessionStorage.setItem('ng_exit_dismissed', '1');
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText('NAVGROW10'); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch {}
  };

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[200] backdrop-blur-sm" onClick={dismiss} />

          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 40 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-md w-full pointer-events-auto">
              {/* Header gradient */}
              <div className="brand-gradient px-6 py-5 relative">
                <button onClick={dismiss} className="absolute top-3 right-3 p-1.5 rounded-xl hover:bg-white/15 text-white/70 hover:text-white transition-colors">
                  <X className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Gift className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-white/80 text-sm font-medium">Wait! Before you go…</p>
                    <p className="text-white font-extrabold text-xl leading-tight">Get 10% Off Your First Order</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6">
                <p className="text-gray-600 text-sm mb-5 leading-relaxed">
                  Use code <strong className="text-blue-700">NAVGROW10</strong> at checkout to get <strong>10% off</strong> on
                  any order from our B2B engineering shop. ISI-certified products, pan-India delivery.
                </p>

                {/* Code box */}
                <div className="flex items-center gap-3 p-4 bg-blue-50 border-2 border-dashed border-blue-300 rounded-2xl mb-5">
                  <div className="flex-1">
                    <p className="text-xs text-blue-600 font-semibold uppercase tracking-widest mb-0.5">Discount Code</p>
                    <p className="text-2xl font-black text-blue-900 tracking-widest">NAVGROW10</p>
                  </div>
                  <button onClick={copy}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors">
                    {copied ? <><Check className="h-4 w-4" />Copied!</> : <><Copy className="h-4 w-4" />Copy</>}
                  </button>
                </div>

                <div className="flex flex-col gap-2.5">
                  <Link to="/shop" onClick={dismiss}
                    className="flex items-center justify-center gap-2 w-full py-3.5 btn-gold rounded-2xl shadow-lg">
                    Shop Now & Save 10% <ArrowRight className="h-4 w-4" />
                  </Link>
                  <button onClick={dismiss} className="text-sm text-gray-400 hover:text-gray-600 transition-colors text-center py-1">
                    No thanks, I don't want a discount
                  </button>
                </div>

                <p className="text-[10px] text-gray-400 text-center mt-3">Valid on any first order · No minimum · One-time use</p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ExitIntentPopup;
