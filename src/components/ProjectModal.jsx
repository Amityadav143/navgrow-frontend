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
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Calendar, User, Tag } from 'lucide-react';

const ProjectModal = ({ project, onClose }) => {
  if (!project) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-gray-900/75 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {/* Image */}
          <div className="relative h-64 overflow-hidden rounded-t-3xl">
            <img loading="lazy" decoding="async"
              src={`/${project.image}`} onError={(e) => { e.target.onerror=null; e.target.src='/Railway_Infra.jpg'; }}
              alt={project.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/70 to-transparent" />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/40 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <span className="absolute bottom-4 left-4 inline-block px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
              {project.category}
            </span>
          </div>

          {/* Content */}
          <div className="p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">{project.title}</h3>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                { icon: User,     label: 'Client',   value: project.client },
                { icon: Calendar, label: 'Year',     value: project.year },
                { icon: MapPin,   label: 'Location', value: project.location },
                { icon: Tag,      label: 'Category', value: project.category },
              ].filter(r => r.value).map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">{label}</p>
                    <p className="text-sm text-gray-900 font-semibold">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-gray-700 leading-relaxed mb-6">{project.description}</p>

            <a
              href="https://wa.me/918927070972?text=I%20want%20to%20know%20more%20about%20a%20similar%20project"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 brand-gradient text-white rounded-xl font-semibold shadow-md hover:opacity-90 transition-opacity"
            >
              Enquire About This Project
            </a>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProjectModal;
