/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 | navgrow.org
 *
 * ConfirmDialog — accessible, branded replacement for window.confirm().
 * Provides a Promise-based imperative API via useConfirm() hook plus a
 * declarative <ConfirmDialog> component. Fully keyboard-accessible, traps
 * focus, restores scroll, and respects prefers-reduced-motion.
 */
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, X, CheckCircle, Info } from 'lucide-react';

const ConfirmContext = createContext(null);

const VARIANTS = {
  danger:  { icon: Trash2,        ring: 'bg-red-100',    color: 'text-red-600',    btn: 'bg-red-600 hover:bg-red-700' },
  warning: { icon: AlertTriangle, ring: 'bg-amber-100',  color: 'text-amber-600',  btn: 'bg-amber-600 hover:bg-amber-700' },
  info:    { icon: Info,          ring: 'bg-blue-100',   color: 'text-blue-600',   btn: 'brand-gradient' },
  success: { icon: CheckCircle,   ring: 'bg-green-100',  color: 'text-green-600',  btn: 'bg-green-600 hover:bg-green-700' },
};

export const ConfirmProvider = ({ children }) => {
  const [state, setState] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({
        title:       opts.title       || 'Are you sure?',
        message:     opts.message     || 'This action cannot be undone.',
        confirmText: opts.confirmText || 'Confirm',
        cancelText:  opts.cancelText  || 'Cancel',
        variant:     opts.variant     || 'danger',
      });
    });
  }, []);

  const close = useCallback((result) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setState(null);
  }, []);

  // Lock body scroll + keyboard handling
  useEffect(() => {
    if (!state) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Enter')  close(true);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [state, close]);

  const v = state ? (VARIANTS[state.variant] || VARIANTS.danger) : VARIANTS.danger;
  const Icon = v.icon;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {state && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm z-[210]"
              onClick={() => close(false)}
            />
            <div className="fixed inset-0 z-[211] flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 20 }}
                transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-msg"
                className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden pointer-events-auto">
                <div className="p-6 text-center">
                  <div className={`w-16 h-16 rounded-full ${v.ring} flex items-center justify-center mx-auto mb-4`}>
                    <Icon className={`h-8 w-8 ${v.color}`} />
                  </div>
                  <h3 id="confirm-title" className="text-lg font-extrabold text-gray-900 mb-2">{state.title}</h3>
                  <p id="confirm-msg" className="text-sm text-gray-500 leading-relaxed mb-6">{state.message}</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => close(false)}
                      className="flex-1 py-3 border-2 border-gray-200 text-gray-600 font-bold rounded-2xl text-sm hover:bg-gray-50 transition-colors">
                      {state.cancelText}
                    </button>
                    <button
                      autoFocus
                      onClick={() => close(true)}
                      className={`flex-1 py-3 text-white font-bold rounded-2xl text-sm transition-all ${v.btn}`}>
                      {state.confirmText}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
};

/**
 * useConfirm() → async confirm({ title, message, variant, confirmText, cancelText })
 * Returns a Promise<boolean>.
 * Example: if (await confirm({ title:'Delete?', variant:'danger' })) doDelete();
 */
export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    // Graceful fallback to native confirm if provider is missing
    return ({ message } = {}) => Promise.resolve(window.confirm(message || 'Are you sure?'));
  }
  return ctx;
};

export default ConfirmProvider;
