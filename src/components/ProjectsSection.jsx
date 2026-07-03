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
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, Calendar, Eye } from 'lucide-react';
import ProjectModal from '@/components/ProjectModal';

const projects = [
  {
    title: 'Rainwater Leakage Testing Plant For Electric Locomotives',
    category: 'Civil & Infrastructure',
    location: 'Siliguri Diesel Loco Shed, West Bengal',
    year: '2025',
    client: 'Indian Railways',
    image: 'wltpsguj.jpeg',
    description: "A specialised testing facility designed to simulate rain conditions and detect water ingress in electric locomotives. This plant ensures the locomotive's electrical and mechanical components are sealed properly against rainwater leakage, enhancing safety and durability during operation in wet environments.",
  },
  {
    title: 'Fitment of Modified Hand Brake in Locomotives',
    category: 'Mechanical Engineering',
    location: 'Siliguri Diesel Loco Shed, West Bengal',
    year: '2025–2026',
    client: 'Indian Railways',
    description: 'Installation of an improved hand brake mechanism at Siliguri Diesel Loco Shed, designed for better ergonomics, durability, and ease of manual operation. Executed per Indian Railways technical standards to ensure reliable performance.',
    image: 'handbreak.jpg',
  },
  {
    title: 'Specialised Lube Oil Storage for Wabtec Locomotives',
    category: 'Industrial Fabrication',
    client: 'Wabtec Locomotives Pvt. Ltd.',
    location: 'Siliguri, West Bengal',
    year: '2026',
    description: 'Modular storage solutions providing maximum airflow and safety for the storage of volatile or temperature-sensitive locomotive fluids — engineered specifically for Wabtec locomotive requirements.',
    image: 'barricading.jpg',
  },
];

const ProjectsSection = () => {
  const [selected, setSelected] = useState(null);

  return (
    <>
      <section className="section-padding bg-white">
        <div className="container mx-auto px-4">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
            <motion.div className="max-w-xl"
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
              <div className="section-chip mb-4 w-fit">Our Track Record</div>
              <h2 className="mb-3">Featured <span className="gradient-text">Projects</span></h2>
              <p className="text-gray-600 text-lg">
                Real projects that prove our engineering rigour — the same discipline we now bring to every sustainability solution.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
              <Link to="/projects"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-blue-200 text-blue-700 font-semibold hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 group">
                View All Projects
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
            {projects.map((project, i) => (
              <motion.div
                key={i}
                className="group relative overflow-hidden rounded-2xl shadow-lg cursor-pointer"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                onClick={() => setSelected(project)}
              >
                {/* Image */}
                <div className="aspect-[4/3] overflow-hidden">
                  <img loading="lazy" decoding="async"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    src={`/${project.image}`} onError={(e) => { e.target.onerror=null; e.target.src='/Railway_Infra.jpg'; }}
                    alt={`${project.title}`}
                    loading="lazy"
                    decoding="async"
                  />
                </div>

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/95 via-gray-900/40 to-transparent" />

                {/* Content */}
                <div className="absolute inset-0 flex flex-col justify-end p-6">
                  <span className="inline-block px-3 py-1 text-xs font-semibold bg-blue-600 text-white rounded-full mb-3 w-fit">
                    {project.category}
                  </span>
                  <h3 className="text-lg font-bold text-white mb-2 leading-snug">{project.title}</h3>

                  <div className="flex flex-wrap gap-3 text-xs text-gray-300 mb-4">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{project.location.split(',')[0]}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{project.year}</span>
                  </div>

                  <button className="inline-flex items-center gap-2 text-sm font-semibold text-white border border-white/30 bg-white/10 hover:bg-white/25 rounded-xl px-4 py-2 w-fit transition-all backdrop-blur-sm group/btn">
                    <Eye className="h-4 w-4" /> View Details
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <ProjectModal project={selected} onClose={() => setSelected(null)} />
    </>
  );
};

export default ProjectsSection;
