/**
 * HeroSection — Navgrow Engineering Service Pvt. Ltd.
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 · navgrow.org
 *
 * PROPRIETARY & CONFIDENTIAL
 * This source code is the exclusive property of Navgrow Engineering Service
 * Pvt. Ltd. Unauthorised copying, modification, distribution or use of this
 * file, via any medium, is strictly prohibited without prior written consent.
 *
 * Designed & Developed for: Navgrow Engineering Service Pvt. Ltd.
 * Platform: navgrow.org — Full-Stack B2B Engineering Platform v1.0
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight, CheckCircle, MessageCircle,
  Award, Shield, Zap, Users, Clock, Globe,
  ChevronRight, Star, TrendingUp, Package,
} from 'lucide-react';

/* ── Animated number counter ─────────────────────────────────────────────── */
const Counter = ({ target, suffix = '', duration = 1400 }) => {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setN(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, duration]);
  return <span ref={ref}>{n}{suffix}</span>;
};

/* ── Stats ───────────────────────────────────────────────────────────────── */
const STATS = [
  { target: 30,  suffix: '+', label: 'Projects Delivered',  icon: CheckCircle,  color: 'text-blue-600',   bg: 'bg-blue-50'   },
  { target: 3,   suffix: '+', label: 'Years of Excellence', icon: Award,        color: 'text-amber-600',  bg: 'bg-amber-50'  },
  { target: 100, suffix: '%', label: 'On-Time Delivery',    icon: Clock,        color: 'text-green-600',  bg: 'bg-green-50'  },
  { target: 12,  suffix: '+', label: 'Industry Clients',    icon: Users,        color: 'text-violet-600', bg: 'bg-violet-50' },
];

/* ── Trust badges ────────────────────────────────────────────────────────── */
const BADGES = [
  { icon: Award,  label: 'DPIIT Recognised'  },
  { icon: Shield, label: 'MSME Registered'   },
  { icon: Zap,    label: 'Make in India'      },
  { icon: Globe,  label: 'Pan-India Ops'      },
];

/* ── Floating card widget ─────────────────────────────────────────────────── */
const FloatCard = ({ children, delay = 0, className = '' }) => (
  <motion.div
    className={`glass-card rounded-2xl shadow-xl border border-white/60 ${className}`}
    animate={{ y: [0, -8, 0] }}
    transition={{ duration: 3.5 + delay, repeat: Infinity, ease: 'easeInOut', delay }}>
    {children}
  </motion.div>
);

/* ══ HERO VISUAL — Premium engineering dashboard card ═══════════════════════
 * A rich, data-driven engineering dashboard visual — no external images needed,
 * fully SVG + CSS, always crisp, zero load-time, copyright-safe.
 * Represents: engineering project lifecycle, safety compliance, live metrics.
 * ════════════════════════════════════════════════════════════════════════════ */
const HeroVisual = () => (
  <div className="relative w-full max-w-[580px] mx-auto lg:mx-0">
    {/* Decorative rings */}
    <div className="absolute -inset-3 rounded-[32px] border-2 border-blue-100 -z-10" />
    <div className="absolute -inset-6 rounded-[38px] border border-blue-50 -z-10" />

    {/* Main card */}
    <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 rounded-3xl overflow-hidden shadow-2xl shadow-blue-900/30"
      style={{ minHeight: 480 }}>

      {/* Top bar — browser/app chrome */}
      <div className="flex items-center gap-2 px-5 py-3.5 bg-black/30 border-b border-white/5">
        <div className="flex gap-1.5">
          {['bg-red-500','bg-amber-400','bg-green-500'].map(c =>
            <div key={c} className={`w-3 h-3 rounded-full ${c} opacity-80`}/>)}
        </div>
        <div className="flex-1 mx-3">
          <div className="bg-white/10 rounded-md px-3 py-1 text-[11px] text-blue-200/70 font-mono max-w-[220px]">
            navgrow.org / project-dashboard
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/>
          <span className="text-[10px] text-green-400 font-semibold">LIVE</span>
        </div>
      </div>

      {/* Dashboard header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <p className="text-[11px] text-blue-300/70 font-semibold uppercase tracking-widest mb-0.5">
            Project Dashboard · FY 2025–26
          </p>
          <h3 className="text-white font-extrabold text-lg leading-tight">
            Engineering Operations
          </h3>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>
          <span className="text-green-300 text-[11px] font-bold">All Systems Active</span>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-2 px-5 mb-4">
        {[
          { label: 'Active Projects', value: '8',    delta: '+3', color: 'text-blue-300',  bar: 'bg-blue-500' },
          { label: 'Compliance',      value: '100%', delta: '✓',  color: 'text-green-300', bar: 'bg-green-500' },
          { label: 'On Schedule',     value: '94%',  delta: '+2%',color: 'text-amber-300', bar: 'bg-amber-500' },
        ].map(k => (
          <div key={k.label}
            className="bg-white/5 border border-white/8 rounded-2xl p-3">
            <p className="text-[10px] text-blue-200/50 font-medium mb-1.5">{k.label}</p>
            <p className={`text-xl font-extrabold ${k.color}`}>{k.value}</p>
            <div className="flex items-center gap-1 mt-1.5">
              <div className="flex-1 bg-white/10 rounded-full h-1 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${k.bar}`}
                  initial={{ width: 0 }}
                  animate={{ width: k.value.replace('%','') + '%' }}
                  transition={{ delay: 0.8, duration: 1.2, ease: 'easeOut' }}
                />
              </div>
              <span className={`text-[9px] font-bold ${k.color}`}>{k.delta}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Project cards */}
      <div className="px-5 mb-4 space-y-2">
        {[
          { name: 'Locomotive Hand-Brake Modification', client: 'Indian Railways · NFR Zone',       status: 'IN PROGRESS', pct: 78, color: 'bg-blue-500'    },
          { name: 'Industrial Lube-Oil Storage System',  client: 'Wabtec Corporation',                status: 'COMPLETED',   pct: 100,color: 'bg-green-500'   },
          { name: 'Rooftop Solar Installation',          client: 'Industrial Client · Siliguri',      status: 'IN REVIEW',   pct: 55, color: 'bg-amber-500'   },
        ].map((p, i) => (
          <motion.div key={p.name}
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.15 }}
            className="flex items-center gap-3 bg-white/5 border border-white/8 rounded-xl px-3 py-2.5">
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${p.color}`}
              style={{ boxShadow: `0 0 6px currentColor` }}/>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-white text-xs font-semibold truncate">{p.name}</p>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                  p.status === 'COMPLETED' ? 'bg-green-500/20 text-green-300' :
                  p.status === 'IN PROGRESS' ? 'bg-blue-500/20 text-blue-300' :
                  'bg-amber-500/20 text-amber-300'
                }`}>{p.status}</span>
              </div>
              <p className="text-blue-200/50 text-[10px] truncate mb-1.5">{p.client}</p>
              <div className="bg-white/10 rounded-full h-1.5 overflow-hidden">
                <motion.div className={`h-full rounded-full ${p.color}`}
                  initial={{ width: 0 }} animate={{ width: `${p.pct}%` }}
                  transition={{ delay: 0.6 + i * 0.2, duration: 1, ease: 'easeOut' }}/>
              </div>
            </div>
            <span className="text-white/60 text-[11px] font-bold shrink-0">{p.pct}%</span>
          </motion.div>
        ))}
      </div>

      {/* Safety + certifications row */}
      <div className="grid grid-cols-2 gap-2 px-5 pb-5">
        <div className="bg-white/5 border border-white/8 rounded-2xl p-3">
          <p className="text-[10px] text-blue-200/50 font-semibold mb-2 uppercase tracking-wide">
            Safety Score
          </p>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-extrabold text-green-400">A+</span>
            <div className="flex gap-0.5 mb-0.5">
              {[...Array(5)].map((_,i) =>
                <div key={i} className="w-2 h-2 rounded-full bg-green-500"/>)}
            </div>
          </div>
          <p className="text-[10px] text-green-300/70 mt-1">ISI Compliant · 0 incidents</p>
        </div>
        <div className="bg-white/5 border border-white/8 rounded-2xl p-3">
          <p className="text-[10px] text-blue-200/50 font-semibold mb-2 uppercase tracking-wide">
            Certifications
          </p>
          <div className="flex flex-col gap-1">
            {['DPIIT','Startup India', 'MSME', 'Make in India'].map(c => (
              <div key={c} className="flex items-center gap-1.5">
                <CheckCircle className="h-3 w-3 text-green-400 shrink-0"/>
                <span className="text-[10px] text-white/70 font-medium">{c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* Floating cards */}
    <FloatCard delay={0}
      className="absolute -top-5 -right-4 px-4 py-3 hidden sm:block">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
          <TrendingUp className="h-4 w-4 text-white"/>
        </div>
        <div>
          <p className="text-xs font-extrabold text-gray-900">₹1.40 Cr</p>
          <p className="text-[10px] text-gray-500">FY26 Target</p>
        </div>
      </div>
    </FloatCard>

    <FloatCard delay={1.2}
      className="absolute -bottom-5 -left-4 px-4 py-3 hidden sm:block">
      <div className="flex items-center gap-2.5">
        <div className="flex -space-x-2 shrink-0">
          {['bg-blue-500','bg-amber-500','bg-green-500'].map((c,i) => (
            <div key={i} className={`w-7 h-7 rounded-full ${c} border-2 border-white flex items-center justify-center`}>
              <span className="text-[9px] text-white font-bold">{['IR','WB','IN'][i]}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_,i) => <Star key={i} className="h-2.5 w-2.5 fill-amber-400 text-amber-400"/>)}
          </div>
          <p className="text-[10px] text-gray-500">12+ Happy Clients</p>
        </div>
      </div>
    </FloatCard>
  </div>
);

/* ══ MAIN HERO COMPONENT ════════════════════════════════════════════════════ */
const HeroSection = () => (
  <section className="relative min-h-[100svh] flex items-center overflow-hidden bg-white">
    {/* Background mesh */}
    <div className="absolute inset-0 hero-pattern z-0 opacity-60" />
    <div className="absolute inset-0 z-0"
      style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(37,99,235,0.08), transparent)' }}/>

    {/* Blobs */}
    <div className="absolute top-20 right-0 w-96 h-96 bg-blue-400/6 rounded-full blur-3xl pointer-events-none -z-0"/>
    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-400/5 rounded-full blur-3xl pointer-events-none -z-0"/>

    <div className="container mx-auto px-4 relative z-10 py-20 lg:py-24">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 xl:gap-20 items-center">

        {/* ── LEFT — Copy ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: -32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}>

          {/* Live chip */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="section-chip mb-6 w-fit">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0"/>
            DPIIT Recognised · Startup India · Indian Railway Approved Vendor · MSME Registered
          </motion.div>

          {/* H1 */}
          <h1 className="font-extrabold leading-[1.08] mb-5 text-gray-900 tracking-tight">
            Engineering <br className="hidden sm:block"/>
            <span className="gradient-text-royal">Excellence</span>
            <br/>for India's Growth
          </h1>

          {/* Sub */}
          <p className="text-lg text-gray-600 mb-3 leading-relaxed max-w-lg">
            Navgrow Engineering delivers turnkey solutions for Indian Railways, government
            contracts, industrial plants, and civil infrastructure — plus sustainability
            services like solar and rainwater harvesting. On time, on budget, fully compliant.
          </p>

          {/* Social proof line */}
          <p className="text-sm font-semibold text-blue-700 mb-8 flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5"/>
            Trusted by Indian Railways, Wabtec Corp., and 5+ industrial clients
          </p>

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-3 mb-10">
            <Link to="/services"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 btn-gold font-bold rounded-2xl shadow-lg hover:opacity-90 transition-opacity text-[15px]">
              Explore Services
              <ArrowRight className="h-4 w-4"/>
            </Link>
            <Link to="/quote-calculator"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-white border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-800 font-bold rounded-2xl transition-all text-[15px] shadow-sm">
              Get a Quote
            </Link>
            <a
              href="https://wa.me/918927070972?text=Hello%20Navgrow%2C%20I%27d%20like%20to%20discuss%20a%20project."
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-3.5 font-bold rounded-2xl transition-all text-[15px] shadow-md border border-green-600/20"
              style={{ backgroundColor: '#25D366', color: 'white' }}>
              <MessageCircle className="h-4 w-4"/>
              WhatsApp Us
            </a>
          </div>

          {/* Badge strip */}
          <div className="flex flex-wrap gap-2.5 mb-7">
            {BADGES.map(({ icon: Icon, label }) => (
              <div key={label}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-100 shadow-sm text-sm font-semibold text-gray-700 hover:border-blue-200 hover:shadow-md transition-all">
                <Icon className="h-4 w-4 text-blue-600 shrink-0"/>
                {label}
              </div>
            ))}
          </div>

          {/* Trust bar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs text-gray-400 font-medium shrink-0">Trusted by:</span>
            {['Indian Railways', 'Wabtec Corp.', 'Govt. of India', 'MSME Sector'].map(c => (
              <span key={c}
                className="text-xs font-semibold text-gray-600 bg-gray-100/80 px-3 py-1.5 rounded-full border border-gray-200/80">
                {c}
              </span>
            ))}
          </div>
        </motion.div>

        {/* ── RIGHT — Visual ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}>
          <HeroVisual/>
        </motion.div>
      </div>

      {/* ── STATS STRIP ─────────────────────────────────────────────────── */}
      {/* <motion.div
        className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.55 }}>
        {STATS.map(({ target, suffix, label, icon: Icon, color, bg }) => (
          <div key={label}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center hover:shadow-md hover:border-blue-100 transition-all group">
            <div className={`w-11 h-11 ${bg} rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
              <Icon className={`h-5 w-5 ${color}`}/>
            </div>
            <p className="text-3xl font-black text-gray-900 tabular-nums">
              <Counter target={target} suffix={suffix}/>
            </p>
            <p className="text-xs text-gray-500 font-medium mt-1 leading-tight">{label}</p>
          </div>
        ))}
      </motion.div> */}

      {/* ── LOGO STRIP ────────────────────────────────────────────────── */}
      <motion.div
        className="mt-14 pt-10 border-t border-gray-100"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}>
        <p className="text-center text-[11px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-7">
          Certifications &amp; Recognitions
        </p>
        <div className="flex flex-wrap justify-center items-center gap-8">
          {[
            { src: '/DPIIT.png',       alt: 'DPIIT — Department for Promotion of Industry' },
            { src: '/makeinindia.png', alt: 'Make in India — Government of India'           },
            { src: '/msme.png',        alt: 'MSME — Ministry of Micro, Small & Medium Enterprises' },
          ].map(({ src: s, alt }) => (
            <img key={alt} src={s} alt={alt} loading="lazy" width={120} height={40}
              className="h-9 w-auto object-contain grayscale hover:grayscale-0 opacity-60 hover:opacity-100 transition-all duration-300"
              onError={e => { e.currentTarget.style.display = 'none'; }}/>
          ))}
          {/* <div className="px-5 py-2.5 rounded-full border border-gray-200 bg-white shadow-sm">
            <img src="/ng_logo.png" alt="Navgrow Engineering" loading="lazy"
              className="h-7 w-auto object-contain"
              onError={e => { e.currentTarget.style.display = 'none'; }}/>
          </div> */}
        </div>
      </motion.div>
    </div>
  </section>
);

export default HeroSection;
