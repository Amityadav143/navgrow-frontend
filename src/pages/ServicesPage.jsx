import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Train, Building, Wrench, Users, Shield, Cpu, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CtaSection from '@/components/CtaSection';
import useSeo from '@/hooks/useSeo';

const services = [
  {
    id: 'railway-infrastructure',
    icon: <Train className="h-12 w-12 text-blue-600" />,
    title: 'Railway Infrastructure',
    description: 'Comprehensive solutions for railway loco modification, shed construction, and station development.',
    features: [
      'Railway Loco Modification – Upgrading, retrofitting, and customising locomotives for improved performance, efficiency, and safety.',
      'Shed Construction – End-to-end design and construction of locomotive and rolling stock maintenance sheds.',
      'Station Development – Turnkey modernisation of railway stations including passenger amenities and infrastructure upgrades.',
      'Compliance & Quality Standards – All projects executed per Indian Railways specifications, safety regulations, and ISO quality norms.',
      'Integrated Project Management – Seamless coordination from planning to execution, ensuring timely delivery within budget.',
      'Electrification system support and safety assessments.',
    ],
    image: '/wltpsguj.jpeg',
    imageAlt: 'Rainwater leakage testing plant for electric locomotives at Siliguri Diesel Loco Shed',
  },
  {
    id: 'industrial-engineering',
    icon: <Wrench className="h-12 w-12 text-blue-600" />,
    title: 'Industrial Engineering',
    description: 'End-to-end engineering solutions for manufacturing plants, warehouses, and industrial facilities across all sectors.',
    features: [
      'Plant layout design and optimization for manufacturing units',
      'Equipment installation, commissioning, and maintenance',
      'Structural steel fabrication and erection services',
      'Industrial piping, electrical, and automation systems',
      'Factory acceptance testing (FAT) and site acceptance testing (SAT)',
      'Productivity improvement and lean manufacturing consulting',
    ],
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80',
    imageAlt: 'Industrial engineering plant and manufacturing facility',
  },
  {
    id: 'civil-construction',
    icon: <Building className="h-12 w-12 text-blue-600" />,
    title: 'Civil & Construction',
    description: 'Complete civil engineering and construction services for commercial, institutional, and infrastructure projects.',
    features: [
      'Building construction — residential, commercial, and industrial',
      'Road, bridge, and drainage infrastructure',
      'Foundation design and geotechnical services',
      'Interior fit-out and renovation works',
      'RCC, pre-engineered buildings (PEB), and steel structures',
      'Site supervision and quality assurance (QA/QC)',
    ],
    image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
    imageAlt: 'Civil construction and building infrastructure works',
  },
  {
    id: 'procurement-logistics',
    icon: <Users className="h-12 w-12 text-blue-600" />,
    title: 'Procurement & Sourcing',
    description: 'Strategic procurement, vendor management, and supply chain optimization for industrial and government buyers.',
    features: [
      'Vendor identification, evaluation, and empanelment',
      'Competitive tendering and reverse auction management',
      'Rate contract and framework agreement management',
      'Import / EXIM coordination and customs clearance',
      'Warehouse and inventory management consulting',
      'GeM Portal and government e-procurement support',
    ],
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80',
    imageAlt: 'Procurement and supply chain management',
  },
  {
    id: 'government-contracts',
    icon: <Building className="h-12 w-12 text-blue-600" />,
    title: 'Government Contracts',
    description: 'Expert handling of government tenders, compliance, and project execution for public sector initiatives.',
    features: [
      'Tender preparation and submission',
      'Regulatory compliance management',
      'Contract negotiation and administration',
      'Public-private partnership facilitation',
      'Budget management and cost control',
      'Reporting and documentation',
    ],
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80',
    imageAlt: 'Government contracts and public sector projects',
  },
  {
    id: 'maintenance',
    icon: <Wrench className="h-12 w-12 text-blue-600" />,
    title: 'Maintenance Services',
    description: 'Scheduled and emergency maintenance for railway systems, ensuring optimal performance and safety.',
    features: [
      'Preventive maintenance programmes',
      'Emergency repair services',
      'Asset lifecycle management',
      'Performance monitoring and optimisation',
      'Spare parts sourcing and management',
      'On-site maintenance staff support',
    ],
    image: '/handbreak.png',
    imageAlt: 'Modified hand brake fitment in locomotives',
  },
  {
    id: 'consulting',
    icon: <Users className="h-12 w-12 text-blue-600" />,
    title: 'Consulting Services',
    description: 'Strategic advisory for infrastructure planning, regulatory compliance, and operational efficiency.',
    features: [
      'Feasibility studies and project assessment',
      'Strategic planning and development',
      'Operational efficiency optimisation',
      'Risk assessment and management',
      'Technology integration consulting',
      'Stakeholder engagement strategies',
    ],
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80',
    imageAlt: 'Engineering consulting and advisory services',
  },
  {
    id: 'safety',
    icon: <Shield className="h-12 w-12 text-blue-600" />,
    title: 'Safety & Compliance',
    description: 'Ensuring adherence to Indian Railways and industry standards while prioritising safety protocols.',
    features: [
      'Safety management systems',
      'Regulatory compliance audits',
      'Risk assessment and mitigation planning',
      'Safety training and on-site certification',
      'Incident investigation and reporting',
      'Environmental compliance support',
    ],
    image: 'https://images.unsplash.com/photo-1607970408688-37f3186a3ea4?w=800&q=80',
    imageAlt: 'Safety compliance and HSE audit services',
  },
  {
    id: 'technology',
    icon: <Cpu className="h-12 w-12 text-blue-600" />,
    title: 'Technology Solutions',
    description: 'Modern digital systems for monitoring, automation, and operational management in railway environments.',
    features: [
      'IoT solutions for infrastructure monitoring',
      'Automated control systems integration',
      'Data analytics and reporting platforms',
      'Mobile applications for field operations',
      'Passenger information systems',
      'Cybersecurity for critical infrastructure',
    ],
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
    imageAlt: 'IoT and technology solutions for industry',
  },
];

const ServicesPage = () => {
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
              Our <span className="gradient-text">Services</span>
            </h1>
            <p className="text-lg text-gray-700 mb-8">
              Comprehensive solutions tailored for Indian Railways and government agencies — delivering excellence at every stage of your project.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Services list */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              id={service.id}
              className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${
                index !== services.length - 1 ? 'mb-24' : ''
              }`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className={`order-2 ${index % 2 === 0 ? 'lg:order-2' : 'lg:order-1'}`}>
                <div className="rounded-xl overflow-hidden shadow-xl">
                  <img
                    className="w-full h-72 object-cover"
                    alt={service.imageAlt}
                    src={service.image}
                    onError={(e) => { e.target.onerror=null; e.target.src='/Railway_Infra.jpg'; }}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>

              <div className={`order-1 ${index % 2 === 0 ? 'lg:order-1' : 'lg:order-2'}`}>
                <div className="inline-block p-3 bg-blue-50 rounded-xl mb-6">
                  {service.icon}
                </div>
                <h2 className="mb-4">{service.title}</h2>
                <p className="text-gray-700 text-lg mb-6">{service.description}</p>

                <div className="bg-gray-50 rounded-lg p-6 mb-8">
                  <h3 className="text-xl font-semibold mb-4">Key Features</h3>
                  <ul className="space-y-3">
                    {service.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
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
