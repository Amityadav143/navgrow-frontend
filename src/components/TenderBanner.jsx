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
import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FileText, X, Clock, ExternalLink, AlertCircle } from 'lucide-react';
import { useSiteSettings } from '@/hooks/useSiteSettings';

const TENDERS = [
  { title: 'Supply & Fitment of Brake Components – WDG4 Locomotives',  deadline: 'Apr 30, 2026', value: '₹12.5L', status: 'Open' },
  { title: 'Anti-Corrosion Treatment – Railway Bridge Structures',       deadline: 'May 15, 2026', value: '₹8L',    status: 'Open' },
  { title: 'Annual Maintenance Contract – Loco Shed Civil Works',        deadline: 'May 31, 2026', value: '₹20L+',  status: 'New'  },
  { title: 'Rainwater Testing Facility Expansion – Diesel Loco Shed',    deadline: 'Jun 10, 2026', value: '₹5L',    status: 'New'  },
];

const TenderBanner = () => {
  const settings = useSiteSettings();
  const [dismissed, setDismissed] = useState(false);

  // Respect site settings toggle
  const enabled = settings.tenderBanner?.enabled !== false;
  if (!enabled || dismissed) return null;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-blue-950 text-white overflow-hidden border-b border-amber-500/30"
    >
      <div className="flex items-center gap-3 px-4 py-2 max-w-screen-2xl mx-auto">
        {/* Gold label chip */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0 bg-amber-500 text-blue-950 rounded-full px-3 py-1 text-[11px] font-black tracking-widest uppercase">
          <AlertCircle className="h-3 w-3"/>
          LIVE TENDERS
        </div>

        {/* Ticker */}
        <div className="flex-1 overflow-hidden ticker-pause">
          <div className="flex gap-8 animate-ticker whitespace-nowrap">
            {[...TENDERS, ...TENDERS].map((t, i) => (
              <div key={i} className="inline-flex items-center gap-2.5 text-sm">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${t.status==='New'?'badge-gold':'bg-blue-800 text-blue-200'}`}>{t.status}</span>
                <span className="text-blue-100 font-medium">{t.title}</span>
                <span className="text-amber-400 font-bold shrink-0">{t.value}</span>
                <span className="text-blue-400 text-xs flex items-center gap-1 shrink-0"><Clock className="h-3 w-3"/>{t.deadline}</span>
                <span className="text-blue-700 mx-2">·</span>
              </div>
            ))}
          </div>
        </div>

        {/* Banner text override from settings */}
        {settings.tenderBanner?.text && settings.tenderBanner.text !== 'Live Tenders Available — Click to View' && (
          <span className="hidden md:block text-xs text-amber-300 font-semibold shrink-0">{settings.tenderBanner.text}</span>
        )}

        <a href="/contact" className="hidden lg:flex items-center gap-1.5 shrink-0 btn-gold px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
          <ExternalLink className="h-3 w-3"/> Apply Now
        </a>
        <button onClick={() => setDismissed(true)} className="p-1 text-blue-400 hover:text-white transition-colors shrink-0" aria-label="Close tender banner">
          <X className="h-4 w-4"/>
        </button>
      </div>
    </motion.div>
  );
};

export default TenderBanner;
