/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 | navgrow.org | info@navgrow.org
 *
 * PROPRIETARY & CONFIDENTIAL — Navgrow Engineering Platform v1.0
 * Unauthorised copying or distribution is strictly prohibited.
 */
/**
 * CatalogueDownloadModal
 *
 * A gated download: the visitor provides name, mobile, email and their
 * requirement. On submit we POST the lead (stored + emailed to admin and the
 * visitor), then trigger the actual PDF download and show a success state.
 *
 * Usage:
 *   const [open, setOpen] = useState(false);
 *   <button onClick={() => setOpen(true)}>Download Catalogue</button>
 *   <CatalogueDownloadModal open={open} onClose={() => setOpen(false)} source="footer" />
 */
import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Download, FileText, CheckCircle, AlertCircle, Loader2,
  User, Phone, Mail, Building2, MessageSquare,
} from 'lucide-react';
import { catalogueApi } from '@/lib/api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_RE = /^[0-9+\-()\s]{7,20}$/;

export default function CatalogueDownloadModal({ open, onClose, source = 'website', catalogueKey = 'company-profile-2026' }) {
  const [form, setForm] = useState({ name: '', mobile: '', email: '', company: '', city: '', requirement: '' });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [serverError, setServerError] = useState('');
  const ch = useCallback((k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  }, []);

  // Reset when the modal is (re)opened
  useEffect(() => {
    if (open) { setStatus('idle'); setServerError(''); setErrors({}); }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Please enter your name';
    if (!form.mobile.trim()) e.mobile = 'Please enter your mobile number';
    else if (!MOBILE_RE.test(form.mobile.trim())) e.mobile = 'Enter a valid mobile number';
    if (!form.email.trim()) e.email = 'Please enter your email';
    else if (!EMAIL_RE.test(form.email.trim())) e.email = 'Enter a valid email address';
    if (!form.requirement.trim()) e.requirement = 'Tell us briefly what you need';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const triggerDownload = () => {
    // Anchor with download attribute → streams the attachment from the API.
    const a = document.createElement('a');
    a.href = catalogueApi.downloadUrl();
    a.setAttribute('download', 'Navgrow_Company_Profile_2026.pdf');
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setStatus('submitting'); setServerError('');
    try {
      await catalogueApi.capture({
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        email: form.email.trim(),
        company: form.company.trim() || undefined,
        city: form.city.trim() || undefined,
        requirement: form.requirement.trim(),
        source,
        catalogueKey,
      });
      triggerDownload();
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setServerError(
        err.response?.data?.message ||
        err.response?.data?.fieldErrors?.[Object.keys(err.response?.data?.fieldErrors || {})[0]] ||
        'Something went wrong. Please try again in a moment.'
      );
    }
  };

  const field = (name, label, Icon, opts = {}) => (
    <div className={opts.full ? 'sm:col-span-2' : ''}>
      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
        {label}{opts.required && <span className="text-red-500"> *</span>}
      </label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        {opts.textarea ? (
          <textarea
            value={form[name]} onChange={(e) => ch(name, e.target.value)} rows={3}
            placeholder={opts.placeholder}
            className={`w-full pl-10 pr-3 py-2.5 bg-gray-50 border rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-y ${errors[name] ? 'border-red-400' : 'border-gray-200'}`}
          />
        ) : (
          <input
            type={opts.type || 'text'} value={form[name]} onChange={(e) => ch(name, e.target.value)}
            placeholder={opts.placeholder}
            className={`w-full pl-10 pr-3 py-2.5 bg-gray-50 border rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${errors[name] ? 'border-red-400' : 'border-gray-200'}`}
          />
        )}
      </div>
      {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name]}</p>}
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto"
            initial={{ scale: 0.94, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0, y: 12 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative brand-gradient text-white px-6 py-5 rounded-t-2xl">
              <button onClick={onClose} aria-label="Close"
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/20 transition-colors">
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold leading-tight">Download Company Catalogue</h3>
                  <p className="text-white/80 text-xs mt-0.5">Company Profile &amp; Capabilities — 2026 Edition (PDF)</p>
                </div>
              </div>
            </div>

            {status === 'success' ? (
              <div className="px-6 py-10 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-9 w-9 text-green-600" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">Your download has started</h4>
                <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
                  We've also emailed a copy to <span className="font-semibold text-gray-700">{form.email}</span>.
                  If the download didn't begin automatically, use the button below.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button onClick={triggerDownload}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 brand-gradient text-white font-bold rounded-xl text-sm hover:opacity-90">
                    <Download className="h-4 w-4" /> Download again
                  </button>
                  <button onClick={onClose}
                    className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200">
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-6 py-5">
                <p className="text-gray-500 text-sm mb-4">
                  Please share a few details and we'll take you straight to the download. Our team may reach out to help with your requirement.
                </p>

                {serverError && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{serverError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {field('name', 'Full Name', User, { required: true, placeholder: 'e.g. Rahul Sharma' })}
                  {field('mobile', 'Mobile Number', Phone, { required: true, type: 'tel', placeholder: '+91 98765 43210' })}
                  {field('email', 'Email Address', Mail, { required: true, type: 'email', placeholder: 'you@example.com' })}
                  {field('company', 'Company', Building2, { placeholder: 'Optional' })}
                  {field('requirement', 'Your Requirement', MessageSquare, {
                    required: true, full: true, textarea: true,
                    placeholder: 'Briefly describe what you\'re looking for — e.g. railway track tools, an STP for our plant, a civil contractor for a warehouse…',
                  })}
                </div>

                <button
                  onClick={handleSubmit} disabled={status === 'submitting'}
                  className="w-full mt-5 inline-flex items-center justify-center gap-2 py-3 brand-gradient text-white font-bold rounded-xl text-sm hover:opacity-90 disabled:opacity-60"
                >
                  {status === 'submitting'
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Preparing your download…</>
                    : <><Download className="h-4 w-4" /> Get the Catalogue</>}
                </button>
                <p className="text-[11px] text-gray-400 text-center mt-3">
                  By downloading, you agree to be contacted by Navgrow regarding your enquiry. We never share your details.
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
