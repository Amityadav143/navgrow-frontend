/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 · navgrow.org · info@navgrow.org
 */
import { useEffect } from 'react';

/**
 * Calls `handler` when the Escape key is pressed, but only while `active` is true.
 * Lets dialogs, drawers and sidebars be dismissed from the keyboard — an
 * accessibility expectation for any overlay UI.
 *
 * @param {boolean} active   whether the listener should be attached (e.g. modal open)
 * @param {() => void} handler what to run on Escape (usually the close function)
 */
export default function useEscapeKey(active, handler) {
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') handler?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, handler]);
}
