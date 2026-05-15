import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, X, ChevronLeft, ChevronRight, ZoomIn, MapPin } from 'lucide-react';
import PageHero from '@/components/PageHero';
import CtaSection from '@/components/CtaSection';

const PHOTOS = [
  { id: 1,  cat: 'Projects',   src: '/wltpsguj.jpeg',    title: 'Rainwater Leakage Testing Plant',          location: 'Siliguri Diesel Loco Shed',  year: '2025' },
  { id: 2,  cat: 'Projects',   src: '/handbreak.png',    title: 'Modified Hand Brake Fitment',              location: 'Siliguri Diesel Loco Shed',  year: '2025' },
  { id: 3,  cat: 'Projects',   src: '/barricading.png',  title: 'Lube Oil Storage Solutions',               location: 'Siliguri, West Bengal',      year: '2026' },
  { id: 4,  cat: 'Projects',   src: '/Railway_Infra.jpg',title: 'Railway Infrastructure Work',              location: 'North Bengal Zone',          year: '2025' },
  { id: 5,  cat: 'Certifications', src: '/DPIIT.png',    title: 'DPIIT Startup India Recognition',         location: 'Government of India',        year: '2023' },
  { id: 6,  cat: 'Certifications', src: '/makeinindia.png', title: 'Make in India Registration',           location: 'Government of India',        year: '2024' },
  { id: 7,  cat: 'Certifications', src: '/msme.png',     title: 'MSME Registration Certificate',           location: 'Ministry of MSME, India',    year: '2023' },
  { id: 8,  cat: 'Team',       src: '/Railway_Infra.jpg', title: 'Site Safety Briefing',    location: 'Project Site, Siliguri',    year: '2025' },
  { id: 9,  cat: 'Projects',   src: '/barricading.png', title: 'Track Inspection Works',       location: 'NE Railway Zone',           year: '2025' },
  { id: 10, cat: 'Team',       src: '/handbreak.png', title: 'Engineering Team at Work',  location: 'Siliguri Workshop',         year: '2026' },
  { id: 11, cat: 'Projects',   src: '/wltpsguj.jpeg', title: 'Quality Inspection',        location: 'Diesel Loco Shed',          year: '2025' },
  { id: 12, cat: 'Team',       src: '/smsystem.png', title: 'Equipment Calibration',     location: 'Navgrow Workshop',          year: '2026' },
];

const CATS = ['All', 'Projects', 'Team', 'Certifications'];

const LightBox = ({ photo, total, onClose, onPrev, onNext }) => (
  <motion.div className="fixed inset-0 z-[200] bg-gray-950/95 flex items-center justify-center"
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    onClick={onClose}>
    <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 z-10" onClick={onClose}>
      <X className="h-5 w-5" />
    </button>
    <button className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 z-10" onClick={(e) => { e.stopPropagation(); onPrev(); }}>
      <ChevronLeft className="h-5 w-5" />
    </button>
    <button className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 z-10" onClick={(e) => { e.stopPropagation(); onNext(); }}>
      <ChevronRight className="h-5 w-5" />
    </button>

    <div className="max-w-4xl w-full mx-4" onClick={e => e.stopPropagation()}>
      <motion.img key={photo.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        src={photo.src} alt={photo.title}
        className="w-full max-h-[70vh] object-contain rounded-2xl"
        onError={(e) => { e.target.onerror=null; e.target.src='/Railway_Infra.jpg'; }} />
      <div className="mt-4 text-center">
        <h3 className="font-bold text-white text-xl">{photo.title}</h3>
        <p className="text-gray-400 text-sm mt-1 flex items-center justify-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />{photo.location} · {photo.year}
        </p>
        <p className="text-gray-600 text-xs mt-2">{photo.id} / {total}</p>
      </div>
    </div>
  </motion.div>
);

const GalleryPage = () => {
  const [cat, setCat]       = useState('All');
  const [lightbox, setLightbox] = useState(null);

  const visible = cat === 'All' ? PHOTOS : PHOTOS.filter(p => p.cat === cat);
  const lb = lightbox !== null ? visible[lightbox] : null;

  return (
    <>
      <PageHero
        chip={<><Image className="h-4 w-4" /> Gallery</>}
        title={<>Project <span className="gradient-text">Gallery</span></>}
        subtitle="Photos from our completed projects, team at work, and certifications."
        breadcrumbs={[{ label: 'Gallery' }]}
      />

      <section className="py-14 bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4">
          {/* Filter */}
          <div className="flex flex-wrap gap-2 mb-8">
            {CATS.map(c => (
              <button key={c} onClick={() => { setCat(c); setLightbox(null); }}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${cat === c ? 'brand-gradient text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'}`}>
                {c}
              </button>
            ))}
          </div>

          {/* Masonry-style grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {visible.map((photo, i) => (
              <motion.div key={photo.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
                className="group relative overflow-hidden rounded-2xl cursor-pointer bg-gray-200 aspect-square shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                onClick={() => setLightbox(i)}>
                <img src={photo.src} alt={photo.title} loading="lazy" decoding="async"
                  onError={(e) => { e.target.onerror=null; e.target.src='/Railway_Infra.jpg'; }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <p className="text-white text-xs font-bold leading-snug">{photo.title}</p>
                  <p className="text-gray-300 text-[10px] flex items-center gap-1 mt-0.5"><MapPin className="h-2.5 w-2.5" />{photo.location}</p>
                </div>
                <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ZoomIn className="h-3.5 w-3.5 text-white" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {lb && <LightBox photo={lb} total={visible.length} onClose={() => setLightbox(null)}
          onPrev={() => setLightbox(i => (i - 1 + visible.length) % visible.length)}
          onNext={() => setLightbox(i => (i + 1) % visible.length)} />}
      </AnimatePresence>

      <CtaSection />
    </>
  );
};

export default GalleryPage;
