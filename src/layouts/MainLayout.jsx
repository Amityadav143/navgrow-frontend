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
import RfqDrawer from '@/components/RfqDrawer';
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
      {/* Skip link — first focusable element, lets keyboard users jump past the nav */}
      <a href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2.5 focus:rounded-lg focus:bg-blue-700 focus:text-white focus:font-bold focus:shadow-lg">
        Skip to main content
      </a>
      <PageProgress />

      {/* Fixed header wrapper — TenderBanner + Navbar stacked together */}
      <div ref={headerRef} className="fixed top-0 left-0 right-0 z-50" style={{ paddingTop: '3px' }}>
        <TenderBanner />
        <Navbar scrolled={scrolled} onSearchOpen={() => setSearchOpen(true)} />
      </div>

      {/* Dynamic spacer — height matches fixed header */}
      <div style={{ height: headerHeight }} aria-hidden="true" />

      <motion.main
        id="main-content"
        tabIndex={-1}
        className="flex-1 outline-none"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.3 }}
      >
        <Outlet />
      </motion.main>

      <Footer />
      <CartSidebar />
      <RfqDrawer />
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
