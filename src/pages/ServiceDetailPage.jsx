/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 · navgrow.org · info@navgrow.org
 *
 * ServiceDetailPage — /services/:slug
 * One data-driven page renders all 10 service lines (engineering + sustainability)
 * with a full marketing-grade layout: hero, overview, deliverables, process,
 * outcomes, standards, FAQs, related services, and CTA.
 */
import React, { useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Train, Factory, Building2, Landmark, Wrench, CloudRain, Sun, Recycle, Gauge, Leaf,
  CheckCircle2, ArrowRight, ArrowLeft, Phone, MessageCircle, ShieldCheck, Award,
  ChevronDown, FileText, Sparkles,
} from 'lucide-react';
import { getService, SERVICES } from '@/data/servicesData';
import useSeo from '@/hooks/useSeo';

const ICONS = { Train, Factory, Building2, Landmark, Wrench, CloudRain, Sun, Recycle, Gauge, Leaf };

/* Category theming — engineering (blue) vs sustainability (emerald) */
const THEME = {
  engineering: {
    label: 'Engineering Services',
    grad: 'from-blue-900 via-blue-950 to-[#0F2557]',
    badge: 'bg-blue-500/20 text-blue-100 ring-1 ring-blue-300/30',
    accentText: 'text-blue-700', accentBg: 'bg-blue-600', accentSoft: 'bg-blue-50',
    chip: 'bg-blue-50 text-blue-800 ring-1 ring-blue-100',
    step: 'bg-blue-600',
  },
  sustainability: {
    label: 'Sustainability Solutions',
    grad: 'from-emerald-900 via-teal-950 to-[#0F2557]',
    badge: 'bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-300/30',
    accentText: 'text-emerald-700', accentBg: 'bg-emerald-600', accentSoft: 'bg-emerald-50',
    chip: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100',
    step: 'bg-emerald-600',
  },
};

const FaqItem = ({ q, a, open, onToggle }) => (
  <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
    <button onClick={onToggle} aria-expanded={open}
      className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left">
      <span className="font-bold text-gray-900 text-sm md:text-base">{q}</span>
      <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <p className="px-5 pb-5 text-sm text-gray-600 leading-relaxed">{a}</p>}
  </div>
);

const ServiceDetailPage = () => {
  const { slug } = useParams();
  const service = getService(slug);
  const [openFaq, setOpenFaq] = useState(0);

  useSeo({
    title: service ? `${service.title} — ${service.category === 'engineering' ? 'Engineering Services' : 'Sustainability Solutions'}` : 'Service',
    description: service ? `${service.tagline} ${service.description}` : '',
    path: service ? `/services/${service.slug}` : '/services',
    keywords: service ? `${service.title}, ${service.standards.slice(0, 3).join(', ')}, Siliguri, West Bengal, Navgrow` : undefined,
    schema: service ? {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: service.title,
      description: service.description,
      provider: { '@type': 'Organization', name: 'Navgrow Engineering Service Pvt. Ltd.', url: 'https://navgrow.org' },
      areaServed: 'IN',
      serviceType: service.title,
    } : undefined,
  });

  if (!service) return <Navigate to="/services" replace />;

  const t = THEME[service.category];
  const Icon = ICONS[service.icon] || Wrench;
  const related = (service.related || []).map(getService).filter(Boolean);

  return (
    <div className="bg-white">
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className={`relative overflow-hidden bg-gradient-to-br ${t.grad}`}>
        <img src={service.image} alt={service.imageAlt} loading="eager" decoding="async"
          className="absolute inset-0 w-full h-full object-cover opacity-25"
          onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }} />
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/35 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          {/* breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6 text-xs md:text-sm text-white/70 flex items-center gap-1.5 flex-wrap">
            <Link to="/" className="hover:text-white transition-colors">Home</Link><span>/</span>
            <Link to="/services" className="hover:text-white transition-colors">Services</Link><span>/</span>
            <span className="text-white font-semibold">{service.title}</span>
          </nav>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${t.badge}`}>
              <Icon className="h-3.5 w-3.5" /> {t.label}
            </span>
            <h1 className="mt-5 text-3xl md:text-5xl font-extrabold text-white leading-tight max-w-3xl">
              {service.title}
            </h1>
            <p className="mt-4 text-lg md:text-xl text-white/85 max-w-2xl leading-relaxed">{service.tagline}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/contact"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-blue-950 font-bold text-sm shadow-lg transition-colors">
                Request a Consultation <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="https://wa.me/918927070972" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#25D366] hover:bg-[#1fba59] text-white font-bold text-sm ring-1 ring-white/25 transition-colors">
                <MessageCircle className="h-4 w-4" /> WhatsApp Us
              </a>
              <a href="tel:+918927070972"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#25D366] hover:bg-[#1fba59] text-white font-bold text-sm ring-1 ring-white/25 transition-colors">
                <Phone className="h-4 w-4" /> +91 89270 70972
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── OVERVIEW + QUICK FACTS ───────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2">
          <p className={`text-xs font-bold uppercase tracking-widest ${t.accentText} mb-3`}>Overview</p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-6">
            {service.description}
          </h2>
          {service.overview.map((para, i) => (
            <p key={i} className="text-gray-600 leading-relaxed mb-4">{para}</p>
          ))}
        </div>
        <aside className="lg:col-span-1">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 sticky top-28">
            <h3 className="font-extrabold text-gray-900 mb-4 flex items-center gap-2">
              <ShieldCheck className={`h-5 w-5 ${t.accentText}`} /> At a Glance
            </h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Practice</dt><dd className="font-bold text-gray-900 text-right">{t.label}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Delivery</dt><dd className="font-bold text-gray-900 text-right">Design · Build · Maintain</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Coverage</dt><dd className="font-bold text-gray-900 text-right">Siliguri · North Bengal · Eastern India</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Response</dt><dd className="font-bold text-gray-900 text-right">Within 1 business day</dd></div>
            </dl>
            <div className="mt-5 pt-5 border-t border-gray-200 flex items-start gap-2.5">
              <Award className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-gray-600 leading-relaxed">
                DPIIT Recognised · MSME Registered · Make in India · <strong>Indian Railway Approved Vendor</strong>
              </p>
            </div>
            <Link to="/contact"
              className={`mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl ${t.accentBg} hover:opacity-90 text-white font-bold text-sm transition-opacity`}>
              <FileText className="h-4 w-4" /> Get a Formal Quotation
            </Link>
          </div>
        </aside>
      </section>

      {/* ── WHAT WE DELIVER ──────────────────────────────────────────────── */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <p className={`text-xs font-bold uppercase tracking-widest ${t.accentText} mb-3`}>Scope of Work</p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-10">What we deliver</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {service.deliverables.map((d, i) => {
              const [head, ...rest] = d.split(' — ');
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ duration: 0.35, delay: i * 0.04 }}
                  className="flex gap-4 p-5 rounded-2xl bg-white border border-gray-200 hover:shadow-md transition-shadow">
                  <CheckCircle2 className={`h-5 w-5 mt-0.5 shrink-0 ${t.accentText}`} />
                  <p className="text-sm text-gray-700 leading-relaxed">
                    <strong className="text-gray-900">{head}</strong>
                    {rest.length > 0 && <> — {rest.join(' — ')}</>}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── PROCESS ──────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <p className={`text-xs font-bold uppercase tracking-widest ${t.accentText} mb-3`}>How We Work</p>
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-10">A process you can hold us to</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {service.process.map((p, i) => (
            <motion.div key={p.step} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.35, delay: i * 0.06 }}
              className="relative p-6 rounded-2xl border border-gray-200 bg-white">
              <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${t.step} text-white font-extrabold text-sm mb-4`}>
                {p.step}
              </span>
              <h3 className="font-bold text-gray-900 mb-2 text-sm md:text-base">{p.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{p.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── OUTCOMES + STANDARDS ─────────────────────────────────────────── */}
      <section className="bg-[#0F2557]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-3">Why It Pays</p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-10">Outcomes you can expect</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
            {service.outcomes.map((o, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white/5 ring-1 ring-white/10">
                <Sparkles className="h-5 w-5 text-amber-400 mb-3" />
                <h3 className="font-bold text-white mb-2 text-sm md:text-base">{o.title}</h3>
                <p className="text-sm text-blue-100/80 leading-relaxed">{o.text}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2.5">
            {service.standards.map((s) => (
              <span key={s} className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/10 text-blue-100 ring-1 ring-white/15">
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <p className={`text-xs font-bold uppercase tracking-widest ${t.accentText} mb-3 text-center`}>Common Questions</p>
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-10 text-center">
          {service.title} — FAQs
        </h2>
        <div className="space-y-3">
          {service.faqs.map((f, i) => (
            <FaqItem key={i} q={f.q} a={f.a} open={openFaq === i}
              onToggle={() => setOpenFaq(openFaq === i ? -1 : i)} />
          ))}
        </div>
      </section>

      {/* ── RELATED SERVICES ─────────────────────────────────────────────── */}
      {related.length > 0 && (
        <section className="bg-gray-50 border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 mb-8">Related services</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {related.map((r) => {
                const rt = THEME[r.category]; const RIcon = ICONS[r.icon] || Wrench;
                return (
                  <Link key={r.slug} to={`/services/${r.slug}`}
                    className="group p-6 rounded-2xl bg-white border border-gray-200 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                    <span className={`inline-flex p-2.5 rounded-xl ${rt.accentSoft} mb-4`}>
                      <RIcon className={`h-6 w-6 ${rt.accentText}`} />
                    </span>
                    <h3 className="font-bold text-gray-900 mb-1.5">{r.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed mb-3 line-clamp-2">{r.tagline}</p>
                    <span className={`inline-flex items-center gap-1 text-sm font-bold ${rt.accentText}`}>
                      Explore <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </Link>
                );
              })}
            </div>
            <Link to="/services" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-blue-700 transition-colors">
              <ArrowLeft className="h-4 w-4" /> View all 10 services
            </Link>
          </div>
        </section>
      )}

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-[#0F2557] to-blue-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white">Ready to discuss {service.title.toLowerCase()}?</h2>
            <p className="mt-2 text-blue-100/85">Formal, GST-compliant quotation within 1 business day. Site visits across North Bengal.</p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link to="/contact"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-blue-950 font-bold text-sm transition-colors">
              Request a Quote <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="https://wa.me/918927070972" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm ring-1 ring-white/25 transition-colors">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ServiceDetailPage;
