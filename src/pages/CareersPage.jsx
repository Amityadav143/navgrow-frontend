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
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, MapPin, Clock, Briefcase, ChevronDown, ChevronUp, Send, CheckCircle, Star, ChevronRight} from 'lucide-react';
import PageHero from '@/components/PageHero';
import CtaSection from '@/components/CtaSection';
import useSeo from '@/hooks/useSeo';
import { useToast } from '@/components/ui/use-toast';
import { useApi } from '@/hooks/useApi';
import { jobsApi } from '@/lib/api';
import JobDetailModal, { CAREERS_EMAIL } from '@/components/JobDetailModal';

const PERKS = [
  { icon: '🏆', title: 'Growth Opportunities', desc: 'Fast career progression in a growing company with direct access to Indian Railways and industrial projects.' },
  { icon: '💰', title: 'Competitive Pay', desc: 'Market-aligned salaries with performance bonuses and annual increments.' },
  { icon: '🎓', title: 'Training & Development', desc: 'Sponsored certifications, safety training, and skill development programmes.' },
  { icon: '🏥', title: 'Health Coverage', desc: 'Medical insurance coverage for you and your family.' },
  { icon: '📍', title: 'Siliguri HQ', desc: 'Our headquarters is in Siliguri — a growing hub for railway and industrial work in North-East India.' },
  { icon: '🤝', title: 'Collaborative Culture', desc: 'Work directly with railway engineers, government agencies, and industry leaders.' },
];

const JOBS = [
  {
    id: 1, title: 'Junior Civil Engineer', dept: 'Engineering', type: 'Full-time',
    location: 'Siliguri, WB', exp: '1\u20133 years', openings: 2,
    salaryFrom: 22000, salaryTo: 32000,
    desc: 'Assist in planning and execution of railway shed construction, civil works, and infrastructure projects under Indian Railways contracts. You will work alongside senior engineers on live NFR (Northeast Frontier Railway) sites around Siliguri.',
    responsibilities: [
      'Prepare and review drawings, BOQs and quantity estimates for railway civil works',
      'Support day-to-day execution at loco shed and track infrastructure sites',
      'Record site measurements and prepare measurement books for RA bills',
      'Coordinate with contractors and railway engineers on drawings and site queries',
      'Track material consumption against estimates and flag variances',
    ],
    requirements: [
      'Diploma or B.E./B.Tech in Civil Engineering',
      '1\u20133 years of site experience (railway or government projects preferred)',
      'Working knowledge of AutoCAD and MS Excel',
      'Familiarity with IS codes and railway/RDSO specifications is an advantage',
      'Willing to travel to project sites across North Bengal',
    ],
    benefits: [
      'PF, ESI and annual leave as per statute',
      'Site travel and accommodation covered',
      'Structured mentoring under senior railway engineers',
    ],
    skills: ['AutoCAD', 'Civil construction', 'Railway norms', 'Site supervision', 'BOQ preparation'],
  },
  {
    id: 2, title: 'Mechanical Engineer \u2013 Loco Services', dept: 'Engineering', type: 'Full-time',
    location: 'Siliguri, WB', exp: '2\u20135 years', openings: 1,
    salaryFrom: 30000, salaryTo: 48000,
    desc: 'Execute locomotive modification, fitment and maintenance work at diesel loco sheds, working directly with Indian Railways technical staff.',
    responsibilities: [
      'Carry out locomotive fitment and modification work to approved RDSO drawings',
      'Plan shed maintenance schedules and coordinate manpower and spares',
      'Inspect completed work and prepare handover documentation for railway staff',
      'Investigate in-service failures and propose corrective actions',
      'Maintain job cards, test reports and compliance records',
    ],
    requirements: [
      'B.E./B.Tech or Diploma in Mechanical Engineering',
      '2\u20135 years in loco shed, workshop or heavy engineering maintenance',
      'Ability to read mechanical and hydraulic/pneumatic drawings',
      'Understanding of RDSO standards and railway safety procedures',
    ],
    benefits: [
      'PF, ESI and annual leave as per statute',
      'Technical training on locomotive systems',
      'Performance-linked annual increment',
    ],
    skills: ['Locomotive systems', 'Mechanical fitting', 'RDSO standards', 'Safety compliance', 'Technical documentation'],
  },
  {
    id: 3, title: 'Tender & Procurement Executive', dept: 'Business Development', type: 'Full-time',
    location: 'Siliguri, WB', exp: '2\u20134 years', openings: 1,
    salaryFrom: 25000, salaryTo: 40000,
    desc: 'Identify, prepare and submit tenders for government and railway contracts, and keep our vendor registrations and compliance documents current.',
    responsibilities: [
      'Track tender portals (IREPS, GeM, CPPP) for relevant opportunities',
      'Prepare technical and financial bid documents within deadlines',
      'Maintain vendor registrations, EMD records and compliance certificates',
      'Coordinate with technical teams to compile supporting documentation',
      'Maintain a submission tracker and report outcomes to management',
    ],
    requirements: [
      'Graduate in any discipline; engineering background an advantage',
      '2\u20134 years of tendering experience with government or railway buyers',
      'Hands-on experience with IREPS and/or GeM portals',
      'Strong MS Office skills and careful attention to documentation detail',
    ],
    benefits: [
      'PF, ESI and annual leave as per statute',
      'Incentive on successfully awarded tenders',
    ],
    skills: ['GeM Portal', 'IREPS', 'Tender documentation', 'MS Office', 'Government procurement'],
  },
  {
    id: 4, title: 'Safety Officer (HSE)', dept: 'Safety & Compliance', type: 'Full-time',
    location: 'Siliguri, WB', exp: '3\u20136 years', openings: 1,
    salaryFrom: 28000, salaryTo: 45000,
    desc: 'Own health, safety and environmental compliance across all project sites \u2014 audits, toolbox talks, incident investigation and statutory reporting.',
    responsibilities: [
      'Conduct site safety audits and close out non-conformances',
      'Run toolbox talks and induction training for site crews',
      'Investigate incidents and near-misses and issue corrective actions',
      'Maintain PPE issue registers and statutory safety records',
      'Liaise with railway safety officials during inspections',
    ],
    requirements: [
      'Diploma in Industrial Safety, or NEBOSH/IOSH certification',
      '3\u20136 years in construction, railway or heavy industrial safety',
      'Working knowledge of RDSO safety norms and the Factories Act',
      'Confident communicator with site crews and contractors',
    ],
    benefits: [
      'PF, ESI and annual leave as per statute',
      'Company-funded refresher certification',
      'Site travel allowance',
    ],
    skills: ['NEBOSH / IOSH', 'Safety audits', 'Risk assessment', 'Accident investigation', 'RDSO safety norms'],
  },
  {
    id: 5, title: 'E-Commerce & Digital Marketing Executive', dept: 'Marketing', type: 'Full-time',
    location: 'Siliguri, WB (Hybrid)', exp: '1\u20133 years', openings: 1,
    salaryFrom: 20000, salaryTo: 35000,
    desc: "Run our online shop and B2B digital marketing \u2014 product listings, SEO, social channels and campaigns for Navgrow's engineering services and products.",
    responsibilities: [
      'Create and maintain product listings with accurate specs, HSN and GST details',
      'Improve organic search performance across product and service pages',
      'Plan and publish social media content for a B2B audience',
      'Run email campaigns to registered buyers and track conversion',
      'Report traffic, enquiry and order metrics monthly',
    ],
    requirements: [
      'Graduate in Marketing, Commerce or a related field',
      '1\u20133 years in e-commerce or digital marketing',
      'Hands-on with Google Analytics and at least one ads platform',
      'Clear written English; product photography skills are a plus',
    ],
    benefits: [
      'Hybrid working after probation',
      'PF, ESI and annual leave as per statute',
      'Budget for tools and online courses',
    ],
    skills: ['SEO/SEM', 'Social media', 'Product photography', 'Google Analytics', 'Email marketing'],
  },
  {
    id: 6, title: 'Site Supervisor (Railways)', dept: 'Operations', type: 'Contract',
    location: 'North Bengal / NE India', exp: '3\u20137 years', openings: 3,
    salaryFrom: 24000, salaryTo: 38000,
    desc: 'Supervise on-site execution of railway infrastructure works \u2014 labour, materials and quality \u2014 at Indian Railways project sites across North Bengal and the North East.',
    responsibilities: [
      'Supervise daily site execution against drawings and method statements',
      'Deploy and manage labour gangs and subcontractors',
      'Verify material receipt, storage and consumption at site',
      'Enforce safety rules and stop unsafe work',
      'Submit daily progress reports with photographs to the project manager',
    ],
    requirements: [
      'Diploma in Civil/Mechanical Engineering or equivalent site experience',
      '3\u20137 years supervising railway or infrastructure sites',
      'Comfortable working at remote sites on a contract posting',
      'Basic computer skills for progress reporting',
    ],
    benefits: [
      'Site accommodation and travel provided',
      'Contract completion bonus',
      'Renewable contract with scope to convert to permanent',
    ],
    skills: ['Site supervision', 'Labour management', 'Quality control', 'Railway safety', 'Progress reporting'],
  },
];

const JobCard = ({ job }) => {
  // The card is now a summary that opens a proper brief, rather than an
  // accordion that dropped a paragraph and a mailto link into the list.
  const [open, setOpen] = useState(false);
  return (
    <>
      <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="bg-white rounded-2xl border border-gray-100 hover:border-blue-300 hover:shadow-lg transition-all overflow-hidden">
        <button onClick={() => setOpen(true)}
          className="w-full p-5 text-left flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">{job.dept}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                job.type === 'Contract' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                {job.type}
              </span>
            </div>
            <h3 className="font-bold text-gray-900 text-lg">{job.title}</h3>
            <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-500">
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{job.exp} experience</span>
            </div>
            {job.desc && (
              <p className="text-sm text-gray-500 mt-2 line-clamp-2 leading-relaxed">{job.desc}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-blue-600 font-semibold">View details &amp; apply</span>
            <ChevronRight className="h-4 w-4 text-blue-500" />
          </div>
        </button>
      </motion.div>

      <JobDetailModal job={job} open={open} onClose={() => setOpen(false)} />
    </>
  );
};


const ApplicationForm = () => {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: '', exp: '', message: '' });
  const [sent, setSent] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Job Application – ${form.role || 'General'} – ${form.name}`);
    const body = encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\nPhone: ${form.phone}\nApplying for: ${form.role}\nExperience: ${form.exp}\n\n${form.message}`);
    // Speculative applications go to the recruitment inbox, not the general one.
    window.location.href = `mailto:${CAREERS_EMAIL}?subject=${subject}&body=${body}`;
    setSent(true);
  };

  if (sent) return (
    <div className="text-center py-12">
      <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-gray-900 mb-2">Application Ready!</h3>
      <p className="text-gray-500 text-sm">Your mail app should have opened. Please attach your CV and send.</p>
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[['name','Full Name','text',true,'Your name'],['email','Email','email',true,'you@example.com'],['phone','Phone','tel',true,'+91 89270 70972'],['role','Applying For','text',true,'Job title or department']].map(([id,label,type,req,ph]) => (
          <div key={id}>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label} {req && <span className="text-red-500">*</span>}</label>
            <input type={type} required={req} placeholder={ph} value={form[id]} onChange={e => setForm(p => ({...p,[id]:e.target.value}))}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors" />
          </div>
        ))}
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Years of Experience</label>
        <select value={form.exp} onChange={e => setForm(p => ({...p, exp: e.target.value}))}
          className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white">
          <option value="">Select…</option>
          {['0–1 year (Fresher)', '1–3 years', '3–5 years', '5–10 years', '10+ years'].map(o => <option key={o}>{o}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cover Note</label>
        <textarea rows={4} value={form.message} onChange={e => setForm(p => ({...p, message: e.target.value}))}
          placeholder="Brief introduction and why you want to join Navgrow…"
          className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 resize-none" />
      </div>
      <p className="text-xs text-gray-400">Clicking Submit opens your mail client. Please attach your CV (PDF) before sending.</p>
      <button type="submit" className="w-full py-3.5 btn-gold font-bold rounded-xl shadow-md hover:opacity-90 flex items-center justify-center gap-2">
        <Send className="h-4 w-4" /> Submit Application
      </button>
    </form>
  );
};

const CareersPage = () => {
  useSeo({
    title: 'Careers at Navgrow Engineering | Railway & Industrial Jobs Siliguri',
    description: 'Join Navgrow Engineering Service Pvt. Ltd. — open positions for civil engineers, mechanical engineers, safety officers, tender executives, and more in Siliguri, West Bengal.',
    path: '/careers',
    keywords: 'engineering jobs Siliguri, railway contractor jobs West Bengal, civil engineer vacancy Siliguri, mechanical engineer job NE India, Navgrow careers',
  });

  // Fetch live jobs from API; fall back to static JOBS list
  const { data: apiJobs } = useApi(() => jobsApi.list({ status: 'OPEN' }), [], { immediate: true });
  const liveJobs = React.useMemo(() => {
    const list = apiJobs?.content || (Array.isArray(apiJobs) ? apiJobs : null);
    if (!list || list.length === 0) return JOBS;
    // The API uses department/jobType/experience/description; the card was
    // written for the static shape (dept/type/exp/desc). Normalise here so
    // both shapes render, and default skills to [] — a job saved without
    // skills used to crash the card on `skills.map` ("something went wrong").
    return list.map(j => ({
      ...j,
      dept:   j.department || j.dept || '—',
      type:   j.jobType    || j.type || 'Full-time',
      exp:    j.experience || j.exp  || 'Any',
      desc:   j.description|| j.desc || '',
      skills: Array.isArray(j.skills) ? j.skills : [],
    }));
  }, [apiJobs]);

  return (
  <>
    <PageHero
      chip={<><Users className="h-4 w-4" /> Careers</>}
      title={<>Join the <span className="gradient-text">Navgrow</span> Team</>}
      subtitle="Help us build India's railway infrastructure. We're looking for passionate engineers, managers, and professionals."
      breadcrumbs={[{ label: 'Careers' }]}
    />

    {/* Perks */}
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-center text-3xl font-bold text-gray-900 mb-10">Why Work at <span className="gradient-text">Navgrow</span></h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto mb-16">
          {PERKS.map((p, i) => (
            <motion.div key={p.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="text-3xl mb-3">{p.icon}</div>
              <h4 className="font-bold text-gray-900 mb-1.5">{p.title}</h4>
              <p className="text-sm text-gray-500 leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Open roles */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2"><Briefcase className="h-6 w-6 text-blue-600" /> Open Positions</h2>
          <div className="flex flex-col gap-4 mb-12">
            {liveJobs.map(j => <JobCard key={j.id || j.title} job={j} />)}
          </div>

          {/* Application form */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Apply Now</h2>
            <p className="text-gray-500 text-sm mb-6">Don't see your role? Submit a general application — we're always looking for talented people.</p>
            <ApplicationForm />
          </div>
        </div>
      </div>
    </section>
    <CtaSection />
  </>
  );
};

export default CareersPage;
