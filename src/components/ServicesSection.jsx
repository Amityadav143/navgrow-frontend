import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Train, Building, Wrench, Users, Shield, Cpu, ArrowRight } from 'lucide-react';

const services = [
  { icon: Train,    title: 'Railway Infrastructure', desc: 'Loco modification, shed construction, and station development for Indian Railways.', link: '/services#railway-infrastructure', color: 'from-blue-700 to-blue-900' },
  { icon: Building, title: 'Government Contracts',   desc: 'Expert tender preparation, compliance, and execution for public sector initiatives.', link: '/services#government-contracts', color: 'from-amber-500 to-amber-700' },
  { icon: Wrench,   title: 'Maintenance Services',   desc: 'Scheduled and emergency maintenance keeping railway systems safe and operational.', link: '/services#maintenance', color: 'from-blue-500 to-blue-700' },
  { icon: Users,    title: 'Consulting Services',    desc: 'Strategic advisory for infrastructure planning, compliance, and operational efficiency.', link: '/services#consulting', color: 'from-amber-600 to-yellow-600' },
  { icon: Shield,   title: 'Safety & Compliance',   desc: 'Adhering to Indian Railways safety standards and regulatory requirements.', link: '/services#safety', color: 'from-blue-600 to-blue-800' },
  { icon: Cpu,      title: 'Technology Solutions',  desc: 'Modern digital systems for monitoring, automation, and operational management.', link: '/services#technology', color: 'from-amber-500 to-amber-600' },
];

const ServicesSection = () => (
  <section className="section-padding bg-gray-50/80">
    <div className="container mx-auto px-4">

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-16">
        <motion.div className="section-chip mb-4 mx-auto w-fit"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          What We Do
        </motion.div>
        <motion.h2 className="mb-4"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
          Our Specialised <span className="gradient-text">Services</span>
        </motion.h2>
        <motion.p className="text-gray-600 text-lg"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}>
          End-to-end engineering solutions for government agencies and railway operators — from initial planning to final handover.
        </motion.p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map(({ icon: Icon, title, desc, link, color }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
          >
            <Link
              to={link}
              className="group block h-full bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 relative overflow-hidden"
            >
              {/* Hover gradient bg */}
              <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

              {/* Top accent line */}
              <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${color} scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`} />

              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${color} shadow-md mb-5 group-hover:scale-110 transition-transform duration-300`}>
                <Icon className="h-7 w-7 text-white" />
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-800 transition-colors">{title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-5">{desc}</p>

              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 group-hover:gap-3 transition-all duration-200">
                Learn More <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Bottom CTA */}
      <motion.div
        className="mt-12 text-center"
        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }}>
        <Link
          to="/services"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full brand-gradient text-white font-semibold shadow-lg shadow-blue-500/25 hover:opacity-90 transition-all duration-200"
        >
          View All Services <ArrowRight className="h-4 w-4" />
        </Link>
      </motion.div>
    </div>
  </section>
);

export default ServicesSection;
