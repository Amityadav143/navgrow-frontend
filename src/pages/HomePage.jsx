/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 · navgrow.org · info@navgrow.org
 * Unauthorised reproduction, modification or distribution is strictly prohibited.
 */
import React from 'react';
import HeroSection from '@/components/HeroSection';
import StatsSection from '@/components/StatsSection';
import ServicesSection from '@/components/ServicesSection';
import ProjectsSection from '@/components/ProjectsSection';
import TestimonialsSection from '@/components/TestimonialsSection';
import FaqSection from '@/components/FaqSection';
import CtaSection from '@/components/CtaSection';
import ShopPreview from '@/components/ShopPreview';
import IndustriesSection from '@/components/IndustriesSection';
import ProcessSection from '@/components/ProcessSection';
import useSeo from '@/hooks/useSeo';
import { faqSchema } from '@/lib/seo-routes.mjs';

const HomePage = () => {
  useSeo({
    title: 'Railway, Industrial & Engineering Services | Siliguri, West Bengal',
    description: 'Navgrow Engineering Service Pvt. Ltd. — DPIIT-recognised engineering company in Siliguri. Indian Railways infrastructure, loco modification, industrial engineering, civil works, government tenders, and B2B safety products.',
    path: '/',
    keywords: 'engineering company Siliguri, railway contractor West Bengal, industrial engineering India, government contract engineering, loco modification contractor, DPIIT startup Siliguri, MSME engineering firm',
    // The same FAQ the prerendered homepage carries (one source, src/lib/seo-routes.mjs),
    // under the same script id — two different FAQPage blocks on one page is a
    // Search Console error ("Duplicate field FAQPage").
    schema: faqSchema(),
  });
  return (
  <>
    <HeroSection />
    <StatsSection />
    <ServicesSection />
    <IndustriesSection />
    <ProjectsSection />
    <ProcessSection />
    <ShopPreview />
    <TestimonialsSection />
    <FaqSection />
    <CtaSection />
  </>
);
};
export default HomePage;