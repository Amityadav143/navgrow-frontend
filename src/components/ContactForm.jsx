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
import { motion } from 'framer-motion';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { contactApi } from '@/lib/api';

const INIT = { name: '', email: '', phone: '', company: '', subject: '', message: '' };

const Field = ({ id, label, type = 'text', required = false, placeholder = '', value, onChange, error, autoComplete, inputMode }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-semibold text-gray-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input type={type} id={id} name={id} value={value} onChange={onChange} required={required} placeholder={placeholder}
      autoComplete={autoComplete} inputMode={inputMode} aria-invalid={error ? 'true' : undefined}
      className={`w-full px-4 py-3 border-2 rounded-xl text-sm transition-colors focus:outline-none ${
        error ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-gray-200 bg-white focus:border-blue-500'
      }`} />
    {error && <p className="flex items-center gap-1 text-xs text-red-500 mt-1.5"><AlertCircle className="h-3 w-3" />{error}</p>}
  </div>
);

const validate = (form) => {
  const e = {};
  if (!form.name.trim())    e.name    = 'Full name is required.';
  if (!form.email.trim())   e.email   = 'Email is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email.';
  if (form.phone && !/^[+\d\s\-()\u00A0]{7,15}$/.test(form.phone)) e.phone = 'Enter a valid phone.';
  if (!form.subject.trim()) e.subject = 'Subject is required.';
  if (!form.message.trim() || form.message.trim().length < 10) e.message = 'Message must be at least 10 characters.';
  return e;
};

const ContactForm = () => {
  const { toast } = useToast();
  const [form, setForm]     = useState(INIT);
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [sent, setSent]     = useState(false);

  const change = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const v = validate(form);
    if (Object.keys(v).length) { setErrors(v); return; }
    setSending(true);
    try {
      await contactApi.submit(form);
      setSent(true);
      setForm(INIT);
      toast({ title: 'Message sent! ✓', description: "We'll get back to you within 24 hours.", duration: 6000 });
    } catch (err) {
      // Fallback to mailto if API unavailable
      if (!err.response) {
        const body = encodeURIComponent(`Name: ${form.name}\nPhone: ${form.phone || 'N/A'}\nCompany: ${form.company || 'N/A'}\n\n${form.message}`);
        window.location.href = `mailto:info@navgrow.org?subject=${encodeURIComponent(form.subject)}&body=${body}`;
      } else {
        toast({ title: 'Failed to send', description: err.response?.data?.message || 'Please email us at info@navgrow.org', variant: 'destructive', duration: 8000 });
      }
    } finally {
      setSending(false);
    }
  };

  if (sent) return (
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-3xl shadow-xl border border-gray-100 px-8">
      <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mb-6">
        <CheckCircle className="h-12 w-12 text-green-600" />
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-2">Message Sent!</h3>
      <p className="text-gray-500 mb-8">We'll respond within <span className="font-semibold text-blue-600">24 business hours</span>.</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={() => setSent(false)} className="px-6 py-3 btn-gold rounded-xl font-semibold hover:opacity-90">
          Send Another Message
        </button>
        <a href="https://wa.me/918927070972" target="_blank" rel="noopener noreferrer"
          className="px-6 py-3 bg-[#25D366] text-white rounded-xl font-semibold hover:opacity-90 text-center">
          WhatsApp Us
        </a>
      </div>
    </motion.div>
  );

  return (
    <motion.form onSubmit={submit} noValidate
      className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-10"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <h3 className="text-2xl font-bold text-gray-900 mb-1">Send Us a Message</h3>
      <p className="text-gray-500 text-sm mb-7">We reply within 24 business hours. <span className="text-red-500">*</span> required.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <Field id="name"    label="Full Name"              type="text"  required value={form.name}    onChange={change} error={errors.name}    placeholder="Your full name" autoComplete="name" />
        <Field id="email"   label="Email Address"          type="email" required value={form.email}   onChange={change} error={errors.email}   placeholder="you@example.com" autoComplete="email" inputMode="email" />
        <Field id="phone"   label="Phone Number"           type="tel"            value={form.phone}   onChange={change} error={errors.phone}   placeholder="+91 XXXXXXXXXX" autoComplete="tel" inputMode="tel" />
        <Field id="company" label="Company / Organisation" type="text"           value={form.company} onChange={change} error={errors.company} placeholder="Your company" autoComplete="organization" />
      </div>

      <div className="mb-5">
        <Field id="subject" label="Subject" type="text" required value={form.subject} onChange={change} error={errors.subject} placeholder="How can we help you?" />
      </div>

      <div className="mb-7">
        <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-1.5">Message <span className="text-red-500">*</span></label>
        <textarea id="message" name="message" value={form.message} onChange={change} required rows={5} resize="none"
          placeholder="Describe your project or inquiry (min. 10 characters)…"
          className={`w-full px-4 py-3 border-2 rounded-xl text-sm transition-colors focus:outline-none resize-none ${errors.message ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'}`} />
        {errors.message && <p className="flex items-center gap-1 text-xs text-red-500 mt-1.5"><AlertCircle className="h-3 w-3" />{errors.message}</p>}
        <p className="text-xs text-gray-400 mt-1 text-right">{form.message.length} chars</p>
      </div>

      <Button type="submit" disabled={sending} className="w-full py-3.5 btn-gold font-semibold rounded-xl text-base shadow-lg hover:opacity-90 transition-opacity">
        {sending ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Sending…
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">Send Message <Send className="h-4 w-4" /></span>
        )}
      </Button>

      <div className="flex items-center gap-3 mt-5">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs text-gray-400 font-medium">or reach us directly</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4">
        <a href="mailto:info@navgrow.org" className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors font-medium">✉ Email</a>
        <a href="https://wa.me/918927070972" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-green-400 hover:text-green-600 transition-colors font-medium">💬 WhatsApp</a>
      </div>
    </motion.form>
  );
};

export default ContactForm;
