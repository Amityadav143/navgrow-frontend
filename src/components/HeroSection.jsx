import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Phone, MessageCircle, Award, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const badges = [
  { icon: Award,   label: 'DPIIT Recognised' },
  { icon: Shield,  label: 'MSME Registered' },
  { icon: Zap,     label: 'Make in India' },
];

const HeroSection = () => (
  <section className="relative min-h-screen flex items-center overflow-hidden">
    {/* Background */}
    <div className="absolute inset-0 hero-pattern z-0" />
    <div className="absolute inset-0 bg-gradient-to-br from-blue-900/5 via-transparent to-cyan-500/5 z-0" />

    {/* Decorative blobs */}
    <div className="absolute top-32 right-0 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl" />
    <div className="absolute bottom-20 left-0 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl" />

    <div className="container mx-auto px-4 relative z-10 py-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

        {/* Left — text */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
        >
          {/* Chip */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="section-chip mb-6 w-fit"
          >
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Trusted by Indian Railways & Wabtec
          </motion.div>

          <h1 className="font-extrabold leading-tight mb-6 text-gray-900">
            Engineering Solutions for{' '}
            <span className="gradient-text">Railway &amp; Government</span>{' '}
            Contracts
          </h1>

          <p className="text-lg text-gray-600 mb-8 leading-relaxed max-w-lg">
            Delivering excellence in loco modification, shed construction, and infrastructure services.
            Quality-first culture, on-time delivery, compliant processes.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-3 mb-10">
            <Button asChild size="lg" className="btn-gold px-7 shadow-lg">
              <Link to="/services" className="flex items-center gap-2">
                Explore Services
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 group px-7">
              <Link to="/projects">View Our Work</Link>
            </Button>
            <Button asChild size="lg" className="bg-[#25D366] hover:bg-[#1fba58] text-white shadow-md px-7 border border-[#1fa54b]/40">
              <a href="https://wa.me/918927070972" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </Button>
          </div>

          {/* Badge strip */}
          <div className="flex flex-wrap gap-3 mb-6">
            {badges.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-100 shadow-sm text-sm font-medium text-gray-700 card-lift">
                <Icon className="h-4 w-4 text-blue-600" />
                {label}
              </div>
            ))}
          </div>

          {/* Trust proof strip */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-400 font-medium">Trusted by:</span>
            {['Indian Railways (NER)', 'Wabtec Locomotives', 'Govt. of India'].map((c) => (
              <span key={c} className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200">{c}</span>
            ))}
          </div>
        </motion.div>

        {/* Right — image card */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="relative"
        >
          <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-blue-900/20">
            <img
              src="/Railway_Infra.jpg"
              alt="Navgrow Engineering railway infrastructure project"
              className="w-full h-[480px] object-cover"
              fetchPriority="high"
            />
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-blue-900/60 via-transparent to-transparent" />

            {/* Floating stat cards */}
            <motion.div
              className="absolute top-6 left-6 glass-card rounded-2xl p-4 shadow-xl"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <p className="text-2xl font-extrabold text-blue-700">10+</p>
              <p className="text-xs text-gray-600 font-medium">Projects Delivered</p>
            </motion.div>

            <motion.div
              className="absolute bottom-6 right-6 glass-card rounded-2xl p-4 shadow-xl"
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            >
              <p className="text-2xl font-extrabold text-blue-700">3+</p>
              <p className="text-xs text-gray-600 font-medium">Years of Excellence</p>
            </motion.div>

            {/* Bottom label */}
            <div className="absolute bottom-6 left-6">
              <span className="inline-flex items-center gap-2 bg-white/90 rounded-full px-4 py-2 text-sm font-semibold text-blue-800 shadow-md">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                Quality First — Always
              </span>
            </div>
          </div>

          {/* Decorative ring */}
          <div className="absolute -z-10 -bottom-6 -right-6 w-full h-full rounded-3xl border-2 border-blue-200" />
        </motion.div>
      </div>

      {/* Trusted by ticker */}
      <motion.div
        className="mt-20 border-t border-gray-200 pt-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <p className="text-center text-sm text-gray-500 font-medium mb-6 uppercase tracking-wider">
          Trusted By
        </p>
        <div className="flex flex-wrap justify-center items-center gap-8">
          {[
            { src: '/DPIIT.png',        alt: 'DPIIT' },
            { src: '/makeinindia.png',  alt: 'Make in India' },
            { src: '/msme.png',         alt: 'MSME' },
          ].map(({ src, alt }) => (
            <img key={alt} src={src} alt={alt} loading="lazy"
              className="h-10 w-auto object-contain grayscale hover:grayscale-0 transition-all duration-300 opacity-70 hover:opacity-100" />
          ))}
          <div className="flex items-center gap-2 px-5 py-2 rounded-full border border-gray-200 bg-white shadow-sm">
            <img src="/ng_logo.png" alt="Indian Railways" className="h-7 w-auto object-contain" loading="lazy" />
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

export default HeroSection;
