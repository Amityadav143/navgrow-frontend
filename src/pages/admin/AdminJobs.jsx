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
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, Plus, Edit2, Trash2, X, CheckCircle, Search,
  ToggleLeft, ToggleRight, AlertTriangle, Download, Eye, Calendar,
  MapPin, Clock, Users,
} from 'lucide-react';
import { jobsApi } from '@/lib/api';
import { usePaginated, useMutation } from '@/hooks/useApi';
import { useToast } from '@/components/ui/use-toast';

const JOB_TYPES   = ['Full-time','Part-time','Contract','Internship','Freelance'];
const DEPARTMENTS  = ['Engineering','Civil','Electrical','Procurement','Safety','IT','Administration','Sales'];
const LOCATIONS    = ['Siliguri, WB','Delhi (Remote)','Pan India','Remote','Kolkata, WB'];

const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
    <motion.div initial={{scale:.9,opacity:0}} animate={{scale:1,opacity:1}}
      className="bg-gray-800 rounded-2xl border border-gray-700 p-6 max-w-sm w-full shadow-2xl">
      <div className="w-12 h-12 rounded-full bg-red-900/50 flex items-center justify-center mx-auto mb-4"><AlertTriangle className="h-6 w-6 text-red-400"/></div>
      <p className="text-white font-semibold text-center mb-5">{message}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2.5 bg-gray-700 text-gray-300 rounded-xl text-sm">Cancel</button>
        <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm">Confirm</button>
      </div>
    </motion.div>
  </div>
);

/* ── Job form ─────────────────────────────────────────────────────────────── */
const JobInput = ({ label, fieldKey, type='text', required, placeholder, form, onChange, full=false }) => (
  <div className={full?'col-span-2':''}>
    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
      {label}{required&&<span className="text-red-400 ml-1">*</span>}
    </label>
    <input required={required} type={type} value={form[fieldKey]??''} onChange={e=>onChange(fieldKey,e.target.value)} placeholder={placeholder}
      className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 placeholder-gray-600"/>
  </div>
);

const JobForm = ({ initial, onSave, onCancel, saving }) => {
  const [form, setForm] = useState(() => initial ? {
    ...initial,
    // API → form: skills array becomes an editable comma string; active derives
    // from the status enum; the deadline drops its time part for <input type=date>.
    skills: Array.isArray(initial.skills) ? initial.skills.join(', ') : (initial.skills || ''),
    active: initial.status ? initial.status === 'OPEN' : (initial.active ?? true),
    applicationDeadline: initial.applicationDeadline ? String(initial.applicationDeadline).slice(0, 10) : '',
    salaryFrom: initial.salaryFrom ?? '', salaryTo: initial.salaryTo ?? '',
  } : {
    title:'', department:'Engineering', location:'Siliguri, WB', jobType:'Full-time',
    experience:'', salaryFrom:'', salaryTo:'', description:'', skills:'',
    benefits:'', applicationDeadline:'', openings:1, active:true,
  });
  const onChange = useCallback((key, value) => setForm(prev => ({ ...prev, [key]: value })), []);

  return (
    <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}}
      className="bg-gray-800 rounded-2xl border border-gray-700 p-6 mb-5 shadow-xl">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-white text-lg flex items-center gap-2">
          {initial ? <Edit2 className="h-5 w-5 text-blue-400"/> : <Plus className="h-5 w-5 text-green-400"/>}
          {initial ? 'Edit Job Opening' : 'Post New Job Opening'}
        </h3>
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400"><X className="h-4 w-4"/></button>
      </div>
      <form onSubmit={e=>{e.preventDefault();onSave(form);}} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <JobInput label="Job Title" fieldKey="title" required placeholder="e.g. Civil Engineer" form={form} onChange={onChange} full/>
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Department</label>
          <select value={form.department} onChange={e=>onChange('department',e.target.value)} className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none">
            {DEPARTMENTS.map(d=><option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Job Type</label>
          <select value={form.jobType} onChange={e=>onChange('jobType',e.target.value)} className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none">
            {JOB_TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Location</label>
          <select value={form.location} onChange={e=>onChange('location',e.target.value)} className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none">
            {LOCATIONS.map(l=><option key={l}>{l}</option>)}
          </select>
        </div>
        <JobInput label="Experience Required" fieldKey="experience" placeholder="e.g. 2-4 years" form={form} onChange={onChange}/>
        <JobInput label="Number of Openings" fieldKey="openings" type="number" placeholder="1" form={form} onChange={onChange}/>
        <JobInput label="Salary From (₹/month)" fieldKey="salaryFrom" type="number" placeholder="25000" form={form} onChange={onChange}/>
        <JobInput label="Salary To (₹/month)"   fieldKey="salaryTo"   type="number" placeholder="50000" form={form} onChange={onChange}/>
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5"><Calendar className="inline h-3 w-3 mr-1"/>Application Deadline</label>
          <input type="date" value={form.applicationDeadline} onChange={e=>onChange('applicationDeadline',e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none [color-scheme:dark]"/>
        </div>
        <div className="flex items-center gap-3 p-3 bg-gray-900 rounded-xl border border-gray-700">
          <input type="checkbox" id="job-active" checked={form.active} onChange={e=>onChange('active',e.target.checked)} className="w-4 h-4 accent-blue-500"/>
          <label htmlFor="job-active" className="text-sm text-gray-300 cursor-pointer font-medium">Active (visible to job seekers)</label>
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
            Key Skills <span className="text-gray-600 normal-case font-medium">(comma-separated — shown as tags on the careers page)</span>
          </label>
          <input value={form.skills??''} onChange={e=>onChange('skills',e.target.value)}
            placeholder="e.g. AutoCAD, Site supervision, RDSO standards, Safety compliance"
            className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 placeholder-gray-600"/>
          {String(form.skills||'').trim() && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {String(form.skills).split(',').map(t=>t.trim()).filter(Boolean).map(t=>(
                <span key={t} className="px-2.5 py-0.5 bg-blue-900/50 text-blue-300 rounded-full text-[11px] font-semibold">{t}</span>
              ))}
            </div>
          )}
        </div>
        {[{k:'description',label:'Job Description *',ph:'Role overview and responsibilities…',req:true},
          {k:'benefits',label:'Benefits & Perks',ph:'Health insurance, travel allowance, PF…'}
        ].map(f=>(
          <div key={f.k} className="col-span-2">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">{f.label}</label>
            <textarea required={f.req} value={form[f.k]} onChange={e=>onChange(f.k,e.target.value)} rows={3} placeholder={f.ph}
              className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 resize-y placeholder-gray-600"/>
          </div>
        ))}
        <div className="col-span-2 flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 brand-gradient text-white font-bold rounded-xl text-sm disabled:opacity-60">
            {saving?<span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>:<CheckCircle className="h-4 w-4"/>}
            {saving?'Saving…':initial?'Update Job':'Post Job'}
          </button>
          <button type="button" onClick={onCancel} className="px-5 py-2.5 bg-gray-700 text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-600">Cancel</button>
        </div>
      </form>
    </motion.div>
  );
};

/* ── Applications panel ─────────────────────────────────────────────────── */
const ApplicationsPanel = ({ jobId, jobTitle, onClose }) => {
  const { items, loading } = usePaginated(() => jobsApi.applications(jobId), { size:50 });
  return (
    <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white text-lg">Applications — {jobTitle}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400"><X className="h-4 w-4"/></button>
        </div>
        {loading ? <div className="text-center py-8 text-gray-400">Loading…</div>
          : items.length === 0 ? <div className="text-center py-8 text-gray-400">No applications yet</div>
          : (
            <div className="space-y-3">
              {items.map(app => (
                <div key={app.id} className="bg-gray-900 rounded-xl p-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-white">{app.name || app.fullName}</p>
                    <p className="text-xs text-gray-400">{app.email} · {app.phone}</p>
                    <p className="text-xs text-gray-500 mt-1">{(app.coverNote || app.coverLetter || '').slice(0,120) || 'No cover note'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-xs text-gray-500">{(app.createdAt||app.appliedAt)?new Date(app.createdAt||app.appliedAt).toLocaleDateString('en-IN'):'—'}</span>
                    {app.resumeUrl && (
                      <a href={app.resumeUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700">
                        <Download className="h-3 w-3"/> Resume
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
};

/* ── Main AdminJobs ──────────────────────────────────────────────────────── */
const AdminJobs = () => {
  const { toast } = useToast();
  const [showForm, setShowForm]       = useState(false);
  const [editing, setEditing]         = useState(null);
  const [confirm, setConfirm]         = useState(null);
  const [viewApps, setViewApps]       = useState(null);
  const [search, setSearch]           = useState('');

  // /jobs/manage returns every status (the public /jobs hides CLOSED roles,
  // which made toggled-off jobs vanish from the panel).
  const { items: rawItems, loading, refetch } = usePaginated(jobsApi.manage, { size: 50 });
  const items = React.useMemo(
    () => rawItems.map(j => ({ ...j, active: j.status ? j.status === 'OPEN' : !!j.active })),
    [rawItems]
  );
  const [create, {loading:creating}]  = useMutation(jobsApi.create);
  const [update, {loading:updating}]  = useMutation(jobsApi.update);
  const [remove]                      = useMutation(jobsApi.delete);
  const [toggle]                      = useMutation(jobsApi.toggle);

  const handleSave = async (form) => {
    const payload = {
      ...form,
      // The backend persists skills as text[] — send a real array, never the
      // raw comma string (that mismatch is why skills came back null).
      skills: String(form.skills || '').split(',').map(t=>t.trim()).filter(Boolean),
      status: form.active ? 'OPEN' : 'CLOSED',
      salaryFrom:  form.salaryFrom ? Number(form.salaryFrom) : null,
      salaryTo:    form.salaryTo   ? Number(form.salaryTo)   : null,
      openings:    Number(form.openings)||1,
      applicationDeadline: form.applicationDeadline ? `${form.applicationDeadline}T00:00:00` : null,
    };
    const res = editing ? await update(editing.id, payload) : await create(payload);
    if (res.error) { toast({ title:'Failed', description:res.error, variant:'destructive' }); return; }
    toast({ title: editing?'✓ Job updated':'✓ Job posted' });
    setShowForm(false); setEditing(null); refetch();
  };

  const handleDelete = (id, title) => setConfirm({
    msg: `Delete job "${title}"? All applications will also be removed.`,
    onConfirm: async () => { await remove(id); setConfirm(null); refetch(); toast({ title:'✓ Job deleted' }); },
  });

  const filtered = items.filter(j => !search || j.title?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 sm:p-6">
      {confirm && <ConfirmDialog message={confirm.msg} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)}/>}
      {viewApps && <ApplicationsPanel jobId={viewApps.id} jobTitle={viewApps.title} onClose={() => setViewApps(null)}/>}

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Job Openings</h1>
          <p className="text-gray-400 text-sm mt-0.5">{items.filter(j=>j.active).length} active openings</p>
        </div>
        <button onClick={() => { setShowForm(f=>!f); setEditing(null); }}
          className="flex items-center gap-2 px-4 py-2 brand-gradient text-white font-bold rounded-xl text-sm hover:opacity-90">
          <Plus className="h-4 w-4"/> Post Job Opening
        </button>
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search jobs…"
          className="pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 w-full"/>
      </div>

      <AnimatePresence>
        {(showForm||editing) && <JobForm initial={editing} onSave={handleSave} onCancel={()=>{setShowForm(false);setEditing(null);}} saving={creating||updating}/>}
      </AnimatePresence>

      <div className="space-y-3">
        {loading ? [...Array(3)].map((_,i) => <div key={i} className="h-20 bg-gray-800 rounded-2xl animate-pulse"/>) : null}
        {filtered.map(job => (
          <div key={job.id} className="bg-gray-800 rounded-2xl border border-gray-700 p-5 hover:border-gray-600 transition-colors">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-white">{job.title}</p>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${job.active?'bg-green-900/50 text-green-400':'bg-gray-700 text-gray-500'}`}>
                    {job.active?'Active':'Inactive'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Briefcase className="h-3 w-3"/>{job.department}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3"/>{job.location}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3"/>{job.jobType}</span>
                  {job.salaryFrom&&<span>₹{Number(job.salaryFrom).toLocaleString('en-IN')}–{Number(job.salaryTo||0).toLocaleString('en-IN')}/mo</span>}
                  <span className="flex items-center gap-1"><Users className="h-3 w-3"/>{job.applicationCount||0} applicants</span>
                </div>
                {Array.isArray(job.skills) && job.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {job.skills.slice(0,6).map(sk => (
                      <span key={sk} className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded-full text-[10px] font-semibold">{sk}</span>
                    ))}
                    {job.skills.length > 6 && <span className="text-[10px] text-gray-500">+{job.skills.length-6} more</span>}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setViewApps(job)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900/50 text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-900 transition-colors">
                  <Eye className="h-3.5 w-3.5"/> Applications
                </button>
                <button onClick={() => { toggle(job.id); setTimeout(refetch,300); }}
                  className={`p-2 rounded-lg transition-colors ${job.active?'bg-amber-900/30 text-amber-400 hover:bg-amber-900/50':'bg-green-900/30 text-green-400 hover:bg-green-900/50'}`}>
                  {job.active?<ToggleRight className="h-4 w-4"/>:<ToggleLeft className="h-4 w-4"/>}
                </button>
                <button onClick={() => { setEditing(job); setShowForm(false); }} className="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600">
                  <Edit2 className="h-3.5 w-3.5"/>
                </button>
                <button onClick={() => handleDelete(job.id, job.title)} className="p-2 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50">
                  <Trash2 className="h-3.5 w-3.5"/>
                </button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length===0&&!loading&&(
          <div className="text-center py-16 bg-gray-800 rounded-2xl border border-gray-700 text-gray-400">
            <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-20"/>
            <p className="font-semibold">No job openings yet</p>
            <p className="text-sm mt-1">Click "Post Job Opening" to add your first listing</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminJobs;
