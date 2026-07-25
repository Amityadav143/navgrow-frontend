/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 | navgrow.org | info@navgrow.org
 *
 * PROPRIETARY & CONFIDENTIAL — Navgrow Engineering Platform v1.0
 * Unauthorised copying or distribution is strictly prohibited.
 */
/**
 * JobDetailModal — the full role, then a way to act on it.
 *
 * The previous accordion dropped a paragraph and a mailto link into the card,
 * which left a candidate with no sense of what the job actually involved and no
 * way to attach a CV. This separates reading from applying: a structured brief
 * first, then a real application form with an upload, with email kept as a
 * fallback for anyone who would rather use their own client.
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, MapPin, Clock, Briefcase, Building2, CheckCircle2, Send, Mail, Upload,
  FileText, Loader2, AlertCircle, ArrowLeft, User, Phone, Trash2, CalendarDays,
} from 'lucide-react';
import { jobsApi } from '@/lib/api';

/** Recruitment inbox — keep in step with app.careers-email on the server. */
export const CAREERS_EMAIL = 'careers@navgrow.org';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-()\s]{7,20}$/;
const MAX_CV_MB = 5;

/**
 * Turns a free-text job description into organised sections.
 *
 * WHY: the backend stores a single `description` blob — it has no
 * responsibilities/requirements/benefits columns. Without this, every
 * API-created role rendered as one long unbroken paragraph, which is what made
 * the details screen feel disorganised. Admins naturally write headings
 * ("Responsibilities:", "What we're looking for", "Perks"), so we detect those
 * and the bullet lines beneath them, and fall back to showing the raw text
 * unchanged when a description has no recognisable structure.
 */
const HEADING_MAP = [
  { key: 'responsibilities', re: /^(key\s+)?(responsibilities|duties|what\s+you'?ll\s+do|role\s+overview|the\s+role|job\s+role)\b/i },
  { key: 'requirements',     re: /^(requirements|qualifications|eligibility|skills\s+required|what\s+we'?re\s+looking\s+for|who\s+you\s+are|desired\s+candidate(\s+profile)?)\b/i },
  { key: 'benefits',         re: /^(benefits|perks|what\s+we\s+offer|compensation\s+&?\s*benefits|why\s+join)\b/i },
];
const BULLET_RE = /^\s*(?:[-•*–—]|\d+[.)])\s+/;

export function parseJobDescription(desc) {
  const empty = { about: '', responsibilities: [], requirements: [], benefits: [] };
  if (!desc || typeof desc !== 'string') return empty;
  const lines = desc.split('\n');
  const out = { ...empty, responsibilities: [], requirements: [], benefits: [] };
  const aboutLines = [];
  let current = null;              // null = still in the intro/about block
  let sawHeading = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    // A heading may be written as "Responsibilities:" or on its own short line.
    const stripped = line.replace(/[:：]\s*$/, '');
    const match = HEADING_MAP.find(h => h.re.test(stripped));
    const looksLikeHeading = match && (line.endsWith(':') || line.endsWith('：') || stripped.split(/\s+/).length <= 6);
    if (looksLikeHeading) { current = match.key; sawHeading = true; continue; }

    const item = line.replace(BULLET_RE, '').trim();
    const isBullet = BULLET_RE.test(line);
    if (current) {
      if (item) out[current].push(item);
    } else if (isBullet) {
      // Bullets before any heading are almost always the duties list.
      out.responsibilities.push(item);
    } else {
      aboutLines.push(line);
    }
  }
  out.about = aboutLines.join('\n').trim();
  // Nothing recognisable? Show the original text rather than mangling it.
  if (!sawHeading && out.responsibilities.length === 0) return { ...empty, about: desc.trim() };
  return out;
}

const Section = ({ title, children }) => (
  <div>
    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{title}</h3>
    {children}
  </div>
);

const Bullets = ({ items }) => (
  <ul className="space-y-1.5">
    {items.map((t, i) => (
      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
        <span className="leading-relaxed">{t}</span>
      </li>
    ))}
  </ul>
);

const Field = ({ id, label, required, error, children }) => (
  <div>
    <label htmlFor={id} className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
      {label}{required && <span className="text-red-500"> *</span>}
    </label>
    {children}
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

const inputCls = (bad) =>
  `w-full px-3 py-2.5 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
    bad ? 'border-red-400' : 'border-gray-200'}`;

export default function JobDetailModal({ job, open, onClose }) {
  const [mode, setMode]       = useState('details');   // details | apply | done
  const [form, setForm]       = useState({ name: '', email: '', phone: '', experience: '', coverNote: '' });
  const [errors, setErrors]   = useState({});
  const [cv, setCv]           = useState(null);        // { file, url, name, size }
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    if (open) { setMode('details'); setErrors({}); setServerError(''); }
  }, [open, job?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const ch = (k) => (e) => {
    setForm(p => ({ ...p, [k]: e.target.value }));
    setErrors(p => ({ ...p, [k]: undefined }));
  };

  const pickCv = useCallback(async (file) => {
    if (!file) return;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext)) {
      setErrors(p => ({ ...p, cv: 'Please upload a PDF or Word document' })); return;
    }
    if (file.size > MAX_CV_MB * 1024 * 1024) {
      setErrors(p => ({ ...p, cv: `Your CV must be under ${MAX_CV_MB} MB` })); return;
    }
    setErrors(p => ({ ...p, cv: undefined }));
    setUploading(true);
    try {
      const { data } = await jobsApi.uploadResume(file);
      setCv({ url: data.url, name: file.name, size: file.size });
    } catch (err) {
      setErrors(p => ({
        ...p,
        cv: err.response?.status === 413
          ? 'That file is too large for the server to accept.'
          : err.response?.data?.message || 'Could not upload your CV. Please try again.',
      }));
    } finally {
      setUploading(false);
    }
  }, []);

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name  = 'Required';
    if (!form.email.trim()) e.email = 'Required';
    else if (!EMAIL_RE.test(form.email.trim())) e.email = 'Enter a valid email';
    if (!form.phone.trim()) e.phone = 'Required';
    else if (!PHONE_RE.test(form.phone.trim())) e.phone = 'Enter a valid phone number';
    setErrors(p => ({ ...p, ...e }));
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true); setServerError('');
    try {
      await jobsApi.apply(job.id, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        experience: form.experience.trim() || undefined,
        coverNote: form.coverNote.trim() || undefined,
        resumeUrl: cv?.url,
      });
      setMode('done');
    } catch (err) {
      setServerError(err.response?.data?.message || 'We could not submit your application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!job) return null;

  const mailBody = encodeURIComponent(
    `Dear Navgrow Recruitment Team,\n\nI would like to apply for the ${job.title} position.\n\n` +
    `Name:\nPhone:\nTotal experience:\nCurrent location:\n\n` +
    `I have attached my CV for your consideration.\n\nRegards,\n`);
  const mailHref = `mailto:${CAREERS_EMAIL}?subject=${encodeURIComponent(`Application: ${job.title}`)}&body=${mailBody}`;

  // Structured fields win when present (static catalogue roles); otherwise the
  // free-text description from the API is parsed into the same shape so every
  // role renders as an organised brief instead of one long paragraph.
  const parsed = parseJobDescription(job.desc || job.description || '');
  const responsibilities = (job.responsibilities || job.duties || []).length
    ? (job.responsibilities || job.duties) : parsed.responsibilities;
  const requirements     = (job.requirements || []).length ? job.requirements : parsed.requirements;
  const skills           = job.skills || [];
  const benefits         = (job.benefits || []).length ? job.benefits : parsed.benefits;
  const about            = parsed.about || job.desc || '';

  // Pay and deadline are the two things candidates most want up front; showing
  // them (when the employer has filled them in) is basic respect for their time.
  const money = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? '₹' + n.toLocaleString('en-IN') : null;
  };
  const salaryFrom = money(job.salaryFrom), salaryTo = money(job.salaryTo);
  const salaryText = salaryFrom && salaryTo ? `${salaryFrom} – ${salaryTo} per month`
    : salaryFrom ? `From ${salaryFrom} per month`
    : salaryTo   ? `Up to ${salaryTo} per month` : null;
  let deadlineText = null;
  if (job.applicationDeadline) {
    const d = new Date(job.applicationDeadline);
    if (!isNaN(d)) deadlineText = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}>
          <motion.div
            className="bg-white w-full max-w-2xl max-h-[92vh] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="relative brand-gradient text-white px-5 sm:px-6 py-5 shrink-0">
              <button onClick={onClose} aria-label="Close"
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/20 transition-colors">
                <X className="h-5 w-5" />
              </button>
              {mode === 'apply' && (
                <button onClick={() => setMode('details')}
                  className="inline-flex items-center gap-1.5 text-xs text-white/80 hover:text-white mb-2">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to role details
                </button>
              )}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {job.dept && <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20">{job.dept}</span>}
                {job.type && <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20">{job.type}</span>}
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold leading-tight pr-8">{job.title}</h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-white/85">
                {job.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>}
                {job.exp && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{job.exp}</span>}
                {job.openings && <span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{job.openings} opening{job.openings > 1 ? 's' : ''}</span>}
                {job.postedOn && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />Posted {job.postedOn}</span>}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
              {mode === 'details' && (
                <div className="space-y-5">
                  {/* At a glance — the facts candidates screen on first */}
                  {(salaryText || deadlineText || job.exp || job.openings) && (
                    <div className="grid grid-cols-2 gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                      {salaryText && (
                        <div>
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Compensation</p>
                          <p className="text-sm font-semibold text-gray-900 mt-0.5">{salaryText}</p>
                        </div>
                      )}
                      {job.exp && (
                        <div>
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Experience</p>
                          <p className="text-sm font-semibold text-gray-900 mt-0.5">{job.exp}</p>
                        </div>
                      )}
                      {job.openings > 0 && (
                        <div>
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Openings</p>
                          <p className="text-sm font-semibold text-gray-900 mt-0.5">{job.openings}</p>
                        </div>
                      )}
                      {deadlineText && (
                        <div>
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Apply by</p>
                          <p className="text-sm font-semibold text-gray-900 mt-0.5">{deadlineText}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {about && (
                    <Section title="About the role">
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{about}</p>
                    </Section>
                  )}
                  {responsibilities.length > 0 && (
                    <Section title="What you'll do"><Bullets items={responsibilities} /></Section>
                  )}
                  {requirements.length > 0 && (
                    <Section title="What we're looking for"><Bullets items={requirements} /></Section>
                  )}
                  {skills.length > 0 && (
                    <Section title="Key skills">
                      <div className="flex flex-wrap gap-2">
                        {skills.map(s => (
                          <span key={s} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">{s}</span>
                        ))}
                      </div>
                    </Section>
                  )}
                  {benefits.length > 0 && (
                    <Section title="What we offer"><Bullets items={benefits} /></Section>
                  )}

                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 grid grid-cols-2 gap-3 text-sm">
                    {[[Building2, 'Department', job.dept], [MapPin, 'Location', job.location],
                      [Clock, 'Experience', job.exp], [Briefcase, 'Type', job.type]]
                      .filter(([, , v]) => v).map(([Icon, label, value]) => (
                        <div key={label} className="flex items-start gap-2">
                          <Icon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">{label}</p>
                            <p className="text-gray-800">{value}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {mode === 'apply' && (
                <div className="space-y-4">
                  {serverError && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{serverError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field id="ja-name" label="Full name" required error={errors.name}>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input id="ja-name" value={form.name} onChange={ch('name')} autoComplete="name"
                          className={inputCls(errors.name) + ' pl-10'} placeholder="Your name" />
                      </div>
                    </Field>
                    <Field id="ja-phone" label="Phone" required error={errors.phone}>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input id="ja-phone" type="tel" inputMode="tel" value={form.phone} onChange={ch('phone')}
                          autoComplete="tel" className={inputCls(errors.phone) + ' pl-10'} placeholder="+91 98765 43210" />
                      </div>
                    </Field>
                    <Field id="ja-email" label="Email" required error={errors.email}>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input id="ja-email" type="email" value={form.email} onChange={ch('email')}
                          autoComplete="email" className={inputCls(errors.email) + ' pl-10'} placeholder="you@example.com" />
                      </div>
                    </Field>
                    <Field id="ja-exp" label="Total experience">
                      <input id="ja-exp" value={form.experience} onChange={ch('experience')}
                        className={inputCls(false)} placeholder="e.g. 4 years" />
                    </Field>
                  </div>

                  {/* CV upload */}
                  <Field id="ja-cv" label="Your CV" error={errors.cv}>
                    {cv ? (
                      <div className="flex items-center gap-3 p-3 rounded-xl border border-green-200 bg-green-50">
                        <FileText className="h-5 w-5 text-green-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{cv.name}</p>
                          <p className="text-xs text-gray-500">{(cv.size / 1024).toFixed(0)} KB · uploaded</p>
                        </div>
                        <button onClick={() => { setCv(null); if (fileRef.current) fileRef.current.value = ''; }}
                          aria-label="Remove CV" className="text-gray-400 hover:text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => fileRef.current?.click()} disabled={uploading}
                        className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-300 text-sm text-gray-500 disabled:opacity-60">
                        {uploading
                          ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
                          : <><Upload className="h-4 w-4" /> Upload CV (PDF or Word, up to {MAX_CV_MB} MB)</>}
                      </button>
                    )}
                    <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
                      onChange={(e) => pickCv(e.target.files?.[0])} />
                  </Field>

                  <Field id="ja-note" label="Anything you'd like to add">
                    <textarea id="ja-note" rows={3} value={form.coverNote} onChange={ch('coverNote')}
                      className={inputCls(false) + ' resize-y'}
                      placeholder="A short note about why this role suits you (optional)" />
                  </Field>
                </div>
              )}

              {mode === 'done' && (
                <div className="py-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-9 w-9 text-green-600" />
                  </div>
                  <h3 className="text-xl font-extrabold text-gray-900 mb-2">
                    Thank you, {form.name.split(' ')[0]}
                  </h3>
                  <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">
                    Your application for <span className="font-semibold text-gray-700">{job.title}</span> is with our
                    recruitment team, and we've emailed a confirmation to{' '}
                    <span className="font-semibold text-gray-700">{form.email}</span>. If your profile matches,
                    we'll be in touch within 5 working days.
                  </p>
                  {!cv && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mt-4 inline-block">
                      You applied without a CV — you can still send it to {CAREERS_EMAIL}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="border-t border-gray-100 px-5 sm:px-6 py-4 shrink-0 bg-white">
              {mode === 'details' && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={() => setMode('apply')}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-3 btn-gold rounded-xl text-sm">
                    <Send className="h-4 w-4" /> Apply for this role
                  </button>
                  <a href={mailHref}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm">
                    <Mail className="h-4 w-4" /> Email us instead
                  </a>
                </div>
              )}
              {mode === 'apply' && (
                <div className="flex gap-3">
                  <button onClick={() => setMode('details')}
                    className="px-5 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-200">
                    Back
                  </button>
                  <button onClick={submit} disabled={submitting || uploading}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-3 btn-gold rounded-xl text-sm disabled:opacity-60">
                    {submitting
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                      : <><Send className="h-4 w-4" /> Submit application</>}
                  </button>
                </div>
              )}
              {mode === 'done' && (
                <button onClick={onClose}
                  className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm">
                  Close
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
