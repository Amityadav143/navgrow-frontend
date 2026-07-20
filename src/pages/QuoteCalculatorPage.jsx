/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 · navgrow.org · info@navgrow.org
 * Unauthorised reproduction, modification or distribution is strictly prohibited.
 */
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator, Train, Building, Wrench, Users, Shield, Cpu, Building2,
  CheckCircle, ArrowRight, Phone, MessageCircle, Send, RotateCcw,
  ChevronDown, Info, AlertCircle, Mail,
} from 'lucide-react';
import PageHero from '@/components/PageHero';
import useSeo from '@/hooks/useSeo';
import { quotesApi } from '@/lib/api';

/* ── Data ─────────────────────────────────────────────────────────────────── */
const SERVICES = [
  { id: 'railway',      icon: Train,    label: 'Railway Infrastructure',    base: 250000, unit: 'per loco / per shed',    sector:'Railway & Transport' },
  { id: 'govt',         icon: Building, label: 'Government / PSU Contracts', base: 100000, unit: 'per tender',             sector:'Government' },
  { id: 'maintenance',  icon: Wrench,   label: 'Maintenance & AMC',          base: 50000,  unit: 'per month',              sector:'Any Sector' },
  { id: 'consulting',   icon: Users,    label: 'Consulting & Advisory',       base: 30000,  unit: 'per project',            sector:'Any Sector' },
  { id: 'safety',       icon: Shield,   label: 'Safety & Compliance Audit',   base: 40000,  unit: 'per audit',              sector:'Any Sector' },
  { id: 'technology',   icon: Cpu,      label: 'IoT / Technology Solutions',  base: 80000,  unit: 'per system',             sector:'Industrial & Tech' },
  { id: 'civil',        icon: Building, label: 'Civil & Construction Works',   base: 150000, unit: 'per site / per project', sector:'Construction' },
  { id: 'industrial',   icon: Wrench,   label: 'Industrial Engineering',       base: 120000, unit: 'per unit / per project', sector:'Manufacturing' },
  { id: 'electrical',   icon: Cpu,      label: 'Electrical & Instrumentation', base: 90000,  unit: 'per system',             sector:'Utilities' },
  { id: 'procurement',  icon: Users,    label: 'Procurement & Sourcing',       base: 20000,  unit: 'per engagement',         sector:'Any Sector' },
  { id: 'training',     icon: Shield,   label: 'Training & Skill Development', base: 25000,  unit: 'per batch / per day',    sector:'Any Sector' },
  { id: 'environment',  icon: Shield,   label: 'Environmental & HSE Services', base: 35000,  unit: 'per audit / per project',sector:'Any Sector' },
];

const SCOPES = [
  { id: 'small',  label: 'Small',  desc: '1–5 units / single site',   mult: 1.0 },
  { id: 'medium', label: 'Medium', desc: '6–20 units / multi-site',   mult: 2.2 },
  { id: 'large',  label: 'Large',  desc: '20+ units / zone-wide',     mult: 5.0 },
];

const ADDONS = [
  { id: 'safety_audit',  label: 'Safety Audit & HSE Documentation',      cost: 25000 },
  { id: 'project_mgmt',  label: 'Dedicated Project Manager',              cost: 35000 },
  { id: 'training',      label: 'Staff Training Programme',               cost: 20000 },
  { id: 'annual_maint',  label: 'Annual Maintenance Contract (AMC)',      cost: 60000 },
  { id: 'reporting',     label: 'Monthly Reporting & Analytics Dashboard',cost: 15000 },
  { id: 'compliance',    label: 'Regulatory Compliance Filing',           cost: 18000 },
  { id: 'quality',       label: 'Quality Assurance & ISO Documentation',  cost: 22000 },
  { id: 'design',        label: 'Engineering Design & Drawings (CAD)',    cost: 40000 },
  { id: 'procurement',   label: 'Material Procurement & Logistics',       cost: 30000 },
  { id: 'digital',       label: 'Digital Twin / IoT Monitoring Setup',    cost: 55000 },
];

const DURATIONS = [
  { id: 'one_time', label: 'One-time / Ad-hoc',     mult: 1.0,  desc: 'Single project or delivery' },
  { id: '1month',   label: '1 Month',               mult: 1.0,  desc: 'Short-term engagement' },
  { id: '3month',   label: '3 Months',              mult: 2.8,  desc: 'Quarterly contract' },
  { id: '6month',   label: '6 Months',              mult: 5.0,  desc: 'Half-year engagement' },
  { id: '12month',  label: '1 Year (Annual)',        mult: 9.0,  desc: 'Annual contract — best value' },
  { id: '24month',  label: '2 Years (Long-term)',    mult: 16.0, desc: 'Long-term partnership' },
];

const fmt = n => '₹' + Math.round(n).toLocaleString('en-IN');

/* ── Step indicator ───────────────────────────────────────────────────────── */
const Steps = ({ current }) => (
  <div className="flex items-center gap-0 mb-8">
    {['Service', 'Scope', 'Add-ons', 'Summary'].map((label, i) => (
      <React.Fragment key={label}>
        <div className="flex flex-col items-center gap-1">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
            i < current ? 'bg-green-500 text-white' :
            i === current ? 'brand-gradient text-white shadow-md' : 'bg-gray-100 text-gray-400'
          }`}>
            {i < current ? <CheckCircle className="h-4 w-4" /> : i + 1}
          </div>
          <span className={`text-[11px] font-semibold hidden sm:block ${i === current ? 'text-blue-600' : 'text-gray-400'}`}>{label}</span>
        </div>
        {i < 3 && <div className={`flex-1 h-0.5 mx-1 transition-colors ${i < current ? 'bg-green-400' : 'bg-gray-200'}`} />}
      </React.Fragment>
    ))}
  </div>
);

/* ── Page ─────────────────────────────────────────────────────────────────── */
const QuoteCalculatorPage = () => {
  useSeo({
    title: 'Free Project Quote Calculator | Engineering Cost Estimator',
    description: 'Get an instant cost estimate for your engineering project — railway infrastructure, industrial works, civil construction, government contracts, maintenance AMC. Free quote in 4 steps.',
    path: '/quote-calculator',
    keywords: 'engineering project quote calculator, railway project cost estimate, industrial engineering quote India, civil construction cost estimator, government contract bid estimate',
  });

  const [step,      setStep]      = useState(0);
  const [service,   setService]   = useState(null);
  const [scope,     setScope]     = useState(null);
  const [addons,    setAddons]    = useState([]);
  const [duration,  setDuration]  = useState('one_time');
  const [submitted, setSubmitted] = useState(false);
  const [form,      setForm]      = useState({ name: '', email: '', phone: '', company: '', industry: '', city: '', notes: '', urgency: 'standard' });

  const svc  = SERVICES.find(s => s.id === service);
  const scp  = SCOPES.find(s => s.id === scope);
  const dur  = DURATIONS.find(d => d.id === duration);
  const addonTotal = addons.reduce((t, id) => t + (ADDONS.find(a => a.id === id)?.cost || 0), 0);

  const { low, high } = useMemo(() => {
    if (!svc || !scp || !dur) return { low: 0, high: 0 };
    const base = svc.base * scp.mult * dur.mult + addonTotal;
    return { low: base * 0.85, high: base * 1.25 };
  }, [svc, scp, dur, addonTotal]);

  const toggleAddon = id => setAddons(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);

  const reset = () => { setStep(0); setService(null); setScope(null); setAddons([]); setDuration('one_time'); setSubmitted(false); };

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const [reference, setReference] = useState('');
  const [sentVia, setSentVia] = useState('api'); // 'api' | 'mailto'

  const addonNames = addons.map(id => ADDONS.find(a => a.id === id)?.label).filter(Boolean);

  const validate = () => {
    if (!form.name || !form.email || !form.phone) {
      setSendError('Please fill in your name, email and phone number.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setSendError('Please enter a valid email address.');
      return false;
    }
    return true;
  };

  /**
   * Primary flow — submits the estimate as a formal quote request. It is
   * stored in the database, appears instantly in Admin → Quote Requests, and
   * notifies the Navgrow team by email. (Previously the API call failed
   * silently and dropped into a mailto: fallback, so nothing ever reached the
   * admin dashboard.)
   */
  const sendQuote = async () => {
    if (!validate()) return;
    setSending(true); setSendError('');
    try {
      const { data } = await quotesApi.submit({
        name:        form.name,
        email:       form.email,
        phone:       form.phone,
        company:     form.company || '',
        industry:    form.industry || '',
        city:        form.city || '',
        serviceType: svc?.id,
        serviceName: svc?.label,
        scope:       scp?.label,
        duration:    dur?.label,
        addons:      addonNames,
        estLow:      Math.round(low),
        estHigh:     Math.round(high),
        notes:       form.notes || '',
        urgency:     form.urgency || 'standard',
      });
      setReference(data?.reference || '');
      setSentVia('api');
      setSubmitted(true);
    } catch (err) {
      setSendError(
        err.response?.data?.message
        || 'Could not reach our server. Please try again, or use "Send via Email App" below.'
      );
    } finally {
      setSending(false);
    }
  };

  /** Secondary, explicit fallback — opens the visitor's mail client pre-filled. */
  const sendViaEmailApp = () => {
    if (!validate()) return;
    setSendError('');
    const subject = encodeURIComponent(
      `[Quote Request] ${svc?.label} – ${scp?.label} Scope — ${form.company || form.name}`
    );
    const body = encodeURIComponent([
      'Dear Navgrow Engineering Team,',
      '',
      'I would like to request a formal quotation for the following project:',
      '',
      '─── PROJECT DETAILS ───────────────────────────────',
      `Service Type  : ${svc?.label}`,
      `Project Scope : ${scp?.label} (${scp?.desc})`,
      `Duration      : ${dur?.label}`,
      addonNames.length ? `Add-ons       : ${addonNames.join(', ')}` : '',
      `Indicative Est: ${fmt(low)} – ${fmt(high)} (ex-GST)`,
      '',
      '─── CONTACT INFORMATION ────────────────────────────',
      `Name          : ${form.name}`,
      `Email         : ${form.email}`,
      `Phone         : ${form.phone}`,
      form.company ? `Company       : ${form.company}` : '',
      form.city    ? `Location      : ${form.city}` : '',
      form.industry? `Industry      : ${form.industry}` : '',
      '',
      '─── ADDITIONAL NOTES ───────────────────────────────',
      form.notes || 'No additional notes.',
      '',
      'Please send a formal quotation with full cost breakup, GST details,',
      'timeline, and terms at your earliest convenience.',
      '',
      'Thank you,',
      form.name,
    ].filter(l => l !== null && l !== undefined).join('\n'));
    window.location.href = `mailto:info@navgrow.org?subject=${subject}&body=${body}`;
    setSentVia('mailto');
    setSubmitted(true);
  };

  return (
    <>
      <PageHero
        chip={<><Calculator className="h-4 w-4" /> Tools</>}
        title={<>Project <span className="gradient-text">Quote Calculator</span></>}
        subtitle="Get a rough cost estimate for your engineering project in 4 simple steps. We'll follow up with a detailed formal quotation."
        breadcrumbs={[{ label: 'Quote Calculator' }]}
      />

      <section className="py-16 bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 max-w-3xl">

          {/* Disclaimer */}
          <div className="flex gap-2.5 p-4 bg-amber-50 border border-amber-200 rounded-2xl mb-8 text-sm text-amber-800">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
            Estimates are indicative only and subject to site assessment, specifications, and prevailing rates. Final quotation provided after detailed review.
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-10">
            <Steps current={step} />

            {/* ── Step 0: Service ── */}
            {step === 0 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <h2 className="text-xl font-bold text-gray-900 mb-6">What service do you need?</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SERVICES.map(({ id, icon: Icon, label, unit }) => (
                    <button key={id} onClick={() => setService(id)}
                      className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all hover:border-blue-300 hover:shadow-md ${
                        service === id ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 bg-white'
                      }`}>
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${service === id ? 'brand-gradient' : 'bg-gray-100'}`}>
                        <Icon className={`h-5 w-5 ${service === id ? 'text-white' : 'text-gray-500'}`} />
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${service === id ? 'text-blue-700' : 'text-gray-900'}`}>{label}</p>
                        <p className="text-xs text-gray-400">{unit}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-6 flex justify-end">
                  <button disabled={!service} onClick={() => setStep(1)}
                    className="flex items-center gap-2 px-7 py-3 brand-gradient text-white font-bold rounded-xl shadow-md disabled:opacity-40 hover:opacity-90 transition-opacity">
                    Next <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 1: Scope & Duration ── */}
            {step === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Project scope & duration</h2>
                <p className="text-gray-500 text-sm mb-6">Service: <span className="font-semibold text-blue-600">{svc?.label}</span></p>

                <div className="mb-6">
                  <p className="text-sm font-bold text-gray-700 mb-3">Project Scope</p>
                  <div className="grid grid-cols-3 gap-3">
                    {SCOPES.map(({ id, label, desc }) => (
                      <button key={id} onClick={() => setScope(id)}
                        className={`p-4 rounded-2xl border-2 text-center transition-all ${scope === id ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 hover:border-blue-200'}`}>
                        <p className={`font-bold ${scope === id ? 'text-blue-700' : 'text-gray-900'}`}>{label}</p>
                        <p className="text-xs text-gray-400 mt-1">{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-8">
                  <p className="text-sm font-bold text-gray-700 mb-3">Contract Duration</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {DURATIONS.map(({ id, label }) => (
                      <button key={id} onClick={() => setDuration(id)}
                        className={`py-3 px-4 rounded-xl border-2 text-sm font-bold transition-all ${duration === id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-blue-200 text-gray-700'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between">
                  <button onClick={() => setStep(0)} className="px-5 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:border-gray-300 text-sm">← Back</button>
                  <button disabled={!scope} onClick={() => setStep(2)}
                    className="flex items-center gap-2 px-7 py-3 brand-gradient text-white font-bold rounded-xl shadow-md disabled:opacity-40 hover:opacity-90 text-sm">
                    Next <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Add-ons ── */}
            {step === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Optional add-ons</h2>
                <p className="text-gray-500 text-sm mb-6">Select any additional services you require.</p>
                <div className="flex flex-col gap-3 mb-8">
                  {ADDONS.map(({ id, label, cost }) => {
                    const sel = addons.includes(id);
                    return (
                      <button key={id} onClick={() => toggleAddon(id)}
                        className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${sel ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}>
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${sel ? 'border-blue-500 bg-blue-600' : 'border-gray-300'}`}>
                          {sel && <CheckCircle className="h-4 w-4 text-white" />}
                        </div>
                        <p className={`font-semibold text-sm flex-1 ${sel ? 'text-blue-700' : 'text-gray-900'}`}>{label}</p>
                        <span className="text-sm font-bold text-blue-600">+{fmt(cost)}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-between">
                  <button onClick={() => setStep(1)} className="px-5 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:border-gray-300 text-sm">← Back</button>
                  <button onClick={() => setStep(3)}
                    className="flex items-center gap-2 px-7 py-3 brand-gradient text-white font-bold rounded-xl shadow-md hover:opacity-90 text-sm">
                    See Estimate <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Summary ── */}
            {step === 3 && !submitted && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Your Estimate</h2>

                {/* Big estimate */}
                <div className="brand-gradient rounded-3xl p-6 text-center mb-6 text-white">
                  <p className="text-blue-100 text-sm mb-1 font-medium uppercase tracking-wide">Estimated Project Cost</p>
                  <p className="text-4xl md:text-5xl font-extrabold mb-1">{fmt(low)} – {fmt(high)}</p>
                  <p className="text-blue-200 text-xs">Exclusive of GST · Subject to site assessment</p>
                </div>

                {/* Breakdown */}
                <div className="bg-gray-50 rounded-2xl p-5 mb-6 text-sm">
                  <p className="font-bold text-gray-700 mb-3 uppercase tracking-wide text-xs">Breakdown</p>
                  {[
                    ['Service',  svc?.label],
                    ['Scope',    scp?.label + ' — ' + scp?.desc],
                    ['Duration', dur?.label],
                    ...addons.map(id => [ADDONS.find(a => a.id === id)?.label, '+ ' + fmt(ADDONS.find(a => a.id === id)?.cost)]),
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-1.5 border-b border-gray-200 last:border-0">
                      <span className="text-gray-500">{k}</span>
                      <span className="font-semibold text-gray-900 text-right max-w-[60%]">{v}</span>
                    </div>
                  ))}
                </div>

                {/* Contact form */}
                <div className="mb-6">
                  <p className="font-bold text-gray-700 mb-3 text-sm">Send me this estimate</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    {[['name','Your Name','text'],['email','Email','email'],['phone','Phone','tel']].map(([id,ph,type]) => (
                      <input key={id} type={type} placeholder={ph} value={form[id]}
                        onChange={e => setForm(p => ({...p,[id]:e.target.value}))}
                        className="px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors" />
                    ))}
                    <input placeholder="Notes (optional)" value={form.notes}
                      onChange={e => setForm(p => ({...p,notes:e.target.value}))}
                      className="px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 sm:col-span-1" />
                  </div>
                </div>

                {sendError && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-3">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{sendError}</span>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={sendQuote} disabled={sending}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 brand-gradient text-white font-bold rounded-xl shadow-md hover:opacity-90 disabled:opacity-60">
                    {sending
                      ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Send className="h-4 w-4" />}
                    {sending ? 'Sending…' : 'Send Request to Navgrow'}
                  </button>
                  <a href={`https://wa.me/918927070972?text=${encodeURIComponent(`Hi, I used the Quote Calculator and got an estimate of ${fmt(low)} – ${fmt(high)} for ${svc?.label} (${scp?.label} scope). Can we discuss?`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#25D366] text-white font-bold rounded-xl hover:opacity-90">
                    <MessageCircle className="h-4 w-4" /> Discuss on WhatsApp
                  </a>
                </div>
                <button onClick={sendViaEmailApp}
                  className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700 border-2 border-dashed border-gray-200 hover:border-gray-300 rounded-xl transition-colors">
                  <Mail className="h-3.5 w-3.5" /> Prefer your own mail app? Send via Email instead
                </button>
                <div className="flex items-center justify-between mt-4">
                  <button onClick={() => setStep(2)} className="text-sm text-gray-400 hover:text-gray-600">← Edit Add-ons</button>
                  <button onClick={reset} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600">
                    <RotateCcw className="h-3.5 w-3.5" /> Start Over
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Success ── */}
            {submitted && (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-10">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {sentVia === 'api' ? 'Request Sent to Navgrow!' : 'Email Drafted!'}
                </h3>
                {sentVia === 'api' ? (
                  <>
                    <p className="text-gray-500 mb-2">
                      Your estimate is now with our team — it appears in our dashboard and we've emailed you a copy.
                      We'll respond with a formal quotation within 24 hours.
                    </p>
                    {reference && (
                      <p className="text-xs text-gray-400 mb-6 font-mono">Reference: {reference}</p>
                    )}
                  </>
                ) : (
                  <p className="text-gray-500 mb-6">
                    Your mail app opened with the full estimate — hit send there to reach us at info@navgrow.org.
                  </p>
                )}
                <button onClick={reset} className="inline-flex items-center gap-2 px-7 py-3 brand-gradient text-white font-bold rounded-xl">
                  <RotateCcw className="h-4 w-4" /> Calculate Another
                </button>
              </motion.div>
            )}
          </div>

          {/* Why choose us box */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: '✓', title: 'Transparent Pricing', desc: 'No hidden charges. GST invoicing on all projects.' },
              { icon: '⚡', title: '24hr Quote Response', desc: 'Formal quotation delivered within one business day.' },
              { icon: '🏆', title: 'Quality Guaranteed', desc: 'All projects backed by our Quality First commitment.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-center">
                <div className="text-2xl mb-2">{icon}</div>
                <p className="font-bold text-gray-900 text-sm mb-1">{title}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default QuoteCalculatorPage;
