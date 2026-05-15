import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, MessageCircle, Calculator, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const MobileContactBar = () => {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (dismissed) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          className="fixed bottom-0 left-0 right-0 z-[80] md:hidden"
        >
          {/* Dismiss button */}
          <div className="flex justify-end px-4 py-1.5 bg-gray-900/95">
            <button onClick={() => setDismissed(true)}
              className="text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1 text-xs">
              <X className="h-3 w-3" /> dismiss
            </button>
          </div>

          {/* Action bar */}
          <div className="grid grid-cols-3 bg-gray-900/98 backdrop-blur-md border-t border-gray-700/50 shadow-2xl">
            <a href="tel:+918927070972"
              className="flex flex-col items-center justify-center gap-1 py-3.5 text-white active:bg-white/10 transition-colors border-r border-gray-700/50">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
                <Phone className="h-4.5 w-4.5 text-white" style={{width:'18px',height:'18px'}} />
              </div>
              <span className="text-[11px] font-semibold text-gray-300">Call Now</span>
              <span className="text-[9px] text-gray-500">+91 89270 70972</span>
            </a>

            <a href="https://wa.me/918927070972?text=Hello%20Navgrow%2C%20I%20need%20a%20quote"
              target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-1 py-3.5 text-white active:bg-white/10 transition-colors border-r border-gray-700/50">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{backgroundColor:'#25D366'}}>
                <MessageCircle className="h-4.5 w-4.5 text-white" style={{width:'18px',height:'18px'}} />
              </div>
              <span className="text-[11px] font-semibold text-gray-300">WhatsApp</span>
              <span className="text-[9px] text-gray-500">Quick reply</span>
            </a>

            <Link to="/quote-calculator"
              className="flex flex-col items-center justify-center gap-1 py-3.5 text-white active:bg-white/10 transition-colors">
              <div className="w-9 h-9 rounded-xl gold-gradient flex items-center justify-center">
                <Calculator className="h-4.5 w-4.5 text-white" style={{width:'18px',height:'18px'}} />
              </div>
              <span className="text-[11px] font-semibold text-gray-300">Get Quote</span>
              <span className="text-[9px] text-gray-500">Free estimate</span>
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobileContactBar;
