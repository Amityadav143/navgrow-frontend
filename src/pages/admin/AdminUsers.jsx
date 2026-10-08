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
import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Edit2, Trash2, UserCheck, UserX, Plus,
  Search, X, AlertTriangle, CheckCircle, Shield, Mail,
  Phone, Building, Calendar, ChevronDown, KeyRound, Crown,
} from 'lucide-react';
import { adminUsersApi } from '@/lib/api';
import { usePaginated, useMutation } from '@/hooks/useApi';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';

const ROLES = ['USER','EDITOR','MANAGER','ADMIN'];
const SUPER_ROLES = ['USER','EDITOR','MANAGER','ADMIN','SUPER_ADMIN']; // roles a super admin may assign
const ROLE_COLORS = {
  SUPER_ADMIN: 'bg-amber-100 text-amber-800',
  ADMIN:   'bg-red-100 text-red-700',
  MANAGER: 'bg-purple-100 text-purple-700',
  EDITOR:  'bg-blue-100 text-blue-700',
  USER:    'bg-gray-100 text-gray-600',
};

// Permission catalog grouped for the access modal. Mirrors the backend enum.
const PERMISSION_GROUPS = {
  Commerce: ['ORDERS','PRODUCTS','QUOTES','CATALOGUE_LEADS','TAX_RULES','DELIVERY_ZONES','RFQS','COUPONS'],
  CRM:      ['MESSAGES','USERS'],
  Content:  ['NEWS','PROJECTS','GALLERY','JOBS','TENDERS','CATALOG'],
  System:   ['SETTINGS','NOTIFICATIONS','AUDIT'],
};
const PERM_LABELS = {
  ORDERS:'Orders', PRODUCTS:'Products', QUOTES:'Quote Requests', CATALOGUE_LEADS:'Catalogue Leads',
  TAX_RULES:'Tax Rules', DELIVERY_ZONES:'Delivery Zones', RFQS:'RFQ Pipeline', COUPONS:'Coupons',
  MESSAGES:'Messages', USERS:'Users', NEWS:'News & Posts', PROJECTS:'Projects', GALLERY:'Gallery',
  JOBS:'Careers / Jobs', TENDERS:'Tenders', CATALOG:'Categories & Services',
  SETTINGS:'Site Settings', NOTIFICATIONS:'Notifications', AUDIT:'Audit Log',
};

const ConfirmDialog = ({ message, onConfirm, onCancel, danger=true }) => (
  <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
    <motion.div initial={{scale:.9,opacity:0}} animate={{scale:1,opacity:1}}
      className="bg-gray-800 rounded-2xl border border-gray-700 p-6 max-w-sm w-full shadow-2xl">
      <div className={`w-12 h-12 rounded-full ${danger?'bg-red-900/50':'bg-amber-900/50'} flex items-center justify-center mx-auto mb-4`}>
        <AlertTriangle className={`h-6 w-6 ${danger?'text-red-400':'text-amber-400'}`}/>
      </div>
      <p className="text-white font-semibold text-center mb-5 leading-relaxed">{message}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2.5 bg-gray-700 text-gray-300 rounded-xl font-semibold text-sm">Cancel</button>
        <button onClick={onConfirm} className={`flex-1 py-2.5 rounded-xl font-bold text-sm text-white ${danger?'bg-red-600 hover:bg-red-700':'bg-amber-600 hover:bg-amber-700'}`}>Confirm</button>
      </div>
    </motion.div>
  </div>
);

/* ── Manage-access (custom permissions) modal — Super Admin only ─────────── */
const PermissionsModal = ({ user, onClose, onSaved }) => {
  const { toast } = useToast();
  const isAdminRole = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
  const [selected, setSelected] = useState(() => new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Seed from the user's current effective permissions.
    const current = user.effectivePermissions || [];
    setSelected(new Set(current));
  }, [user]);

  const toggle = (perm) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(perm) ? next.delete(perm) : next.add(perm);
      return next;
    });
  };
  const toggleGroup = (perms, on) => {
    setSelected(prev => {
      const next = new Set(prev);
      perms.forEach(p => on ? next.add(p) : next.delete(p));
      return next;
    });
  };
  const selectAll = () => setSelected(new Set(Object.values(PERMISSION_GROUPS).flat()));
  const clearAll  = () => setSelected(new Set());

  const save = async () => {
    setSaving(true);
    try {
      await adminUsersApi.updatePermissions(user.id, Array.from(selected));
      toast({ title: '✓ Access updated', description: `${user.fullName||user.email}'s permissions saved.` });
      onSaved?.();
      onClose();
    } catch (err) {
      toast({ title: 'Failed', description: err?.response?.data?.message || 'Could not update access.', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onMouseDown={(e)=>{if(e.target===e.currentTarget)onClose();}}>
      <motion.div initial={{scale:.95,opacity:0}} animate={{scale:1,opacity:1}}
        className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center"><KeyRound className="h-4 w-4 text-amber-400"/></div>
            <div>
              <h3 className="text-white font-bold text-sm">Manage Access</h3>
              <p className="text-gray-400 text-[11px]">{user.fullName || user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="h-5 w-5"/></button>
        </div>

        {isAdminRole ? (
          <div className="p-6 text-center">
            <Crown className="h-10 w-10 text-amber-400 mx-auto mb-3"/>
            <p className="text-white font-semibold">This user is {user.role === 'SUPER_ADMIN' ? 'a Super Admin' : 'an Admin'}.</p>
            <p className="text-gray-400 text-sm mt-1">Admins already have full access to every section, so there are no custom permissions to set. Lower the role first if you want to grant only specific areas.</p>
          </div>
        ) : (
          <>
            <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
              <p className="text-[11px] text-gray-400">Grant access to specific admin sections</p>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-[11px] font-bold text-blue-400 hover:text-blue-300">Select all</button>
                <span className="text-gray-700">·</span>
                <button onClick={clearAll} className="text-[11px] font-bold text-gray-400 hover:text-gray-300">Clear</button>
              </div>
            </div>
            <div className="p-5 overflow-y-auto space-y-4">
              {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => {
                const allOn = perms.every(p => selected.has(p));
                return (
                  <div key={group}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{group}</p>
                      <button onClick={() => toggleGroup(perms, !allOn)}
                        className="text-[10px] font-bold text-gray-500 hover:text-gray-300">{allOn ? 'Uncheck all' : 'Check all'}</button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {perms.map(p => (
                        <label key={p} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-xs transition-colors ${selected.has(p) ? 'bg-blue-600/20 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-750'}`}>
                          <input type="checkbox" checked={selected.has(p)} onChange={() => toggle(p)}
                            className="rounded accent-blue-500"/>
                          {PERM_LABELS[p] || p}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-4 border-t border-gray-800 flex justify-end gap-2">
              <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-800 border border-gray-700 text-gray-300 hover:text-white">Cancel</button>
              <button onClick={save} disabled={saving}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-60">
                {saving ? 'Saving…' : `Save access (${selected.size})`}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

/* ── Create user form ────────────────────────────────────────────────────── */
const CreateUserForm = ({ onSave, onCancel, saving, roles = ROLES }) => {
  const [form, setForm] = useState({ fullName:'', email:'', phone:'', password:'', role:'USER', company:'' });
  const ch = useCallback((key, value) => setForm(prev => ({ ...prev, [key]: value })), []);

  return (
    <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}}
      className="bg-gray-800 rounded-2xl border border-gray-700 p-6 mb-5 shadow-xl">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-white text-lg flex items-center gap-2"><Plus className="h-5 w-5 text-green-400"/> Create User</h3>
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400"><X className="h-4 w-4"/></button>
      </div>
      <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { k:'fullName', label:'Full Name *', ph:'Full name' },
          { k:'email',    label:'Email *',     ph:'email@example.com', type:'email' },
          { k:'phone',    label:'Phone',       ph:'+91 XXXXX XXXXX', type:'tel' },
          { k:'password', label:'Password *',  ph:'Min 8 characters', type:'password' },
          { k:'company',  label:'Company',     ph:'Organisation (optional)' },
        ].map(f => (
          <div key={f.k}>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">{f.label}</label>
            <input required={f.label.includes('*')} type={f.type||'text'} value={form[f.k]}
              onChange={e => ch(f.k, e.target.value)} placeholder={f.ph}
              className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 placeholder-gray-600"/>
          </div>
        ))}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Role</label>
          <select value={form.role} onChange={e => ch('role', e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none">
            {roles.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div className="col-span-2 flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 brand-gradient text-white font-bold rounded-xl text-sm disabled:opacity-60">
            {saving ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <CheckCircle className="h-4 w-4"/>}
            {saving ? 'Creating…' : 'Create User'}
          </button>
          <button type="button" onClick={onCancel} className="px-5 py-2.5 bg-gray-700 text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-600">Cancel</button>
        </div>
      </form>
    </motion.div>
  );
};

const AdminUsers = () => {
  const { toast } = useToast();
  const { isSuperAdmin } = useAuth();
  const [search, setSearch]       = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [confirm, setConfirm]     = useState(null);
  const [permUser, setPermUser]   = useState(null); // user whose access is being managed
  const { items, loading, setFilter, refetch } = usePaginated(adminUsersApi.list, { size: 50 });
  const roleOptions = isSuperAdmin ? SUPER_ROLES : ROLES;
  const [updateRole]  = useMutation(adminUsersApi.updateRole);
  const [toggleActive]= useMutation(adminUsersApi.toggleActive);
  const [remove]      = useMutation(adminUsersApi.delete);
  const [create, {loading:creating}] = useMutation(adminUsersApi.create);

  const handleRoleChange = (id, role) => {
    setConfirm({
      msg: `Change role to ${role}?`,
      danger: false,
      onConfirm: async () => {
        await updateRole(id, role); setConfirm(null); refetch();
        toast({ title:`✓ Role updated to ${role}` });
      },
    });
  };
  const handleToggle = (id, name, active) => {
    setConfirm({
      msg: `${active ? 'Disable' : 'Enable'} user "${name}"?`,
      danger: active,
      onConfirm: async () => {
        await toggleActive(id); setConfirm(null); refetch();
        toast({ title: `✓ User ${active?'disabled':'enabled'}` });
      },
    });
  };
  const handleDelete = (id, name) => {
    setConfirm({
      msg: `Permanently delete user "${name}"? This cannot be undone.`,
      onConfirm: async () => {
        await remove(id); setConfirm(null); refetch();
        toast({ title:'✓ User deleted' });
      },
    });
  };
  const handleCreate = async (form) => {
    const res = await create(form);
    if (res.error) { toast({ title:'Failed', description:res.error, variant:'destructive' }); return; }
    toast({ title:'✓ User created' }); setShowCreate(false); refetch();
  };

  const filtered = items.filter(u => !search ||
    u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 sm:p-6">
      {confirm && <ConfirmDialog message={confirm.msg} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} danger={confirm.danger!==false}/>}
      <AnimatePresence>
        {permUser && <PermissionsModal user={permUser} onClose={() => setPermUser(null)} onSaved={refetch}/>}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">User Management</h1>
          <p className="text-gray-400 text-sm mt-0.5">{items.length} registered users</p>
        </div>
        <button onClick={() => setShowCreate(f=>!f)}
          className="flex items-center gap-2 px-4 py-2 brand-gradient text-white font-bold rounded-xl text-sm hover:opacity-90">
          <Plus className="h-4 w-4"/> Create User
        </button>
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"/>
        <input value={search} onChange={e => { setSearch(e.target.value); setFilter('q', e.target.value||undefined); }}
          placeholder="Search users…"
          className="pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 w-full"/>
      </div>

      <AnimatePresence>
        {showCreate && <CreateUserForm onSave={handleCreate} onCancel={() => setShowCreate(false)} saving={creating} roles={roleOptions}/>}
      </AnimatePresence>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['User','Email','Role','Company','Joined','Status','Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? [...Array(5)].map((_,i) => <tr key={i} className="border-b">{[...Array(7)].map((_,j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 animate-pulse rounded w-20"/></td>)}</tr>)
                : filtered.map(u => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                          {(u.fullName||u.email||'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-xs">{u.fullName||'—'}</p>
                          <p className="text-[10px] text-gray-400">{u.phone||''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold border-0 cursor-pointer ${ROLE_COLORS[u.role]||'bg-gray-100 text-gray-600'}`}>
                        {roleOptions.map(r => <option key={r}>{r}</option>)}
                        {/* keep the current role visible even if not in the list */}
                        {!roleOptions.includes(u.role) && <option key={u.role}>{u.role}</option>}
                      </select>
                      {isSuperAdmin && u.role !== 'ADMIN' && u.role !== 'SUPER_ADMIN' && (
                        <button onClick={() => setPermUser(u)}
                          className="ml-1.5 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 hover:bg-amber-100"
                          title="Grant custom access to specific sections">
                          <KeyRound className="h-3 w-3"/>
                          {(u.effectivePermissions?.length || 0) > 0 ? `${u.effectivePermissions.length} perms` : 'Access'}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{u.company||'—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${u.active!==false?'bg-green-100 text-green-700':'bg-red-100 text-red-600'}`}>
                        {u.active!==false?'Active':'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleToggle(u.id, u.fullName||u.email, u.active!==false)}
                          className={`p-1.5 rounded-lg text-xs transition-colors ${u.active!==false?'bg-amber-50 text-amber-600 hover:bg-amber-100':'bg-green-50 text-green-600 hover:bg-green-100'}`}
                          title={u.active!==false?'Disable':'Enable'}>
                          {u.active!==false ? <UserX className="h-3.5 w-3.5"/> : <UserCheck className="h-3.5 w-3.5"/>}
                        </button>
                        <button onClick={() => handleDelete(u.id, u.fullName||u.email)}
                          className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100" title="Delete">
                          <Trash2 className="h-3.5 w-3.5"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
        {filtered.length===0&&!loading&&<div className="text-center py-16 text-gray-400"><Users className="h-12 w-12 mx-auto mb-3 opacity-20"/><p className="font-semibold">No users found</p></div>}
      </div>
    </div>
  );
};

export default AdminUsers;
