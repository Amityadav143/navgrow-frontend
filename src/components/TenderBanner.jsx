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
import { tendersApi } from '@/lib/api';

const TENDERS = [
  { title: 'Supply & Fitment of Brake Components – WDG4 Locomotives',  deadline: 'Apr 30, 2026', value: '₹12.5L', status: 'Open' },
  { title: 'Anti-Corrosion Treatment – Railway Bridge Structures',       deadline: 'May 15, 2026', value: '₹8L',    status: 'Open' },
  { title: 'Annual Maintenance Contract – Loco Shed Civil Works',        deadline: 'May 31, 2026', value: '₹20L+',  status: 'New'  },
  { title: 'Rainwater Testing Facility Expansion – Diesel Loco Shed',    deadline: 'Jun 10, 2026', value: '₹5L',    status: 'New'  },
];

const fmtValue = (t) => {
  const lakh = (v) => v >= 100000 ? `₹${(v / 100000).toLocaleString('en-IN', { maximumFractionDigits: 1 })}L` : `₹${Number(v).toLocaleString('en-IN')}`;
  if (t.valueMin != null) return t.valueMax != null ? `${lakh(Number(t.valueMin))}–${lakh(Number(t.valueMax))}` : `${lakh(Number(t.valueMin))}+`;
  return t.value || '';
};

const fmtDeadline = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const TenderBanner = () => {
  const settings = useSiteSettings();
  const [dismissed, setDismissed] = useState(false);

  // Live tenders from the admin panel (featured first, then all open),
  // falling back to the static list only when the API has nothing.
  const [liveTenders, setLiveTenders] = useState(null);
  React.useEffect(() => {
    let cancelled = false;
    tendersApi.featured()
      .then(r => (Array.isArray(r.data) && r.data.length > 0) ? r.data : tendersApi.list().then(r2 => r2.data))
      .then(list => { if (!cancelled && Array.isArray(list) && list.length > 0) setLiveTenders(list.slice(0, 8)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const tenders = (liveTenders && liveTenders.length > 0)
    ? liveTenders.map(t => ({
        title: t.title,
        value: fmtValue(t),
        deadline: fmtDeadline(t.deadline),
        status: t.status === 'OPEN' ? 'Open' : (t.status || 'Open'),
        applyLink: t.applyLink || null,
      }))
    : TENDERS;
  const firstApplyLink = tenders.find(t => t.applyLink)?.applyLink;

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
            {[...tenders, ...tenders].map((t, i) => {
              const Item = t.applyLink ? 'a' : 'div';
              const linkProps = t.applyLink
                ? { href: t.applyLink, target: '_blank', rel: 'noopener noreferrer', title: 'Open tender / apply' }
                : {};
              return (
                <Item key={i} {...linkProps}
                  className={`inline-flex items-center gap-2.5 text-sm ${t.applyLink ? 'hover:opacity-80 cursor-pointer' : ''}`}>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${t.status==='New'?'badge-gold':'bg-blue-800 text-blue-200'}`}>{t.status}</span>
                  <span className="text-blue-100 font-medium">{t.title}</span>
                  {t.value && <span className="text-amber-400 font-bold shrink-0">{t.value}</span>}
                  {t.deadline && <span className="text-blue-400 text-xs flex items-center gap-1 shrink-0"><Clock className="h-3 w-3"/>{t.deadline}</span>}
                  {t.applyLink && <ExternalLink className="h-3 w-3 text-amber-400 shrink-0"/>}
                  <span className="text-blue-700 mx-2">·</span>
                </Item>
              );
            })}
          </div>
        </div>

        {/* Banner text override from settings */}
        {settings.tenderBanner?.text && settings.tenderBanner.text !== 'Live Tenders Available — Click to View' && (
          <span className="hidden md:block text-xs text-amber-300 font-semibold shrink-0">{settings.tenderBanner.text}</span>
        )}

        <a href={firstApplyLink || '/contact'}
          {...(firstApplyLink ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          className="hidden lg:flex items-center gap-1.5 shrink-0 btn-gold px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
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
