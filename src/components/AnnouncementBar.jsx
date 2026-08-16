/**
 * © 2024–2026 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 *
 * AnnouncementBar — a dismissible top banner shown above the header when an admin
 * enables it in Settings → Announcement Bar. Reads live site settings so the
 * message, style and on/off state reflect what admins configure.
 */
import React, { useState } from 'react';
import { X, Info, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useSiteSettings } from '@/hooks/useSiteSettings';

const STYLES = {
  info:    { bg: 'bg-blue-600',   Icon: Info },
  success: { bg: 'bg-emerald-600', Icon: CheckCircle2 },
  warning: { bg: 'bg-amber-500',  Icon: AlertTriangle },
};

const AnnouncementBar = () => {
  const settings = useSiteSettings();
  const bar = settings?.announcementBar;
  const [dismissed, setDismissed] = useState(false);

  if (!bar?.enabled || !bar?.text || dismissed) return null;
  const { bg, Icon } = STYLES[bar.type] || STYLES.info;

  return (
    <div className={`${bg} text-white text-sm`}>
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-2 relative">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="font-medium text-center">{bar.text}</span>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss announcement"
          className="absolute right-3 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100 transition-opacity"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default AnnouncementBar;
