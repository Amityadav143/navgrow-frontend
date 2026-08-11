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

const HomePage = () => {
  useSeo({
    title: 'Railway, Industrial & Engineering Services | Siliguri, West Bengal',
    description: 'Navgrow Engineering Service Pvt. Ltd. — DPIIT-recognised engineering company in Siliguri. Indian Railways infrastructure, loco modification, industrial engineering, civil works, government tenders, and B2B safety products.',
    path: '/',
    keywords: 'engineering company Siliguri, railway contractor West Bengal, industrial engineering India, government contract engineering, loco modification contractor, DPIIT startup Siliguri, MSME engineering firm',
    schema: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        { "@type": "Question", "name": "What types of engineering projects does Navgrow handle?", "acceptedAnswer": { "@type": "Answer", "text": "Navgrow handles Indian Railways infrastructure (loco modification, shed construction, testing plants), industrial engineering, civil construction, government contracts, safety & compliance audits, and IoT/technology solutions for all sectors." } },
        { "@type": "Question", "name": "Is Navgrow registered with Indian Railways?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Navgrow Engineering is a DPIIT-recognised startup and MSME-registered enterprise with active vendor empanelment for Indian Railways (NER Zone)." } },
        { "@type": "Question", "name": "How do I get a project quote from Navgrow?", "acceptedAnswer": { "@type": "Answer", "text": "Use our free Quote Calculator at navgrow.org/quote-calculator, call +91 89270 70972, or email info@navgrow.org. We respond within 24 business hours." } },
        { "@type": "Question", "name": "Does Navgrow work outside the railway sector?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Navgrow serves railway, industrial manufacturing, civil construction, government and PSU, utilities, procurement, and training sectors across India." } },
        { "@type": "Question", "name": "What products does the Navgrow shop sell?", "acceptedAnswer": { "@type": "Answer", "text": "The Navgrow B2B shop sells ISI-certified safety equipment, railway tools, maintenance supplies, testing instruments, and PPE. Every order includes a GST invoice with HSN codes, with free delivery in Siliguri and transparent PIN-code-based delivery charges elsewhere in India." } }
      ]
  }
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