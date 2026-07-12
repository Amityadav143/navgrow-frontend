/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 · navgrow.org · info@navgrow.org
 */
import { useEffect } from 'react';

/**
 * useBodyScrollLock — locks page scrolling while an overlay is open.
 *
 * Why not just `overflow: hidden`? iOS Safari ignores it for touch scrolling,
 * so the page behind a modal still moves (and the modal "feels stuck").
 * The reliable technique is to fix the <body> in place at its current scroll
 * offset, then restore the offset on unlock.
 *
 * Ref-counted at module level so stacked overlays (e.g. Cart → Checkout)
 * cooperate: the page unlocks only when the LAST overlay closes.
 *
 * @param {boolean} active lock while true (pass the overlay's open state)
 */
let lockCount = 0;
let savedScrollY = 0;
let savedStyles = null;

const lock = () => {
  lockCount += 1;
  if (lockCount > 1) return; // already locked by another overlay

  savedScrollY = window.scrollY || window.pageYOffset || 0;
  const body = document.body;
  // Compensate for the disappearing scrollbar so the layout doesn't jump.
  const scrollbarW = window.innerWidth - document.documentElement.clientWidth;

  savedStyles = {
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    right: body.style.right,
    width: body.style.width,
    overflow: body.style.overflow,
    paddingRight: body.style.paddingRight,
  };

  body.style.position = 'fixed';
  body.style.top = `-${savedScrollY}px`;
  body.style.left = '0';
  body.style.right = '0';
  body.style.width = '100%';
  body.style.overflow = 'hidden';
  if (scrollbarW > 0) body.style.paddingRight = `${scrollbarW}px`;
};

const unlock = () => {
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount > 0) return; // another overlay is still open

  const body = document.body;
  Object.assign(body.style, savedStyles || {});
  savedStyles = null;
  // Restore the scroll position the user was at before the lock.
  window.scrollTo(0, savedScrollY);
};

export default function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    lock();
    return unlock;
  }, [active]);
}
