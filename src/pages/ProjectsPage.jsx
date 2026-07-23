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
import React, { useState, useEffect } from 'react';
import { projectsApi } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, MapPin, Calendar, User, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CtaSection from '@/components/CtaSection';
import ProjectModal from '@/components/ProjectModal';
import useSeo from '@/hooks/useSeo';

const projects = [
  {
    title: 'Rainwater Leakage Testing Plant For Electric Locomotives',
    category: 'Civil & Infrastructure',
    location: 'Siliguri Diesel Loco Shed, West Bengal – 734003',
    year: '2025',
    client: 'Indian Railways',
    description: 'A specialised testing facility designed to simulate rain conditions and detect water ingress in electric locomotives. This plant ensures the locomotive\'s electrical and mechanical components are sealed properly against rainwater leakage, enhancing safety, reliability, and durability during operation in wet environments.',
    image: 'wltpsguj.jpeg',
  },
  {
    title: 'Fitment of Modified Hand Brake in Locomotives',
    category: 'Mechanical Engineering',
    location: 'Siliguri Diesel Loco Shed, West Bengal – 734003',
    year: '2025–2026',
    client: 'Indian Railways',
    description: 'The modified hand brake assembly was installed in locomotives at the Siliguri Diesel Loco Shed to enhance operational safety and braking control during stationary conditions. The modification involved the fitment of an improved hand brake mechanism designed for better ergonomics, durability, and ease of manual operation.',
    image: 'handbreak.jpg',
  },
  {
    title: 'Specialised Lube Oil Storage for Wabtec Locomotives',
    category: 'Industrial Fabrication',
    client: 'Wabtec Locomotives Pvt. Ltd.',
    location: 'Siliguri, West Bengal – 734003',
    year: '2026',
    description: 'Modular mesh panel storage solutions providing maximum airflow and safety for the storage of volatile or temperature-sensitive locomotive fluids. Engineered specifically for Wabtec locomotive maintenance requirements.',
    image: 'barricading.jpg',
  },
];

const categories = ['All', 'Civil & Infrastructure', 'Mechanical Engineering', 'Industrial Fabrication'];

const ProjectsPage = () => {
  useSeo({ title: 'Projects', description: 'Portfolio of completed engineering projects by Navgrow across civil infrastructure, mechanical, and industrial fabrication — from railway testing plants to Wabtec storage solutions.', path: '/projects' });
  const [active, setActive] = useState('All');
  const [selected, setSelected] = useState(null);
  const [allProjects, setAllProjects] = useState(projects);

  // Fetch live projects from API, fall back to static data
  useEffect(() => {
    projectsApi.list().then(res => {
      const data = res.data?.content || (Array.isArray(res.data) ? res.data : null);
      if (data && data.length > 0) {
        setAllProjects(data.map(item => ({
          id: item.id,
          title: item.title || '',
          category: item.category || 'Civil & Infrastructure',
          location: item.location || 'Siliguri, West Bengal',
          year: item.year || new Date().getFullYear().toString(),
          client: item.client || '',
          description: item.description || '',
          image: (item.imageUrl || item.image || 'placeholder.jpg').replace(/^\//,''),
        })));
      }
    }).catch(() => {}); // silently fall back to static
  }, []);

  const projectCategories = ['All', ...Array.from(new Set(allProjects.map(p => p.category)))];
  const visible = active === 'All' ? allProjects : allProjects.filter(p => p.category === active);

  return (
    <>
      {/* Hero */}
      <section className="pt-14 pb-16 bg-gradient-to-br from-blue-950 to-indigo-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-6 border border-blue-400/30 text-blue-200">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              Portfolio
            </div>
            <h1 className="mb-4 text-white">
              Our <span className="gradient-text-light">Projects</span>
            </h1>
            <p className="text-blue-200 text-lg">
              Real projects delivered for Indian Railways and industrial clients across North Bengal.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Projects grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          {/* Filter */}
          <motion.div className="mb-10 flex items-center gap-3 flex-wrap"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            <div className="flex items-center gap-2 text-gray-500 mr-2">
              <Filter className="h-4 w-4" /> <span className="text-sm font-medium">Filter:</span>
            </div>
            {projectCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setActive(cat)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  active === cat
                    ? 'brand-gradient text-white shadow-md shadow-blue-500/25'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </motion.div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            <AnimatePresence mode="popLayout">
              {visible.map((project, i) => (
                <motion.div
                  key={project.title}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                  className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border border-gray-100"
                  onClick={() => setSelected(project)}
                >
                  <div className="aspect-[16/9] overflow-hidden relative">
                    <img loading="lazy" decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      src={`/${project.image}`} onError={(e) => { e.target.onerror=null; e.target.src='/placeholder.jpg'; }}
                      alt={project.title}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <button className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span className="flex items-center gap-2 bg-white text-blue-700 font-semibold px-5 py-2.5 rounded-full shadow-lg text-sm">
                        <Eye className="h-4 w-4" /> View Details
                      </span>
                    </button>
                  </div>

                  <div className="p-6">
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="inline-block px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">{project.category}</span>
                      {project.client && <span className="inline-block px-3 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded-full">{project.client}</span>}
                      <span className="inline-block px-3 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">{project.year}</span>
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 mb-2 leading-snug group-hover:text-blue-700 transition-colors">{project.title}</h3>

                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                      <MapPin className="h-3.5 w-3.5" />
                      {project.location}
                    </div>

                    <p className="text-sm text-gray-600 line-clamp-3">{project.description}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {visible.length === 0 && (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">No projects in this category yet.</p>
            </div>
          )}
        </div>
      </section>

      <CtaSection />
      <ProjectModal project={selected} onClose={() => setSelected(null)} />
    </>
  );
};

export default ProjectsPage;
