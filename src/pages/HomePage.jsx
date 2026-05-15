import React from 'react';
import HeroSection from '@/components/HeroSection';
import StatsSection from '@/components/StatsSection';
import ServicesSection from '@/components/ServicesSection';
import ProjectsSection from '@/components/ProjectsSection';
import TestimonialsSection from '@/components/TestimonialsSection';
import FaqSection from '@/components/FaqSection';
import CtaSection from '@/components/CtaSection';
import ShopPreview from '@/components/ShopPreview';
import useSeo from '@/hooks/useSeo';

const HomePage = () => {
  useSeo({ title: 'Home', description: 'DPIIT-recognised engineering firm for Indian Railways and government contracts. Loco modification, shed construction, safety compliance. Siliguri, West Bengal.', path: '/' });
  return (
  <>
    <HeroSection />
    <StatsSection />
    <ServicesSection />
    <ProjectsSection />
    <ShopPreview />
    <TestimonialsSection />
    <FaqSection />
    <CtaSection />
  </>
);
};
export default HomePage;