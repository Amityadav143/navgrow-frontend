import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import ScrollToTop from '@/components/ScrollToTop';
import ChatBot from '@/components/ChatBot';
import PageProgress from '@/components/PageProgress';
import CartSidebar from '@/components/CartSidebar';
import TenderBanner from '@/components/TenderBanner';
import CookieBanner from '@/components/CookieBanner';
import MobileContactBar from '@/components/MobileContactBar';
import SocialProof from '@/components/SocialProof';
import ExitIntentPopup from '@/components/ExitIntentPopup';
import SearchModal, { useSearchModal } from '@/components/SearchModal';

const MainLayout = () => {
  const { pathname }    = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(80);
  const headerRef       = useRef(null);
  const { open: searchOpen, setOpen: setSearchOpen } = useSearchModal();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!headerRef.current) return;
    const el = headerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeaderHeight(headerRef.current?.offsetHeight ?? 80));
    ro.observe(el);
    setHeaderHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <PageProgress />

      {/* Fixed header wrapper — TenderBanner + Navbar stacked together */}
      <div ref={headerRef} className="fixed top-0 left-0 right-0 z-50" style={{ paddingTop: '3px' }}>
        <TenderBanner />
        <Navbar scrolled={scrolled} onSearchOpen={() => setSearchOpen(true)} />
      </div>

      {/* Dynamic spacer — height matches fixed header */}
      <div style={{ height: headerHeight }} aria-hidden="true" />

      <motion.main
        className="flex-1"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.3 }}
      >
        <Outlet />
      </motion.main>

      <Footer />
      <CartSidebar />
      <CookieBanner />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <WhatsAppButton />
      <ScrollToTop />
      <ChatBot />
      <MobileContactBar />
      <SocialProof />
      <ExitIntentPopup />
    </div>
  );
};

export default MainLayout;
