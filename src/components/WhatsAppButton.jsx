import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown } from 'lucide-react';

const NUM = '918927070972';
const enc = encodeURIComponent;

const MESSAGES = [
  { label: '💬 General Enquiry',   text: 'Hello Navgrow! I\'d like to know more about your engineering services.' },
  { label: '📋 Request a Quote',   text: 'Hi! I need a project quote. Can someone from your team reach out?' },
  { label: '🛒 Shop / Product',     text: 'Hello! I have a question about a product in your shop.' },
  { label: '🚂 Railway Contract',   text: 'Hi Navgrow! I\'d like to discuss a railway engineering contract.' },
  { label: '📦 Track My Order',     text: 'Hello! I need help tracking my order from navgrow.org.' },
  { label: '💼 Career / Jobs',      text: 'Hi! I\'m interested in joining Navgrow. Can we connect?' },
];

const WhatsAppButton = () => {
  const [expanded, setExpanded] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [introDone, setIntroDone] = useState(false);

  // Show intro bubble after 4s on first visit
  useEffect(() => {
    if (sessionStorage.getItem('ng_wa_intro')) return;
    const t = setTimeout(() => {
      setShowIntro(true);
      sessionStorage.setItem('ng_wa_intro', '1');
      setTimeout(() => setShowIntro(false), 5000);
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">

      {/* Intro bubble */}
      <AnimatePresence>
        {showIntro && !expanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 12 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 12 }}
            className="bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 max-w-[200px] text-right"
          >
            <button onClick={() => setShowIntro(false)} className="absolute top-2 right-2 text-gray-300 hover:text-gray-500">
              <X className="h-3 w-3" />
            </button>
            <p className="text-sm font-bold text-gray-800">👋 Need help?</p>
            <p className="text-xs text-gray-500 mt-0.5">Chat with us on WhatsApp — quick replies!</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick messages panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden w-[220px]"
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100" style={{background:'#25D366'}}>
              <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-none">Navgrow Support</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
                  <p className="text-white/80 text-[10px]">Online · Quick replies</p>
                </div>
              </div>
            </div>

            <div className="px-3 py-2">
              <p className="text-[10px] text-gray-400 mb-2 font-medium uppercase tracking-wide">Choose a topic:</p>
              {MESSAGES.map(({label, text}) => (
                <a key={label}
                  href={`https://wa.me/${NUM}?text=${enc(text)}`}
                  target="_blank" rel="noopener noreferrer"
                  onClick={() => setExpanded(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors mb-0.5">
                  <span className="text-base leading-none">{label.split(' ')[0]}</span>
                  <span className="text-[12px] font-medium leading-snug">{label.slice(2)}</span>
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main WhatsApp button */}
      <div className="relative">
        {/* Pulse */}
        {!expanded && (
          <span className="absolute inset-0 rounded-full animate-ping opacity-40" style={{backgroundColor:'#25D366'}} />
        )}
        <motion.button
          onClick={() => setExpanded(e => !e)}
          aria-label="Chat on WhatsApp"
          className="relative w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white"
          style={{ backgroundColor: '#25D366' }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
        >
          <AnimatePresence mode="wait">
            {expanded
              ? <motion.span key="x" initial={{rotate:-90,opacity:0}} animate={{rotate:0,opacity:1}} exit={{rotate:90,opacity:0}} transition={{duration:.15}}>
                  <ChevronDown className="h-6 w-6" />
                </motion.span>
              : <motion.span key="wa" initial={{scale:.5,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:.5,opacity:0}} transition={{duration:.15}}>
                  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                </motion.span>
            }
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
};

export default WhatsAppButton;
