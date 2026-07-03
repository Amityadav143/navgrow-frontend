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
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, Droplets, Sun, Recycle, Leaf, Gauge, Train, Factory, Building2, Landmark, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CtaSection from '@/components/CtaSection';
import useSeo from '@/hooks/useSeo';

const engineeringServices = [
  {
    id: 'railway-infrastructure',
    icon: <Train className="h-12 w-12 text-blue-600" />,
    title: 'Railway Infrastructure',
    description: 'Specialised railway engineering for Indian Railways — locomotive modification, testing plants, shed works, and track infrastructure delivered to RDSO standards.',
    features: [
      'Locomotive Modification & Fitments – Hand-brake fitment, retrofits, and improvements executed to Indian Railways technical specifications.',
      'Testing Plants – Rainwater leakage testing plants and specialised facilities for electric locomotives.',
      'Diesel Loco Shed Works – Shed construction, renovation, and infrastructure upgrades (NER/NFR Zone experience).',
      'Track & Civil Works – Track infrastructure, platforms, and allied civil works for railway facilities.',
      'RDSO Compliance – All works aligned to RDSO guidelines and Indian Railways quality norms.',
      'Inspection & Documentation – Test certificates, inspection reports, and completion documentation.',
    ],
    image: '/smsystem.jpg',
    imageAlt: 'Railway infrastructure and locomotive engineering project',
  },
  {
    id: 'industrial-engineering',
    icon: <Factory className="h-12 w-12 text-blue-600" />,
    title: 'Industrial Engineering',
    description: 'Turnkey industrial engineering and fabrication for manufacturing plants — from storage systems to mechanical fitment and plant support.',
    features: [
      'Industrial Fabrication – Custom fabrication and storage systems, including lube-oil storage solutions for clients like Wabtec.',
      'Mechanical Fitment & Retrofitting – Installation, modification, and upgrade of plant machinery and systems.',
      'Plant Maintenance Support – Engineering support for manufacturing and processing facilities.',
      'Material Handling – Design and installation of material-handling and storage infrastructure.',
      'Quality Assurance – ISO-aligned quality processes with stage-wise inspection.',
      'Safety Compliance – Engineering delivered to industrial safety and statutory standards.',
    ],
    image: '/barricading.jpg',
    imageAlt: 'Industrial fabrication and engineering works',
  },
  {
    id: 'civil-construction',
    icon: <Building2 className="h-12 w-12 text-blue-600" />,
    title: 'Civil & Construction',
    description: 'Structural and civil construction works for industrial, institutional, and infrastructure projects — built to last and delivered on schedule.',
    features: [
      'Structural Construction – RCC and steel structures for industrial and institutional facilities.',
      'Site Development – Grading, drainage, roads, and allied site-infrastructure works.',
      'Civil Infrastructure – Foundations, buildings, and supporting civil works for plants and facilities.',
      'Renovation & Upgrades – Modernisation and capacity expansion of existing structures.',
      'Project Management – End-to-end planning, scheduling, and supervision.',
      'Compliance & Safety – Works executed to relevant IS codes and safety standards.',
    ],
    image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1000&q=80',
    imageAlt: 'Civil and construction engineering site',
  },
  {
    id: 'government-contracts',
    icon: <Landmark className="h-12 w-12 text-blue-600" />,
    title: 'Government Contracts',
    description: 'End-to-end government tender management and execution — from bid preparation through compliant delivery for railways, PSUs, and government agencies.',
    features: [
      'Tender Management – Opportunity identification and bid preparation on GeM, IREPS, and state portals.',
      'Technical Bid Writing – Compliant, well-documented technical and financial proposals.',
      'Compliance Management – Documentation, certifications, and statutory compliance handling.',
      'Contract Execution – On-time, on-budget delivery to government specifications.',
      'MSME Advantage – Priority access and benefits as a registered MSME enterprise.',
      'Post-Award Support – Reporting, inspections, and handover documentation.',
    ],
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1000&q=80',
    imageAlt: 'Government contract and tender documentation',
  },
  {
    id: 'maintenance',
    icon: <Wrench className="h-12 w-12 text-blue-600" />,
    title: 'Maintenance & AMC',
    description: 'Preventive and corrective maintenance with Annual Maintenance Contracts that keep your assets safe, compliant, and running.',
    features: [
      'Preventive Maintenance – Scheduled servicing to maximise uptime and asset life.',
      'Emergency Response – Priority breakdown response (48–72 hours by location).',
      'Annual Maintenance Contracts – Tailored AMC packages with defined SLAs.',
      'Safety Audits – Periodic safety and compliance audits with reporting.',
      'Spares & Support – Sourcing and replacement of critical spares.',
      'Monthly Reporting – Transparent performance and maintenance reporting.',
    ],
    image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=1000&q=80',
    imageAlt: 'Industrial maintenance and servicing',
  },
];

const sustainabilityServices = [
  {
    id: 'rainwater-harvesting',
    icon: <Droplets className="h-12 w-12 text-emerald-600" />,
    title: 'Rainwater Harvesting',
    description: 'Turnkey rainwater harvesting and groundwater recharge systems for industrial plants, government campuses, and commercial facilities.',
    features: [
      'Rooftop & Surface Runoff Harvesting – Capture, filtration, and storage systems sized to your catchment area and local rainfall.',
      'Groundwater Recharge Structures – Recharge pits, trenches, and bore-well recharge to replenish aquifers and meet CGWA norms.',
      'Storage & Filtration – First-flush diverters, multi-stage filters, and storage tanks that make harvested water reuse-ready.',
      'Regulatory Compliance – Designs meeting state rainwater-harvesting mandates and building bye-law requirements for occupancy approvals.',
      'Water Audit & Feasibility – Site assessment, runoff calculation, and ROI-backed system recommendations.',
      'Operation & Maintenance – Annual contracts for cleaning, monitoring, and assured system performance.',
    ],
    image: 'https://images.unsplash.com/photo-1538300342682-cf57afb97285?w=1000&q=80',
    imageAlt: 'Rainwater harvesting and water collection system',
  },
  {
    id: 'solar-solutions',
    icon: <Sun className="h-12 w-12 text-emerald-600" />,
    title: 'Solar Energy Solutions',
    description: 'End-to-end solar power systems — rooftop, ground-mount, and hybrid — that cut energy costs and carbon footprint for industrial, government, and commercial clients.',
    features: [
      'Rooftop & Ground-Mount Solar PV – Design, supply, installation, and commissioning of grid-tied and off-grid systems.',
      'Feasibility & Energy Yield Analysis – Shadow analysis, generation modelling, and payback projections before you invest.',
      'Net-Metering & Subsidy Assistance – Liaison for net-metering approvals and MNRE / state solar subsidy documentation.',
      'Hybrid & Battery Storage – Solar-plus-storage for uninterrupted power at critical facilities and remote sites.',
      'Solar Water Heating & Pumping – Solar thermal and solar pump solutions for industrial and agricultural use.',
      'O&M & Performance Monitoring – Remote monitoring, cleaning schedules, and uptime-guaranteed maintenance.',
    ],
    image: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1000&q=80',
    imageAlt: 'Solar photovoltaic panel array under a clear sky',
  },
  {
    id: 'wastewater-treatment',
    icon: <Recycle className="h-12 w-12 text-emerald-600" />,
    title: 'Wastewater Treatment & Recycling',
    description: 'Effluent and sewage treatment plants with water-recycling systems that help facilities meet pollution-control norms and reduce freshwater dependence.',
    features: [
      'Sewage Treatment Plants (STP) – Design and build for campuses, townships, and industrial premises.',
      'Effluent Treatment Plants (ETP) – Process-specific effluent treatment for manufacturing and processing units.',
      'Water Recycling & Reuse – Treated-water reuse for flushing, gardening, cooling towers, and process make-up.',
      'Zero Liquid Discharge (ZLD) Support – Advanced treatment trains to help facilities approach ZLD compliance.',
      'Pollution-Control Compliance – Systems engineered to meet CPCB / SPCB discharge standards and consent requirements.',
      'Retrofitting & Upgrades – Capacity expansion and modernisation of existing treatment infrastructure.',
    ],
    image: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=1000&q=80',
    imageAlt: 'Wastewater treatment and water recycling facility',
  },
  {
    id: 'energy-efficiency',
    icon: <Gauge className="h-12 w-12 text-emerald-600" />,
    title: 'Energy Efficiency & Audits',
    description: 'Energy audits and efficiency retrofits that lower operating costs and emissions for industrial plants, government buildings, and commercial facilities.',
    features: [
      'Detailed Energy Audits – BEE-aligned audits that identify losses and quantify savings opportunities.',
      'LED & Efficient Lighting Retrofits – Facility-wide lighting upgrades with rapid payback.',
      'HVAC & Motor Efficiency – Optimisation of pumps, motors, drives, and air-conditioning loads.',
      'Power-Factor & Load Management – Correction systems and demand management to cut electricity bills.',
      'Energy Monitoring Systems – IoT metering and dashboards for continuous consumption visibility.',
      'Carbon Footprint Assessment – Baseline emissions accounting and reduction roadmaps.',
    ],
    image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1000&q=80',
    imageAlt: 'Energy efficiency and monitoring systems',
  },
  {
    id: 'green-building',
    icon: <Leaf className="h-12 w-12 text-emerald-600" />,
    title: 'Green Building & Sustainability Consulting',
    description: 'Sustainability consulting and green-building services that help projects achieve certification and meet environmental compliance.',
    features: [
      'IGBC / GRIHA / LEED Advisory – Guidance and documentation support toward green-building certification.',
      'Sustainable Design Consulting – Passive design, material selection, and resource-efficiency strategies.',
      'Environmental Compliance – Support with environmental clearances, consents, and statutory requirements.',
      'Water & Energy Modelling – Simulation of building water and energy performance for optimised design.',
      'Waste Management Planning – Segregation, composting, and recycling systems for facilities and campuses.',
      'ESG & Sustainability Reporting – Assistance with sustainability metrics and disclosure for organisations.',
    ],
    image: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=1000&q=80',
    imageAlt: 'Green certified sustainable building with vegetation',
  },
];

const ServiceRow = ({ service, index, accent }) => {
  const isEmerald = accent === 'emerald';
  return (
    <motion.div
      key={service.id}
      id={service.id}
      className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center scroll-mt-24 mb-24 last:mb-0"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className={`order-2 ${index % 2 === 0 ? 'lg:order-2' : 'lg:order-1'}`}>
        <div className={`relative rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/5 group bg-gradient-to-br ${isEmerald ? 'from-emerald-700 to-teal-800' : 'from-blue-800 to-blue-900'}`}>
          <img
            className="w-full h-80 object-cover group-hover:scale-105 transition-transform duration-500"
            alt={service.imageAlt}
            src={service.image}
            onError={(e) => { e.target.onerror = null; e.target.style.opacity = '0'; }}
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>

      <div className={`order-1 ${index % 2 === 0 ? 'lg:order-1' : 'lg:order-2'}`}>
        <div className={`inline-flex items-center justify-center p-3 rounded-2xl mb-6 ${isEmerald ? 'bg-emerald-50' : 'bg-blue-50'}`}>
          {service.icon}
        </div>
        <h2 className="mb-4">{service.title}</h2>
        <p className="text-gray-700 text-lg mb-6">{service.description}</p>

        <div className={`rounded-2xl p-6 mb-8 border border-gray-100 bg-gradient-to-br ${isEmerald ? 'from-gray-50 to-emerald-50/40' : 'from-gray-50 to-blue-50/40'}`}>
          <h3 className="text-xl font-semibold mb-4">What we deliver</h3>
          <ul className="space-y-3">
            {service.features.map((feature, idx) => (
              <li key={idx} className="flex items-start">
                <CheckCircle className={`h-5 w-5 mt-0.5 mr-3 flex-shrink-0 ${isEmerald ? 'text-emerald-600' : 'text-blue-600'}`} />
                <span className="text-gray-700">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <Button asChild className="group">
          <Link to="/contact" className="flex items-center">
            Request a Consultation
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </div>
    </motion.div>
  );
};

const ServicesPage = () => {
  useSeo({
    title: 'Our Services | Railway, Industrial & Civil Engineering + Sustainability — Navgrow',
    description: 'Navgrow services: railway infrastructure, industrial engineering, civil construction, government contracts, and maintenance — plus sustainability solutions like rainwater harvesting, solar energy, water recycling, and energy efficiency.',
    path: '/services',
    keywords: 'railway engineering services India, industrial engineering, civil construction Siliguri, government contracts, rainwater harvesting, solar energy solutions, sustainability services',
  });
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f2557] via-[#1e3a8a] to-[#2563eb] text-white">
        <div className="absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '30px 30px' }} />
        <div className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-blue-400/15 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="container mx-auto px-4 relative">
          <motion.div
            className="max-w-3xl mx-auto text-center py-20 md:py-28"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold tracking-[0.15em] uppercase mb-6">
              Engineering &amp; Sustainability
            </span>
            <h1 className="text-white mb-6 leading-tight">
              Two capabilities, <span className="text-amber-400">one trusted partner</span>
            </h1>
            <p className="text-lg text-blue-50/90 max-w-2xl mx-auto">
              From railway infrastructure and industrial engineering to solar power and rainwater harvesting — Navgrow delivers core engineering services and modern sustainability solutions, all to the same quality-first standard.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <a href="#engineering" className="px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-bold text-sm transition-colors">
                Engineering Services
              </a>
              <a href="#sustainability" className="px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-[#0d3b2e] rounded-xl font-bold text-sm transition-colors">
                Sustainability Solutions
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Engineering Services */}
      <section id="engineering" className="py-16 md:py-24 scroll-mt-20">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center max-w-3xl mx-auto mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block text-sm font-bold tracking-wide uppercase text-blue-600 mb-3">Core Engineering</span>
            <h2 className="mb-4">Engineering <span className="gradient-text">Services</span></h2>
            <p className="text-gray-600 text-lg">
              Our foundation — railway, industrial, and civil engineering delivered to Indian Railways and government standards, proven on projects for Indian Railways and Wabtec.
            </p>
          </motion.div>
          {engineeringServices.map((service, index) => (
            <ServiceRow key={service.id} service={service} index={index} accent="blue" />
          ))}
        </div>
      </section>

      {/* Sustainability Solutions */}
      <section id="sustainability" className="py-16 md:py-24 bg-gradient-to-b from-white to-emerald-50/30 scroll-mt-20">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center max-w-3xl mx-auto mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block text-sm font-bold tracking-wide uppercase text-emerald-600 mb-3">Sustainability Solutions</span>
            <h2 className="mb-4">Building a <span className="gradient-text">greener future</span></h2>
            <p className="text-gray-600 text-lg">
              Clean-energy and water solutions that cut costs and emissions — rainwater harvesting, solar power, water recycling, and energy efficiency, delivered with the same engineering rigour.
            </p>
          </motion.div>
          {sustainabilityServices.map((service, index) => (
            <ServiceRow key={service.id} service={service} index={index} accent="emerald" />
          ))}
        </div>
      </section>

      {/* Process */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center max-w-3xl mx-auto mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="mb-4">Our <span className="gradient-text">Process</span></h2>
            <p className="text-gray-600 text-lg">
              A systematic approach to delivering exceptional results on every project.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Consultation', description: 'We begin with a thorough consultation to understand your specific needs, challenges, and project objectives.' },
              { step: '02', title: 'Planning', description: 'Our team develops a comprehensive plan, including timelines, resources, and budget considerations.' },
              { step: '03', title: 'Execution', description: 'We implement the plan with precision, keeping you informed at every stage of the process.' },
              { step: '04', title: 'Evaluation', description: 'After completion, we conduct a thorough review to ensure all objectives have been fully met.' },
            ].map((process, index) => (
              <motion.div
                key={index}
                className="bg-white rounded-xl p-6 shadow-lg relative"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="text-5xl font-bold text-blue-100 mb-4">{process.step}</div>
                <h3 className="text-xl font-bold mb-3">{process.title}</h3>
                <p className="text-gray-600">{process.description}</p>
                {index < 3 && (
                  <div className="hidden lg:block absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2">
                    <ArrowRight className="h-8 w-8 text-blue-300" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <CtaSection />
    </>
  );
};

export default ServicesPage;
