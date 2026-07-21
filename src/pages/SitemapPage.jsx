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
import useSeo from '@/hooks/useSeo';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Map, ArrowRight, Home, Info, Briefcase, FolderOpen, ShoppingBag, Phone, FileText, Users, Image, Newspaper } from 'lucide-react';
import PageHero from '@/components/PageHero';

const SITEMAP = [
  {
    section: 'Main Pages', icon: Home, color: 'from-blue-500 to-blue-700',
    links: [
      { label: 'Home', path: '/', desc: 'Welcome page with overview of services, projects, and shop' },
      { label: 'About Us', path: '/about', desc: 'Company story, milestones, certifications, and values' },
      { label: 'Contact Us', path: '/contact', desc: 'Contact form, office location map, and direct contact details' },
    ],
  },
  {
    section: 'Services', icon: Briefcase, color: 'from-indigo-500 to-indigo-700',
    links: [
      { label: 'All Services', path: '/services', desc: 'Overview of all engineering services' },
      { label: 'Railway Infrastructure', path: '/services#railway-infrastructure', desc: 'Loco modification, shed construction, testing facilities' },
      { label: 'Industrial Engineering', path: '/services/industrial-engineering', desc: 'Fabrication, storage systems, and mechanical fitment for plants' },
      { label: 'Civil & Construction', path: '/services/civil-construction', desc: 'Structural and civil works for industrial and institutional projects' },
      { label: 'Government Contracts', path: '/services#government-contracts', desc: 'Tender handling, compliance, and project execution' },
      { label: 'Maintenance & AMC', path: '/services/maintenance', desc: 'SLA-backed preventive and corrective maintenance contracts' },
      { label: 'Consulting Services', path: '/services#consulting', desc: 'Strategic advisory for infrastructure projects' },
      { label: 'Safety & Compliance', path: '/services#safety', desc: 'Safety management, audits, and regulatory compliance' },
      { label: 'Technology Solutions', path: '/services#technology', desc: 'IoT, automation, and digital systems for railways' },
      { label: 'Rainwater Harvesting', path: '/services/rainwater-harvesting', desc: 'CGWA-compliant harvesting and groundwater recharge systems' },
      { label: 'Solar Energy Solutions', path: '/services/solar-solutions', desc: 'Rooftop and ground-mount solar with net-metering support' },
      { label: 'Wastewater Treatment & Recycling', path: '/services/wastewater-treatment', desc: 'STP/ETP design-build with treated-water reuse' },
      { label: 'Energy Efficiency & Audits', path: '/services/energy-efficiency', desc: 'BEE-aligned audits and measured-savings retrofits' },
      { label: 'Green Building Consulting', path: '/services/green-building', desc: 'IGBC/GRIHA-aligned sustainability strategy and documentation' },
    ],
  },
  {
    section: 'Projects', icon: FolderOpen, color: 'from-cyan-500 to-cyan-700',
    links: [
      { label: 'All Projects', path: '/projects', desc: 'Portfolio of completed engineering projects' },
      { label: 'Gallery', path: '/gallery', desc: 'Photo gallery of project sites and deliverables' },
    ],
  },
  {
    section: 'Shop', icon: ShoppingBag, color: 'from-violet-500 to-violet-700',
    links: [
      { label: 'All Products', path: '/shop', desc: 'Safety equipment, railway tools, maintenance supplies, PPE' },
      { label: 'Safety Equipment', path: '/shop', desc: 'Helmets, vests, gloves, boots, respirators' },
      { label: 'Railway Tools', path: '/shop', desc: 'Torque wrenches, track gauges, flaw detectors' },
      { label: 'Maintenance Supplies', path: '/shop', desc: 'Greases, solvents, fish bolts, penetrant sprays' },
      { label: 'PPE & Workwear', path: '/shop', desc: 'FR coveralls, face shields, knee pads, sleeve protectors' },
      { label: 'Wishlist', path: '/wishlist', desc: 'Your saved products' },
    ],
  },
  {
    section: 'Company', icon: Users, color: 'from-emerald-500 to-emerald-700',
    links: [
      { label: 'Careers', path: '/careers', desc: 'Open positions and how to apply at Navgrow' },
      { label: 'News & Updates', path: '/news', desc: 'Company news, project updates, and industry insights' },
      { label: 'Quote Calculator', path: '/quote-calculator', desc: 'Interactive 4-step project cost estimator' },
      { label: 'Track Order',       path: '/track-order',       desc: 'Public order tracking by order number' },
      { label: 'My Account',        path: '/account',            desc: 'Order history, profile, wishlist' },
    ],
  },
  {
    section: 'Legal', icon: FileText, color: 'from-orange-500 to-orange-700',
    links: [
      { label: 'Terms & Conditions', path: '/terms', desc: 'Website and shop usage terms' },
      { label: 'Privacy Policy', path: '/privacy', desc: 'How we collect and use personal data' },
      { label: 'Refund & Shipping Policy', path: '/refund-policy', desc: 'Returns, refunds, and delivery terms' },
      { label: 'Sitemap', path: '/sitemap', desc: 'This page — full website structure' },
    ],
  },
];

const SitemapPage = () => {
  useSeo({ title: "Sitemap | All Pages — Navgrow Engineering", description: "Full sitemap of navgrow.org — engineering services, projects, shop, careers, news, and contact pages.", path: "/sitemap" });

  return (
    <>
      <PageHero
      chip={<><Map className="h-4 w-4" /> Navigation</>}
      title={<>Website <span className="gradient-text">Sitemap</span></>}
      subtitle="A complete overview of all pages and sections on navgrow.org."
      breadcrumbs={[{ label: 'Sitemap' }]}
    />

    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SITEMAP.map(({ section, icon: Icon, color, links }, si) => (
            <motion.div key={section}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: si * 0.08 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
                  <Icon className="h-4.5 w-4.5 text-white" style={{ width: 18, height: 18 }} />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">{section}</h3>
              </div>
              <div className="p-2">
                {links.map(({ label, path, desc }) => (
                  <Link key={path + label} to={path}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-blue-50 transition-colors group">
                    <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 mt-0.5 shrink-0 transition-colors" />
                    <div>
                      <p className="font-semibold text-gray-800 text-sm group-hover:text-blue-700 transition-colors">{label}</p>
                      <p className="text-xs text-gray-400 leading-snug mt-0.5">{desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* XML sitemap for search engines / Google Search Console */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mt-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shrink-0">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-lg">XML Sitemap</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Machine-readable sitemap for search engines. Submit this URL in Google Search Console.
            </p>
            <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer"
              className="inline-block mt-2 text-sm font-mono text-blue-600 hover:text-blue-700 break-all">
              https://navgrow.org/sitemap.xml
            </a>
          </div>
          <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl text-sm transition-colors shrink-0">
            <FileText className="h-4 w-4" /> View XML Sitemap
          </a>
        </motion.div>
      </div>
    </section>
    </>
  );
};

export default SitemapPage;
