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
import React, { useState, useEffect, useCallback } from 'react';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, MessageCircle, Star, FileText } from 'lucide-react';

const EVENTS = [
  { icon: ShoppingBag, color: 'bg-blue-600',  text: 'Someone from Siliguri ordered', detail: 'Safety Helmet ISI',        time: 'Just now' },
  { icon: MessageCircle,color: 'bg-green-500', text: 'New WhatsApp inquiry from',    detail: 'New Delhi',                time: '2 min ago' },
  { icon: Star,         color: 'bg-amber-500', text: 'New 5★ review for',            detail: 'Digital Torque Wrench',    time: '5 min ago' },
  { icon: ShoppingBag, color: 'bg-purple-600', text: 'Bulk order placed from',       detail: 'Kolkata — Railway Dept.', time: '8 min ago' },
  { icon: FileText,    color: 'bg-cyan-600',   text: 'Quote requested by',           detail: 'NF Railway Contractor',    time: '12 min ago' },
  { icon: ShoppingBag, color: 'bg-blue-600',   text: 'Just purchased from',          detail: 'Guwahati — Wabtec partner',time: '15 min ago' },
  { icon: Star,         color: 'bg-amber-500', text: '⭐ 4.9 rating left for',        detail: 'Knee Pad Set',             time: '18 min ago' },
  { icon: MessageCircle,color: 'bg-green-500', text: 'WhatsApp chat started from',   detail: 'Patna',                    time: '22 min ago' },
];

const SocialProof = () => {
  const settings = useSiteSettings();
  const [current, setCurrent] = useState(null);
  const [idx, setIdx] = useState(0);

  const show = useCallback(() => {
    setCurrent(EVENTS[idx % EVENTS.length]);
    setIdx(p => p + 1);
    setTimeout(() => setCurrent(null), 4200);
  }, [idx]);

  useEffect(() => {
    const first = setTimeout(show, 8000);
    const interval = setInterval(show, 14000);
    return () => { clearTimeout(first); clearInterval(interval); };
  }, [show]);

  if (!settings.socialProof?.enabled) return null;

  return (
    <div className="fixed bottom-28 left-4 z-[88] pointer-events-none">
      <AnimatePresence>
        {current && (
          <motion.div
            initial={{ opacity: 0, x: -60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -60, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-3 flex items-center gap-3 max-w-[260px]"
          >
            <div className={`w-10 h-10 rounded-xl ${current.color} flex items-center justify-center shrink-0 shadow-md`}>
              <current.icon className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 leading-none mb-0.5">{current.text}</p>
              <p className="text-sm font-bold text-gray-900 leading-snug truncate">{current.detail}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{current.time}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SocialProof;
