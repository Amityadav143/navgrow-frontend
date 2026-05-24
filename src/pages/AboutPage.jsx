import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Award, Zap, Users, ShieldCheck, TrendingUp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CtaSection from '@/components/CtaSection';
import useSeo from '@/hooks/useSeo';

const milestones = [
  { year: '2022', title: 'Company Founded', desc: 'Navgrow Engineering Service Pvt. Ltd. incorporated in Siliguri, West Bengal with a mission of "Quality First...!"' },
  { year: '2023', title: 'Journey Started', desc: 'Delivered projects for private sectors and defence....' },
  { year: '2024', title: 'Indian Railways Contracts', desc: 'Delivered Rainwater Leakage Testing Plant and Modified Hand Brake fitment projects at Siliguri Diesel Loco Shed.' },
  { year: '2025', title: 'MSME & DPIIT Registration', desc: 'Recognised under DPIIT Startup India and registered as MSME, unlocking priority access to government tender processes.' },
  { year: '2026', title: "Wabtec Locomotive's", desc: 'Completed specialised lube oil storage solutions for Wabtec Locomotives Pvt. Ltd., expanding our private sector footprint.' },
];

const values = [
  { icon: <ShieldCheck className="h-6 w-6 text-blue-600" />, title: 'Integrity', desc: 'We conduct every project with complete transparency, ethical standards, and accountability to our clients.' },
  { icon: <Award className="h-6 w-6 text-blue-600" />, title: 'Excellence', desc: 'Quality First is not a tagline — it is the benchmark we apply at every stage of planning and execution.' },
  { icon: <Zap className="h-6 w-6 text-blue-600" />, title: 'Innovation', desc: 'We embrace creative engineering to solve complex infrastructure challenges with modern, practical solutions.' },
  { icon: <Users className="h-6 w-6 text-blue-600" />, title: 'Collaboration', desc: 'We work as partners with our clients, stakeholders, and field teams to deliver outcomes that exceed expectations.' },
  { icon: <TrendingUp className="h-6 w-6 text-blue-600" />, title: 'Growth', desc: 'We invest in our people and processes, continuously improving our capabilities and expanding our service range.' },
];

const AboutPage = () => {
  return (
    <>
      {/* Hero */}
      <section className="pt-16 pb-16 md:pt-20 md:pb-20 bg-blue-50">
        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="mb-6">
              About <span className="gradient-text">Navgrow Engineering Service Pvt. Ltd.</span>
            </h1>
            <p className="text-lg text-gray-700 mb-8">
              A DPIIT-recognised, MSME-registered engineering firm specialising in Indian Railways infrastructure, government contracts, and industrial solutions — headquartered in Siliguri, West Bengal.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Company Overview */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="mb-6">Our <span className="gradient-text">Story</span></h2>
              <p className="text-gray-700 mb-6">
                Founded in 2022, Navgrow Engineering Service Pvt. Ltd. was built on a single conviction — that quality and reliability should never be compromised in critical infrastructure. Starting with a focused team in Siliguri, we secured our first Indian Railways contracts and quickly established a reputation for on-time delivery and engineering rigour.
              </p>
              <p className="text-gray-700 mb-6">
                Today we serve Indian Railways, Wabtec Locomotives Pvt. Ltd., and other government agencies across North Bengal and beyond. Our DPIIT, MSME, and Make in India registrations reflect our commitment to compliant, domestic-first operations.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                {[
                  { title: 'Railway Expertise', sub: 'Loco modification, shed construction & testing' },
                  { title: 'Government Compliance', sub: 'DPIIT, MSME & tender-ready processes' },
                  { title: 'Quality Assurance', sub: 'Indian Railways specs & ISO-aligned standards' },
                  { title: 'Client Satisfaction', sub: 'Dedicated to exceeding every deliverable' },
                ].map(({ title, sub }) => (
                  <div key={title} className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-blue-600 mt-1 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
                      <p className="text-sm text-gray-600">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="rounded-xl overflow-hidden shadow-xl">
                <img
                  className="w-full h-auto"
                  alt="Navgrow Engineering railway project site"
                  src="/Railway_Infra.jpg"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-blue-600 rounded-lg p-4 shadow-lg">
                <p className="text-white font-bold text-xl">Quality First</p>
                <p className="text-blue-100 text-sm">Our founding promise</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Mission / Vision / Values tabs */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center max-w-3xl mx-auto mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="mb-4">Our Guiding <span className="gradient-text">Principles</span></h2>
            <p className="text-gray-600 text-lg">
              The values and vision that drive every project at Navgrow Engineering Service Pvt. Ltd.
            </p>
          </motion.div>

          <Tabs defaultValue="mission" className="max-w-4xl mx-auto">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="mission">Our Mission</TabsTrigger>
              <TabsTrigger value="vision">Our Vision</TabsTrigger>
              <TabsTrigger value="values">Our Values</TabsTrigger>
            </TabsList>

            <TabsContent value="mission" className="mt-8 p-6 bg-white rounded-xl shadow-md">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h3>
              <p className="text-gray-700 mb-4">
                To deliver innovative, reliable, and high-quality engineering solutions for Indian Railways and government infrastructure projects — enhancing safety, performance, and operational efficiency.
              </p>
              <p className="text-gray-700">
                We are committed to excellence from initial consultation through project handover, ensuring every client receives exceptional results on time and within budget.
              </p>
            </TabsContent>

            <TabsContent value="vision" className="mt-8 p-6 bg-white rounded-xl shadow-md">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Vision</h3>
              <p className="text-gray-700 mb-4">
                To become the most trusted engineering contractor for Indian Railways and government agencies in North and North-East India — known for our quality-first culture, technical expertise, and reliable delivery.
              </p>
              <p className="text-gray-700">
                We envision a future where domestic engineering firms like Navgrow drive India's railway modernisation through Make in India-aligned solutions.
              </p>
            </TabsContent>

            <TabsContent value="values" className="mt-8 p-6 bg-white rounded-xl shadow-md">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Values</h3>
              <ul className="space-y-4">
                {values.map(({ icon, title, desc }) => (
                  <li key={title} className="flex items-start">
                    <span className="mt-0.5 mr-3 flex-shrink-0">{icon}</span>
                    <div>
                      <h4 className="font-semibold text-gray-900">{title}</h4>
                      <p className="text-gray-700">{desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Milestones timeline */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center max-w-3xl mx-auto mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="mb-4">Our <span className="gradient-text">Journey</span></h2>
            <p className="text-gray-600 text-lg">Key milestones since our founding in 2022.</p>
          </motion.div>

          <div className="relative max-w-3xl mx-auto">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-blue-100 hidden md:block" />

            <div className="space-y-10">
              {milestones.map((m, index) => (
                <motion.div
                  key={index}
                  className="flex gap-6 items-start"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold z-10 shadow-md">
                    {m.year.slice(2)}
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex-1">
                    <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">{m.year}</span>
                    <h4 className="font-bold text-gray-900 text-lg mt-1 mb-1">{m.title}</h4>
                    <p className="text-gray-600 text-sm">{m.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Certifications */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center max-w-3xl mx-auto mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="mb-4">Certifications & <span className="gradient-text">Registrations</span></h2>
            <p className="text-gray-600 text-lg">Officially recognised and compliant with national government programmes.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { src: '/DPIIT.png', alt: 'DPIIT Startup India Recognition', label: 'DPIIT Recognised Startup' },
              { src: '/makeinindia.png', alt: 'Make in India', label: 'Make in India Partner' },
              { src: '/msme.png', alt: 'MSME Registration', label: 'MSME Registered Enterprise' },
            ].map(({ src, alt, label }) => (
              <motion.div
                key={label}
                className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 flex flex-col items-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <img src={src} alt={alt} className="h-20 w-auto object-contain mb-4" loading="lazy" decoding="async" onError={(e) => { e.target.onerror=null; e.target.style.display='none'; }} />
                <p className="text-sm font-medium text-gray-700 text-center">{label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <CtaSection />
    </>
  );
};

export default AboutPage;
