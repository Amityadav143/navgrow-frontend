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
import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Award, Zap, Users, ShieldCheck, TrendingUp, Building2, Wrench, ArrowRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AnimatedCounter from '@/components/AnimatedCounter';
import CtaSection from '@/components/CtaSection';
import useSeo from '@/hooks/useSeo';

const milestones = [
  { year: '2022', title: 'Company Founded', desc: 'Navgrow Engineering Service Pvt. Ltd. incorporated in Siliguri, West Bengal with a mission of "Quality First...!"' },
  { year: '2023', title: 'First Projects Delivered', desc: 'Executed projects across private sector and defence, establishing our engineering credibility.' },
  { year: '2024', title: 'Railway Contracts', desc: 'Delivered Rainwater Leakage Testing Plant and Modified Hand Brake fitment projects at Siliguri Diesel Loco Shed.' },
  { year: '2025', title: 'MSME & DPIIT Recognition', desc: 'Recognised under DPIIT Startup India and registered as MSME, unlocking priority access to government tenders across sectors.' },
  { year: '2026', title: 'Sustainability Expansion', desc: 'Expanded our engineering practice into sustainability — adding solar energy, rainwater harvesting, water recycling, and energy efficiency to our core capabilities.' },
];

const values = [
  { icon: <ShieldCheck className="h-6 w-6 text-blue-600" />, title: 'Integrity', desc: 'We conduct every project with complete transparency, ethical standards, and accountability to our clients.' },
  { icon: <Award className="h-6 w-6 text-blue-600" />, title: 'Excellence', desc: 'Quality First is not a tagline — it is the benchmark we apply at every stage of planning and execution.' },
  { icon: <Zap className="h-6 w-6 text-blue-600" />, title: 'Innovation', desc: 'We embrace creative engineering to solve complex engineering and sustainability challenges with modern, practical solutions.' },
  { icon: <Users className="h-6 w-6 text-blue-600" />, title: 'Collaboration', desc: 'We work as partners with our clients, stakeholders, and field teams to deliver outcomes that exceed expectations.' },
  { icon: <TrendingUp className="h-6 w-6 text-blue-600" />, title: 'Growth', desc: 'We invest in our people and processes, continuously improving our capabilities and expanding our service range.' },
];

const AboutPage = () => {
  useSeo({
    title: 'About Navgrow | Engineering & Sustainability Company in Siliguri',
    description: 'About Navgrow Engineering Service Pvt. Ltd. — DPIIT-recognised, MSME-registered company in Siliguri, West Bengal. Railway, industrial, and civil engineering plus sustainability solutions like solar energy and rainwater harvesting.',
    path: '/about',
    keywords: 'about Navgrow Engineering, railway engineering company Siliguri, industrial engineering, sustainability solutions, solar energy provider, DPIIT startup, MSME West Bengal',
  });
  return (
    <>
      {/* Hero — split layout with engineering imagery */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f2557] via-[#1e3a8a] to-[#2563eb] text-white">
        {/* subtle grid texture */}
        <div className="absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-blue-400/15 blur-3xl" />
        <div className="container mx-auto px-4 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center py-16 md:py-24">
            {/* Copy */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold tracking-wide uppercase mb-5">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-400" /> DPIIT · MSME · Make in India
              </span>
              <h1 className="text-white mb-5 leading-tight">
                Engineering excellence, built on a <span className="text-amber-400">Quality First</span> promise
              </h1>
              <p className="text-lg text-blue-100/90 mb-8 max-w-xl">
                Navgrow Engineering Service Pvt. Ltd. is a DPIIT-recognised, MSME-registered company
                delivering core engineering — railways, industrial, and civil — alongside modern
                sustainability solutions like solar and rainwater harvesting, from Siliguri, West Bengal.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="/services" className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-[#0f2557] font-bold rounded-xl transition-colors shadow-lg">
                  Our Services <ArrowRight className="h-4 w-4" />
                </a>
                <a href="/contact" className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/25 text-white font-bold rounded-xl transition-colors">
                  Talk to Us
                </a>
              </div>
            </motion.div>

            {/* Hero image */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              <div className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/20 aspect-[4/3] bg-gradient-to-br from-blue-800 to-blue-900">
                <img
                  src="/ng_about_main.png"
                  alt="Navgrow engineer beside a locomotive on the tracks"
                  className="w-full h-full object-cover"
                  loading="eager"
                  decoding="async"
                  onError={(e) => { e.target.onerror = null; e.target.src = '/handbreak.jpg'; }}
                />
              </div>
              {/* floating credential card */}
              <div className="absolute -bottom-5 -left-3 md:-left-5 bg-white rounded-xl px-5 py-3.5 shadow-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Award className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-[#0f2557] font-extrabold leading-tight">Est. 2022</p>
                  <p className="text-gray-500 text-xs">Siliguri, West Bengal</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Trust stats band */}
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/15 rounded-2xl overflow-hidden border border-white/15 mb-2 -mt-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {[
              { v: '2022', l: 'Founded' },
              { v: '10', l: 'Service Lines' },
              { v: 'DPIIT', l: 'Recognised Startup' },
              { v: 'MSME', l: 'Registered' },
            ].map(({ v, l }) => (
              <div key={l} className="bg-[#0f2557]/40 backdrop-blur px-4 py-5 text-center">
                <p className="text-xl md:text-2xl font-extrabold text-amber-400">{v}</p>
                <p className="text-xs md:text-sm text-blue-100/80 mt-0.5">{l}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Company Overview */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="mb-6">Our <span className="gradient-text">Story</span></h2>
              <p className="text-gray-700 mb-6">
                Founded in 2022, Navgrow Engineering Service Pvt. Ltd. was built on a single conviction — that quality and reliability should never be compromised. We earned our engineering credentials on demanding projects for Indian Railways and Wabtec, where precision and compliance are non-negotiable.
              </p>
              <p className="text-gray-700 mb-6">
                Today, we deliver across two complementary capabilities. Our core engineering practice serves Indian Railways, industrial plants, and government projects — while our growing sustainability practice brings solar power, rainwater harvesting, water recycling, and energy efficiency to clients who want to cut costs and emissions. Our DPIIT, MSME, and Make in India registrations reflect a commitment to compliant, domestic-first operations.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                {[
                  { title: 'Engineering Pedigree', sub: 'Railways, industrial & civil — proven on Wabtec' },
                  { title: 'Sustainability Solutions', sub: 'Solar, water, and energy-efficiency systems' },
                  { title: 'Government Compliance', sub: 'DPIIT, MSME & tender-ready processes' },
                  { title: 'Quality First', sub: 'ISO-aligned standards on every project' },
                ].map(({ title, sub }) => (
                  <div key={title} className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-blue-600 mt-1 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
                      <p className="text-sm text-gray-600">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/5 aspect-[4/3] bg-gradient-to-br from-blue-800 to-blue-900">
                <img
                  className="w-full h-full object-cover"
                  alt="Navgrow Engineering project site"
                  src="/handbreak.jpg"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder.jpg'; }}
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-blue-700 rounded-xl p-4 shadow-lg">
                <p className="text-white font-bold text-xl">Quality First</p>
                <p className="text-blue-100 text-sm">Our founding promise</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* By the Numbers — animated stats band */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f2557] to-[#1e3a8a] py-16 md:py-20">
        {/* decorative accents */}
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-teal-400/10 blur-3xl" />

        <div className="container mx-auto px-4 relative">
          <motion.div
            className="text-center max-w-2xl mx-auto mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block text-sm font-bold tracking-[0.2em] uppercase text-amber-400 mb-3">By the Numbers</span>
            <h2 className="text-white">Built on a record of <span className="text-amber-400">quality and trust</span></h2>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4">
            {[
              { icon: Award,      target: '2022',  suffix: '',  label: 'Founded',          sub: 'Incorporated in Siliguri' },
              { icon: Building2,  target: '10',    suffix: '',  label: 'Service Lines',    sub: 'Engineering & sustainability' },
              { icon: CheckCircle,target: '100',   suffix: '%', label: 'On-Time Delivery',  sub: 'Every project, on schedule' },
              { icon: ShieldCheck,target: '3',     suffix: '',  label: 'Govt. Recognitions', sub: 'DPIIT · MSME · Make in India' },
            ].map(({ icon: Icon, target, suffix, label, sub }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="text-center px-3 py-6 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-sm hover:bg-white/[0.07] hover:border-amber-400/30 transition-all duration-300"
              >
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-amber-400/15 flex items-center justify-center">
                  <Icon className="h-6 w-6 text-amber-400" />
                </div>
                <div className="text-4xl md:text-5xl font-extrabold text-white mb-1 tracking-tight">
                  <AnimatedCounter target={target} suffix={suffix} />
                </div>
                <p className="text-sm font-bold text-blue-100 mb-0.5">{label}</p>
                <p className="text-xs text-blue-200/60">{sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Approach — what makes Navgrow different */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center max-w-3xl mx-auto mb-14"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block text-sm font-bold tracking-wide uppercase text-blue-600 mb-3">Our Approach</span>
            <h2 className="mb-4">The same discipline, <span className="gradient-text">every project</span></h2>
            <p className="text-gray-600 text-lg">
              Whether we are modifying a locomotive or installing a solar array, we bring the same compliance-first, ROI-driven, end-to-end discipline — earned on demanding railway and industrial work.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: ShieldCheck, title: 'Compliance-First', desc: 'Every project meets the relevant standards — RDSO and IS codes for engineering works; CGWA, CPCB/SPCB, and BEE norms for sustainability — so approvals are never an afterthought.' },
              { icon: TrendingUp,  title: 'ROI-Driven', desc: 'We quantify outcomes up front — timelines, costs, water saved, energy generated, payback period — so every investment is backed by clear numbers.' },
              { icon: Wrench,      title: 'End-to-End Delivery', desc: 'From feasibility and design through installation and long-term maintenance, you work with one accountable engineering partner.' },
            ].map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className="group bg-gradient-to-br from-gray-50 to-blue-50/40 rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-xl p-7 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-lg font-extrabold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-600 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission / Vision / Values tabs */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center max-w-3xl mx-auto mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="mb-4">Our Guiding <span className="gradient-text">Principles</span></h2>
            <p className="text-gray-600 text-lg">
              The values and vision that drive every project at Navgrow Engineering Service Pvt. Ltd.
            </p>
          </motion.div>

          <Tabs defaultValue="mission" className="max-w-4xl mx-auto">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="mission">Our Mission</TabsTrigger>
              <TabsTrigger value="vision">Our Vision</TabsTrigger>
              <TabsTrigger value="values">Our Values</TabsTrigger>
            </TabsList>

            <TabsContent value="mission" className="mt-8 p-6 bg-white rounded-xl shadow-md">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h3>
              <p className="text-gray-700 mb-4">
                To deliver reliable, high-quality engineering and sustainability solutions — from railway and industrial works to solar power and rainwater harvesting — that help our clients build, operate, and grow efficiently and responsibly.
              </p>
              <p className="text-gray-700">
                We bring proven engineering discipline to every project, ensuring each client receives exceptional results on time and within budget — from first consultation through handover.
              </p>
            </TabsContent>

            <TabsContent value="vision" className="mt-8 p-6 bg-white rounded-xl shadow-md">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Vision</h3>
              <p className="text-gray-700 mb-4">
                To become one of India's most trusted engineering partners — known for a quality-first culture, deep technical expertise across both core engineering and sustainability, and reliable delivery on every project.
              </p>
              <p className="text-gray-700">
                We envision a future where versatile domestic firms like Navgrow help build India's infrastructure and its greener future alike, through Make in India-aligned solutions.
              </p>
            </TabsContent>

            <TabsContent value="values" className="mt-8 p-6 bg-white rounded-xl shadow-md">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Values</h3>
              <ul className="space-y-4">
                {values.map(({ icon, title, desc }) => (
                  <li key={title} className="flex items-start">
                    <span className="mt-0.5 mr-3 flex-shrink-0">{icon}</span>
                    <div>
                      <h4 className="font-semibold text-gray-900">{title}</h4>
                      <p className="text-gray-700">{desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Milestones timeline */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center max-w-3xl mx-auto mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="mb-4">Our <span className="gradient-text">Journey</span></h2>
            <p className="text-gray-600 text-lg">Key milestones since our founding in 2022.</p>
          </motion.div>

          <div className="relative max-w-3xl mx-auto">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-blue-100 hidden md:block" />

            <div className="space-y-10">
              {milestones.map((m, index) => (
                <motion.div
                  key={index}
                  className="flex gap-6 items-start"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold z-10 shadow-md">
                    {m.year.slice(2)}
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex-1">
                    <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">{m.year}</span>
                    <h4 className="font-bold text-gray-900 text-lg mt-1 mb-1">{m.title}</h4>
                    <p className="text-gray-600 text-sm">{m.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Certifications */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center max-w-3xl mx-auto mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="mb-4">Certifications & <span className="gradient-text">Registrations</span></h2>
            <p className="text-gray-600 text-lg">Officially recognised and compliant with national government programmes.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { src: '/DPIIT.png', alt: 'DPIIT Startup India Recognition', label: 'DPIIT Recognised Startup', desc: 'Recognised under Startup India for innovation-driven engineering.' },
              { src: '/makeinindia.png', alt: 'Make in India', label: 'Make in India Partner', desc: 'Committed to domestic-first, self-reliant manufacturing.' },
              { src: '/msme.png', alt: 'MSME Registration', label: 'MSME Registered Enterprise', desc: 'Registered MSME with priority access to government tenders.' },
            ].map(({ src, alt, label, desc }, i) => (
              <motion.div
                key={label}
                className="group relative bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col items-center text-center overflow-hidden hover:shadow-xl hover:border-blue-200 transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-amber-500 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" />
                <div className="h-24 flex items-center justify-center mb-5">
                  <img src={src} alt={alt} className="h-20 w-auto object-contain group-hover:scale-110 transition-transform duration-300" loading="lazy" decoding="async" onError={(e) => { e.target.onerror=null; e.target.style.display='none'; }} />
                </div>
                <p className="text-base font-extrabold text-gray-900 mb-2">{label}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <CtaSection />
    </>
  );
};

export default AboutPage;
