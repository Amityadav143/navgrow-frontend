/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 · navgrow.org · info@navgrow.org
 * Unauthorised reproduction, modification or distribution is strictly prohibited.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Package, Heart, Settings, LogOut, Edit2, CheckCircle, AlertCircle,
  Camera, Lock, Bell, MapPin, Phone, Mail, Building, CreditCard, Globe,
  ShoppingBag, Clock, Star, ChevronRight, Eye, Download, Plus, Trash2,
  Navigation, Copy, X, FileText, Shield, RefreshCw,
} from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { ordersApi, userApi, addressApi, companyApi } from '@/lib/api';
import PageHero from '@/components/PageHero';
import OrderTrackWidget from '@/components/OrderTrackWidget';
import { useApi } from '@/hooks/useApi';
import useSeo from '@/hooks/useSeo';
import AuthModal from '@/components/AuthModal';
import { useConfirm } from '@/components/ConfirmDialog';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Chandigarh','Jammu & Kashmir','Ladakh',
];

const StatusBadge = ({ status }) => {
  const cfg = {
    PENDING:   { cls:'bg-yellow-100 text-yellow-700', label:'Pending' },
    CONFIRMED: { cls:'bg-blue-100 text-blue-700',     label:'Confirmed' },
    SHIPPED:   { cls:'bg-cyan-100 text-cyan-700',     label:'Shipped' },
    DELIVERED: { cls:'bg-green-100 text-green-700',   label:'Delivered' },
    CANCELLED: { cls:'bg-red-100 text-red-700',       label:'Cancelled' },
  };
  const c = cfg[status] || { cls:'bg-gray-100 text-gray-600', label: status };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${c.cls}`}>{c.label}</span>;
};

const TABS = [
  { id:'orders',    label:'My Orders',   icon:Package },
  { id:'profile',   label:'Profile',     icon:User },
  { id:'company',   label:'Company/GST', icon:Building },
  { id:'addresses', label:'Addresses',   icon:MapPin },
  { id:'wishlist',  label:'Wishlist',    icon:Heart },
  { id:'security',  label:'Password',    icon:Lock },
];

/* ── Address form ───────────────────────────────────────────────────────── */
const EMPTY_ADDR = {
  label:'', recipientName:'', phone:'', addressLine1:'', addressLine2:'',
  locality:'', city:'', state:'West Bengal', pincode:'', country:'India',
  type:'BOTH', isDefault:false,
};

/* ── AddressField — module-level to prevent cursor-jump in AddressForm ───── */
const AddressField = ({ k, label, req, type='text', ph, full=false, form, onChange, autoComplete, inputMode }) => (
  <div className={full?'sm:col-span-2':''}>
    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
      {label}{req&&<span className="text-red-400 ml-1">*</span>}
    </label>
    <input required={req} type={type} value={form[k]??''} onChange={e=>onChange(k,e.target.value)} placeholder={ph}
      autoComplete={autoComplete} inputMode={inputMode}
      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"/>
  </div>
);

const AddressForm = ({ initial, onSave, onCancel, saving }) => {
  const [form, setForm] = useState(initial || EMPTY_ADDR);
  const [locating, setLocating] = useState(false);
  const ch = useCallback((k,v) => setForm(p => ({ ...p, [k]:v })), []);

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          const addr = data.address || {};
          setForm(prev => ({
            ...prev,
            addressLine1: [addr.road, addr.neighbourhood].filter(Boolean).join(', '),
            locality:     addr.suburb || addr.village || addr.town || '',
            city:         addr.city || addr.town || addr.county || '',
            state:        INDIAN_STATES.find(s => s.toLowerCase() === (addr.state||'').toLowerCase()) || prev.state,
            pincode:      addr.postcode || '',
            country:      'India',
          }));
        } catch {/* ignore */} finally { setLocating(false); }
      },
      () => setLocating(false)
    );
  };



  return (
    <div className="bg-gray-50 rounded-2xl border-2 border-blue-100 p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
          {initial ? <Edit2 className="h-4 w-4 text-blue-600"/> : <Plus className="h-4 w-4 text-green-600"/>}
          {initial ? 'Edit Address' : 'Add New Address'}
        </h4>
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500"><X className="h-4 w-4"/></button>
      </div>

      {/* Detect location button */}
      <button type="button" onClick={detectLocation} disabled={locating}
        className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 mb-4 transition-colors disabled:opacity-50">
        <Navigation className={`h-3.5 w-3.5 ${locating?'animate-spin':''}`}/>
        {locating ? 'Detecting…' : 'Use my current location'}
      </button>

      <form onSubmit={e=>{e.preventDefault();onSave(form);}} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AddressField k="label" label="Label (Home/Office/Site)" ph="e.g. Office, Home, Project Site" full form={form} onChange={ch}/>
        <AddressField k="recipientName" label="Recipient Name *" ph="Full name" req form={form} onChange={ch} autoComplete="name"/>
        <AddressField k="phone" label="Phone *" ph="+91 XXXXX XXXXX" req type="tel" form={form} onChange={ch} autoComplete="tel" inputMode="tel"/>
        <AddressField k="addressLine1" label="Address Line 1 *" ph="Street, Locality" req full form={form} onChange={ch} autoComplete="address-line1"/>
        <AddressField k="addressLine2" label="Address Line 2" ph="Landmark, Building (optional)" full form={form} onChange={ch} autoComplete="address-line2"/>
        <AddressField k="locality" label="Locality / Area" ph="Colony, Area, Ward" full form={form} onChange={ch}/>
        <AddressField k="city" label="City *" ph="e.g. Siliguri" req form={form} onChange={ch} autoComplete="address-level2"/>
        <AddressField k="pincode" label="Pincode *" ph="734001" req form={form} onChange={ch} autoComplete="postal-code" inputMode="numeric"/>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">State *</label>
          <select required value={form.state} onChange={e=>ch('state',e.target.value)}
            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white">
            {INDIAN_STATES.map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Address Type</label>
          <select value={form.type} onChange={e=>ch('type',e.target.value)}
            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white">
            <option value="BOTH">Billing &amp; Shipping</option>
            <option value="BILLING">Billing Only</option>
            <option value="SHIPPING">Shipping Only</option>
          </select>
        </div>
        <div className="sm:col-span-2 flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200">
          <input type="checkbox" id="addr-default" checked={form.isDefault} onChange={e=>ch('isDefault',e.target.checked)} className="w-4 h-4 accent-blue-500"/>
          <label htmlFor="addr-default" className="text-sm text-gray-700 font-medium cursor-pointer">Set as default address</label>
        </div>
        <div className="sm:col-span-2 flex gap-3 pt-1">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 brand-gradient text-white font-bold rounded-xl text-sm disabled:opacity-60">
            {saving?<span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>:<CheckCircle className="h-4 w-4"/>}
            {saving?'Saving…':initial?'Update Address':'Save Address'}
          </button>
          <button type="button" onClick={onCancel} className="px-5 py-2.5 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:border-gray-300">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

/* ── ProfileInputField — module-level to prevent cursor jump ──────────── */
const ProfileInputField = ({ k, label, type='text', ph, icon:Icon, profile, onChange }) => (
  <div>
    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-3 h-4 w-4 text-gray-300"/>}
      <input type={type} value={profile[k]||''} onChange={e=>onChange(k, e.target.value)}
        placeholder={ph}
        className={`w-full ${Icon?'pl-10':'pl-4'} pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors`}/>
    </div>
  </div>
);

/* ── Main AccountPage ────────────────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════════════
 * LoginGate — shown at /account when visitor is not authenticated
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * ═══════════════════════════════════════════════════════════════════════════ */
const LoginGate = () => {
  const [modalOpen, setModalOpen] = React.useState(false);
  return (
    <>
      <div className="flex flex-col gap-3">
        <button
          onClick={() => setModalOpen(true)}
          className="w-full py-3.5 brand-gradient text-white font-bold rounded-2xl shadow-md hover:opacity-90 transition-opacity text-sm">
          Sign In to My Account
        </button>
        <button
          onClick={() => setModalOpen(true)}
          className="w-full py-3.5 border-2 border-gray-200 text-gray-700 font-bold rounded-2xl hover:border-blue-300 hover:bg-blue-50 transition-all text-sm">
          Create New Account
        </button>
        <a
          href="https://wa.me/918927070972?text=Hi%20Navgrow%2C%20I%20need%20help%20with%20my%20account"
          target="_blank" rel="noopener noreferrer"
          className="w-full py-3 flex items-center justify-center gap-2 text-sm font-bold rounded-2xl hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#25D366', color: 'white' }}>
          <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Chat on WhatsApp
        </a>
      </div>
      {/* AuthModal uses fixed positioning — stays centred on scroll */}
      <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};

const AccountPage = () => {
  useSeo({ title:'My Account', path:'/account' });
  const { user, isLoggedIn, logout } = useAuth();
  const { wishlist, toggleWishlist, moveToCart, addItem, setCartOpen } = useCart();
  const navigate = useNavigate();
  const confirm  = useConfirm();
  const fileRef  = useRef();

  const [tab,        setTab]       = useState('orders');
  const [profile,    setProfile]   = useState({ fullName:'', phone:'', company:'', locality:'', city:'', state:'West Bengal', pincode:'', bio:'' });
  const [avatarUrl,  setAvatarUrl] = useState('');
  const [saving,     setSaving]    = useState(false);
  const [profileMsg, setProfileMsg]= useState({ type:'', text:'' });
  const [pwForm,     setPwForm]    = useState({ current:'', next:'', confirm:'' });
  const [pwMsg,      setPwMsg]     = useState({ type:'', text:'' });
  const [companyForm,setCompanyForm]=useState({ companyName:'', gstin:'', pan:'', businessType:'', website:'', registeredAddress:'' });
  const [companyMsg, setCompanyMsg]= useState({ type:'', text:'' });
  const [addresses,  setAddresses] = useState([]);
  const [addrLoading,setAddrLoading]=useState(false);
  const [showAddrForm,setShowAddrForm]=useState(false);
  const [editingAddr,setEditingAddr]=useState(null);
  const [addrSaving, setAddrSaving]= useState(false);

  const { data: orders, loading: ordersLoading } = useApi(
    () => ordersApi.myOrders({ page:0, size:50 }), [isLoggedIn], { immediate: isLoggedIn }
  );

  // Stable profile field updater for ProfileInputField.
  // MUST live above the `if (!isLoggedIn) return …` guard: hooks after a
  // conditional return violate the Rules of Hooks, and signing out flipped
  // isLoggedIn mid-render — React then threw "Rendered fewer hooks than
  // expected", which the root ErrorBoundary surfaced as "Something went wrong".
  const handleProfileChange = React.useCallback((k, v) => {
    setProfile(p => ({ ...p, [k]: v }));
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    // Load profile
    userApi.profile().then(r => {
      const d = r.data;
      setProfile({
        fullName: d.fullName||'', phone: d.phone||'', company: d.company||'',
        locality: d.locality||'', city: d.city||'', state: d.state||'West Bengal',
        pincode:  d.pincode||'', bio: d.bio||'',
      });
      // FIX 1: avatarUrl comes from server — persisted correctly
      if (d.avatarUrl) setAvatarUrl(d.avatarUrl);
    }).catch(() => {});
    // Load addresses
    setAddrLoading(true);
    addressApi.list().then(r => setAddresses(r.data||[])).catch(()=>{}).finally(()=>setAddrLoading(false));
    // Load company
    companyApi.get().then(r => {
      const d = r.data;
      if (d) setCompanyForm({
        companyName:       d.companyName||'',
        gstin:             d.gstin||'',
        pan:               d.pan||'',
        businessType:      d.businessType||'',
        website:           d.website||'',
        registeredAddress: d.registeredAddress||'',
      });
    }).catch(()=>{});
  }, [isLoggedIn]);

  // Show login/signup gate instead of silent redirect
  if (!isLoggedIn) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-10 max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full brand-gradient flex items-center justify-center mx-auto mb-5 shadow-lg">
          <svg className="h-9 w-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Sign in to your account</h2>
        <p className="text-gray-500 text-sm mb-7 leading-relaxed">
          Access your orders, saved addresses, wishlist, and company profile.
        </p>
        <LoginGate />
        <p className="text-xs text-gray-400 mt-5">
          Your data is safe — 256-bit SSL encrypted.
        </p>
      </div>
    </div>
  );

  // FIX 1: Avatar — store as base64 locally AND save to server on profile save
  const handleAvatarChange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 2*1024*1024) { setProfileMsg({ type:'error', text:'Image must be under 2MB.' }); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target.result;
      setAvatarUrl(dataUrl);
      // Auto-save avatar immediately so it persists on reload
      userApi.updateProfile({ avatarUrl: dataUrl }).catch(()=>{});
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await userApi.updateProfile({ ...profile, avatarUrl });
      setProfileMsg({ type:'success', text:'Profile updated successfully!' });
    } catch (err) {
      setProfileMsg({ type:'error', text: err.response?.data?.message || 'Update failed.' });
    } finally {
      setSaving(false); setTimeout(() => setProfileMsg({ type:'', text:'' }), 3000);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) { setPwMsg({ type:'error', text:'Passwords do not match.' }); return; }
    if (pwForm.next.length < 8) { setPwMsg({ type:'error', text:'Password must be at least 8 characters.' }); return; }
    setSaving(true);
    try {
      await userApi.changePassword({ currentPassword: pwForm.current, newPassword: pwForm.next });
      setPwMsg({ type:'success', text:'Password changed!' }); setPwForm({ current:'', next:'', confirm:'' });
    } catch (err) {
      setPwMsg({ type:'error', text: err.response?.data?.message || 'Failed.' });
    } finally { setSaving(false); setTimeout(() => setPwMsg({ type:'', text:'' }), 4000); }
  };

  const saveCompany = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await companyApi.save(companyForm);
      setCompanyMsg({ type:'success', text:'Company details saved!' });
    } catch (err) {
      setCompanyMsg({ type:'error', text: err.response?.data?.message || 'Failed to save.' });
    } finally { setSaving(false); setTimeout(() => setCompanyMsg({ type:'', text:'' }), 3000); }
  };

  const handleSaveAddr = async (form) => {
    setAddrSaving(true);
    try {
      if (editingAddr) { await addressApi.update(editingAddr.id, form); }
      else             { await addressApi.create(form); }
      const updated = await addressApi.list();
      setAddresses(updated.data || []);
      setShowAddrForm(false); setEditingAddr(null);
    } catch (err) {
      console.error('Address save failed', err);
    } finally { setAddrSaving(false); }
  };

  const handleDeleteAddr = async (id) => {
    const ok = await confirm({
      title: 'Delete this address?',
      message: 'This delivery address will be permanently removed from your account.',
      confirmText: 'Delete Address',
      variant: 'danger',
    });
    if (!ok) return;
    await addressApi.delete(id);
    setAddresses(prev => prev.filter(a => a.id !== id));
  };


  const handleReorder = (order) => {
    if (!order.orderItems?.length) return;
    let added = 0;
    order.orderItems.forEach(item => {
      // Reorder must carry the line's own tax data. Without gstRate/hsn the cart
      // falls back to 18%, so reordering a 12% item showed the wrong tax.
      addItem({
        id:       item.productId || item.id,
        name:     item.productName || 'Product',
        price:    Number(item.unitPrice || item.price || 0),
        image:    item.imageUrl || '',
        qty:      item.quantity || 1,
        gstRate:  item.gstRate != null ? Number(item.gstRate) : undefined,
        hsn:      item.hsnCode || item.hsn || undefined,
      });
      added++;
    });
    if (added > 0) { setCartOpen(true); }
  };

  const orderList  = orders?.content || (Array.isArray(orders) ? orders : []);
  const totalSpend = orderList.filter(o=>o.paymentStatus==='PAID').reduce((s,o)=>s+(o.grandTotal||0),0);



  return (
    <>
      <PageHero
        chip={<><User className="h-4 w-4"/> My Account</>}
        title={<>Welcome back<span className="gradient-text">{profile.fullName?`, ${profile.fullName.split(' ')[0]}`:''}</span>!</>}
        subtitle="Manage your profile, addresses, orders, and company details."
        breadcrumbs={[{ label:'My Account' }]}
      />

      <section className="py-12 bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

            {/* ── Sidebar ── */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
                <div className="relative w-20 h-20 mx-auto mb-4">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-blue-200 border-4 border-white shadow-lg">
                    {avatarUrl
                      ? <img loading="lazy" decoding="async" src={avatarUrl} alt="Profile" className="w-full h-full object-cover"/>
                      : <div className="w-full h-full flex items-center justify-center">
                          <span className="text-2xl font-extrabold text-blue-600">
                            {(profile.fullName||user?.email||'U')[0].toUpperCase()}
                          </span>
                        </div>
                    }
                  </div>
                  <button onClick={() => fileRef.current?.click()}
                    className="absolute bottom-0 right-0 w-7 h-7 brand-gradient rounded-full flex items-center justify-center shadow-lg hover:opacity-90"
                    title="Change profile photo">
                    <Camera className="h-3.5 w-3.5 text-white"/>
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden"/>
                </div>
                <p className="font-bold text-gray-900 text-sm">{profile.fullName||'Your Name'}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{user?.email}</p>
                {(profile.city||profile.state) && (
                  <p className="text-xs text-gray-400 flex items-center justify-center gap-1 mt-1">
                    <MapPin className="h-3 w-3"/>{[profile.city, profile.state].filter(Boolean).join(', ')}
                  </p>
                )}
                {companyForm.companyName && (
                  <p className="text-xs text-blue-600 flex items-center justify-center gap-1 mt-1">
                    <Building className="h-3 w-3"/>{companyForm.companyName}
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                {[
                  { label:'Orders',     value: orderList.length,     icon:Package,    color:'text-blue-600' },
                  { label:'Spent',      value:`₹${Math.round(totalSpend).toLocaleString('en-IN')}`, icon:CreditCard, color:'text-green-600' },
                  { label:'Wishlist',   value: wishlist.length,      icon:Heart,      color:'text-red-500' },
                  { label:'Addresses',  value: addresses.length,     icon:MapPin,     color:'text-amber-600' },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <s.icon className={`h-4 w-4 ${s.color}`}/>
                      <span className="text-xs text-gray-500 font-medium">{s.label}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{s.value}</span>
                  </div>
                ))}
              </div>

              {/* Tab nav */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-b border-gray-50 last:border-0 ${
                      tab===t.id ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-50'
                    }`}>
                    <t.icon className="h-4 w-4 shrink-0"/>
                    {t.label}
                    <ChevronRight className="h-3.5 w-3.5 ml-auto text-gray-300"/>
                  </button>
                ))}
                <button onClick={() => { logout(); navigate('/'); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
                  <LogOut className="h-4 w-4 shrink-0"/> Sign Out
                </button>
              </div>
            </div>

            {/* ── Main content ── */}
            <div className="lg:col-span-3">
              <AnimatePresence mode="wait">
                <motion.div key={tab} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} transition={{duration:.2}}>

                  {/* ─── ORDERS ─────────────────────────────────────────── */}
                  {tab==='orders' && (
                    <div>
                      <OrderTrackWidget className="mb-6" />
                      <h2 className="text-xl font-extrabold text-gray-900 mb-4">Order History</h2>
                      {ordersLoading
                        ? <div className="space-y-3">{[...Array(3)].map((_,i)=><div key={i} className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse"/>)}</div>
                        : orderList.length === 0
                        ? <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                            <ShoppingBag className="h-12 w-12 text-gray-200 mx-auto mb-3"/>
                            <p className="font-bold text-gray-500">No orders yet</p>
                            <Link to="/shop" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 brand-gradient text-white font-bold rounded-xl text-sm"><ShoppingBag className="h-4 w-4"/> Browse Shop</Link>
                          </div>
                        : <div className="space-y-3">
                            {orderList.map(order => (
                              <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                                  <div>
                                    <p className="font-bold text-gray-900 text-sm font-mono">{order.orderNumber}</p>
                                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                      <Clock className="h-3 w-3"/>
                                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—'}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <StatusBadge status={order.status}/>
                                    <span className="font-extrabold text-gray-900 text-sm">₹{(order.grandTotal||0).toLocaleString('en-IN')}</span>
                                  </div>
                                </div>
                                {order.orderItems?.length > 0 && (
                                  <div className="flex gap-2 overflow-x-auto pb-1">
                                    {order.orderItems.map((item,i)=>(
                                      <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 shrink-0">
                                        <p className="text-xs text-gray-700 font-medium">{item.productName}</p>
                                        <span className="text-[10px] text-gray-400">×{item.quantity}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div className="flex items-center gap-3 mt-3">
                                  <Link to={`/track-order?order=${order.orderNumber}`} className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800">
                                    <Eye className="h-3.5 w-3.5"/> Track Order
                                  </Link>
                                  {(order.paymentStatus === 'PAID' || order.paymentStatus === 'CAPTURED') && (
                                    <a href={ordersApi.invoiceUrl(order.orderNumber, order.customerEmail || user?.email)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-700">
                                      <Download className="h-3.5 w-3.5"/> GST Invoice
                                    </a>
                                  )}
                                  {order.orderItems?.length > 0 && (
                                    <button onClick={() => handleReorder(order)}
                                      className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
                                      <RefreshCw className="h-3.5 w-3.5"/> Reorder
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                      }
                    </div>
                  )}

                  {/* ─── PROFILE ─────────────────────────────────────────── */}
                  {tab==='profile' && (
                    <div>
                      <h2 className="text-xl font-extrabold text-gray-900 mb-4">Edit Profile</h2>
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        {/* Avatar section */}
                        <div className="flex items-center gap-5 mb-6 pb-6 border-b border-gray-100">
                          <div className="relative w-20 h-20 shrink-0">
                            <div className="w-20 h-20 rounded-full overflow-hidden bg-blue-50 border-4 border-white shadow-lg">
                              {avatarUrl
                                ? <img loading="lazy" decoding="async" src={avatarUrl} alt="Profile" className="w-full h-full object-cover"/>
                                : <div className="w-full h-full flex items-center justify-center">
                                    <span className="text-2xl font-extrabold text-blue-600">{(profile.fullName||user?.email||'U')[0].toUpperCase()}</span>
                                  </div>
                              }
                            </div>
                            <button onClick={() => fileRef.current?.click()}
                              className="absolute bottom-0 right-0 w-7 h-7 brand-gradient rounded-full flex items-center justify-center shadow-lg hover:opacity-90">
                              <Camera className="h-3.5 w-3.5 text-white"/>
                            </button>
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">Profile Photo</p>
                            <p className="text-xs text-gray-400 mt-0.5">JPG or PNG, max 2MB. Saved immediately on selection.</p>
                            <button onClick={() => fileRef.current?.click()} className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                              <Camera className="h-3.5 w-3.5"/> Upload Photo
                            </button>
                          </div>
                        </div>

                        <form onSubmit={saveProfile} className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <ProfileInputField k="fullName" label="Full Name"    ph="Your full name"         icon={User} profile={profile} onChange={handleProfileChange}/>
                            <ProfileInputField k="phone"    label="Phone"        ph="+91 XXXXX XXXXX"        icon={Phone} type="tel" profile={profile} onChange={handleProfileChange}/>
                            <ProfileInputField k="company"  label="Company"      ph="Company name (optional)" icon={Building} profile={profile} onChange={handleProfileChange}/>
                            <ProfileInputField k="locality" label="Locality / Area" ph="Colony, Ward, Area"  icon={MapPin} profile={profile} onChange={handleProfileChange} profile={profile} onChange={handleProfileChange}/>
                            <ProfileInputField k="city"     label="City"         ph="e.g. Siliguri"          icon={MapPin} profile={profile} onChange={handleProfileChange} profile={profile} onChange={handleProfileChange}/>
                            <ProfileInputField k="pincode"  label="Pincode"      ph="734001"                 icon={MapPin} profile={profile} onChange={handleProfileChange} profile={profile} onChange={handleProfileChange}/>
                            <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">State</label>
                              <select value={profile.state} onChange={e=>setProfile(p=>({...p,state:e.target.value}))}
                                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white">
                                {INDIAN_STATES.map(s=><option key={s}>{s}</option>)}
                              </select>
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Short Bio (optional)</label>
                              <textarea value={profile.bio} onChange={e=>setProfile(p=>({...p,bio:e.target.value}))} rows={2}
                                placeholder="A short note about yourself or your organisation…"
                                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 resize-none transition-colors"/>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <Mail className="h-4 w-4 text-gray-400 shrink-0"/>
                            <div>
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Email Address</p>
                              <p className="text-sm font-semibold text-gray-700">{user?.email}</p>
                            </div>
                            <span className="ml-auto text-xs text-gray-600 bg-gray-200 px-2 py-0.5 rounded-full">Verified</span>
                          </div>
                          {profileMsg.text && (
                            <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${profileMsg.type==='success'?'bg-green-50 text-green-700 border border-green-200':'bg-red-50 text-red-700 border border-red-200'}`}>
                              {profileMsg.type==='success'?<CheckCircle className="h-4 w-4 shrink-0"/>:<AlertCircle className="h-4 w-4 shrink-0"/>}
                              {profileMsg.text}
                            </div>
                          )}
                          <button type="submit" disabled={saving}
                            className="w-full py-3 btn-gold rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                            {saving?<span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>:<CheckCircle className="h-4 w-4"/>}
                            {saving?'Saving…':'Save Profile'}
                          </button>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* ─── COMPANY / GST ───────────────────────────────────── */}
                  {tab==='company' && (
                    <div>
                      <h2 className="text-xl font-extrabold text-gray-900 mb-4">Company & GST Details</h2>
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl mb-5">
                          <Shield className="h-5 w-5 text-blue-600 mt-0.5 shrink-0"/>
                          <p className="text-xs text-blue-700 leading-relaxed">
                            Company details are used for B2B GST invoices. Your GSTIN is required to receive GST-compliant invoices
                            for tax input credit. These details are stored securely and only used for invoice generation.
                          </p>
                        </div>
                        <form onSubmit={saveCompany} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {[
                            { k:'companyName',        label:'Company / Organisation Name', ph:'e.g. XYZ Industries Pvt. Ltd.', full:true },
                            { k:'gstin',              label:'GSTIN (GST Identification No)', ph:'22AAAAA0000A1Z5' },
                            { k:'pan',                label:'PAN Number',                  ph:'AAAAA1111A' },
                            { k:'businessType',       label:'Business Type',               ph:'e.g. Private Limited, Partnership, Proprietorship' },
                            { k:'website',            label:'Website / Portal',            ph:'https://yourcompany.com', full:false },
                            { k:'registeredAddress',  label:'Registered Address',          ph:'Registered office address as per GST', full:true },
                          ].map(f => (
                            <div key={f.k} className={f.full?'sm:col-span-2':''}>
                              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{f.label}</label>
                              {f.k==='registeredAddress'
                                ? <textarea value={companyForm[f.k]} onChange={e=>setCompanyForm(p=>({...p,[f.k]:e.target.value}))}
                                    rows={2} placeholder={f.ph}
                                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 resize-none"/>
                                : <input type="text" value={companyForm[f.k]} onChange={e=>setCompanyForm(p=>({...p,[f.k]:e.target.value}))}
                                    placeholder={f.ph}
                                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"/>
                              }
                            </div>
                          ))}
                          {companyMsg.text && (
                            <div className={`sm:col-span-2 flex items-center gap-2 p-3 rounded-xl text-sm ${companyMsg.type==='success'?'bg-green-50 text-green-700 border border-green-200':'bg-red-50 text-red-700 border border-red-200'}`}>
                              {companyMsg.type==='success'?<CheckCircle className="h-4 w-4 shrink-0"/>:<AlertCircle className="h-4 w-4 shrink-0"/>}
                              {companyMsg.text}
                            </div>
                          )}
                          <div className="sm:col-span-2">
                            <button type="submit" disabled={saving}
                              className="w-full py-3 btn-gold rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                              {saving?<span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>:<CheckCircle className="h-4 w-4"/>}
                              {saving?'Saving…':'Save Company Details'}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* ─── ADDRESSES ───────────────────────────────────────── */}
                  {tab==='addresses' && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-extrabold text-gray-900">Addresses</h2>
                        <button onClick={() => { setShowAddrForm(f=>!f); setEditingAddr(null); }}
                          className="flex items-center gap-2 px-4 py-2 brand-gradient text-white font-bold rounded-xl text-sm hover:opacity-90">
                          <Plus className="h-4 w-4"/> Add Address
                        </button>
                      </div>

                      <AnimatePresence>
                        {(showAddrForm || editingAddr) && (
                          <AddressForm
                            initial={editingAddr}
                            onSave={handleSaveAddr}
                            onCancel={() => { setShowAddrForm(false); setEditingAddr(null); }}
                            saving={addrSaving}
                          />
                        )}
                      </AnimatePresence>

                      {addrLoading
                        ? <div className="space-y-3">{[...Array(2)].map((_,i)=><div key={i} className="h-28 bg-white rounded-2xl border animate-pulse"/>)}</div>
                        : addresses.length === 0
                        ? <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                            <MapPin className="h-12 w-12 text-gray-200 mx-auto mb-3"/>
                            <p className="font-bold text-gray-500">No saved addresses</p>
                            <p className="text-sm text-gray-400 mt-1">Add a billing or shipping address for faster checkout.</p>
                          </div>
                        : <div className="space-y-3">
                            {addresses.map(addr => (
                              <div key={addr.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                      <p className="font-bold text-gray-900 text-sm">{addr.label || 'Address'}</p>
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        addr.type==='BILLING' ? 'bg-blue-100 text-blue-700' :
                                        addr.type==='SHIPPING' ? 'bg-green-100 text-green-700' :
                                        'bg-purple-100 text-purple-700'
                                      }`}>
                                        {addr.type==='BOTH' ? 'Billing & Shipping' : addr.type}
                                      </span>
                                      {addr.isDefault && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">Default</span>}
                                    </div>
                                    <p className="text-sm text-gray-700 font-medium">{addr.recipientName}</p>
                                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                                      {[addr.addressLine1, addr.addressLine2, addr.locality, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}
                                    </p>
                                    {addr.phone && <p className="text-xs text-gray-400 mt-0.5">{addr.phone}</p>}
                                  </div>
                                  <div className="flex gap-2 shrink-0">
                                    <button onClick={() => { setEditingAddr(addr); setShowAddrForm(false); }}
                                      className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="Edit">
                                      <Edit2 className="h-3.5 w-3.5"/>
                                    </button>
                                    <button onClick={() => handleDeleteAddr(addr.id)}
                                      className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors" title="Delete">
                                      <Trash2 className="h-3.5 w-3.5"/>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                      }
                    </div>
                  )}

                  {/* ─── WISHLIST ─────────────────────────────────────────── */}
                  {tab==='wishlist' && (
                    <div>
                      <h2 className="text-xl font-extrabold text-gray-900 mb-4">Wishlist ({wishlist.length})</h2>
                      {wishlist.length === 0
                        ? <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                            <Heart className="h-12 w-12 text-gray-200 mx-auto mb-3"/>
                            <p className="font-bold text-gray-500">Your wishlist is empty</p>
                            <Link to="/shop" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 brand-gradient text-white font-bold rounded-xl text-sm">Browse Shop</Link>
                          </div>
                        : <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {wishlist.map(item => (
                              <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                                <div className="flex gap-3">
                                  {item.image && <img loading="lazy" decoding="async" src={item.image} alt={item.name} className="w-16 h-16 rounded-xl object-cover bg-gray-100 shrink-0" onError={e=>{e.target.style.display='none'}}/>}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{item.name}</p>
                                    <p className="text-blue-700 font-bold text-sm mt-1">₹{(item.price||0).toLocaleString('en-IN')}</p>
                                  </div>
                                </div>
                                <div className="flex gap-2 mt-3">
                                  <button onClick={() => moveToCart(item)} className="flex-1 py-2 brand-gradient text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5">
                                    <ShoppingBag className="h-3.5 w-3.5"/> Add to Cart
                                  </button>
                                  <button onClick={() => toggleWishlist(item)} title="Remove from wishlist"
                                    className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                                    <Heart className="h-4 w-4 fill-red-400"/>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                      }
                    </div>
                  )}

                  {/* ─── SECURITY ─────────────────────────────────────────── */}
                  {tab==='security' && (
                    <div>
                      <h2 className="text-xl font-extrabold text-gray-900 mb-4">Change Password</h2>
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <form onSubmit={changePassword} className="space-y-4 max-w-md">
                          {[
                            { k:'current', label:'Current Password', ph:'Enter current password' },
                            { k:'next',    label:'New Password',     ph:'Min 8 characters' },
                            { k:'confirm', label:'Confirm New',      ph:'Repeat new password' },
                          ].map(f => (
                            <div key={f.k}>
                              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{f.label}</label>
                              <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-300"/>
                                <input type="password" value={pwForm[f.k]} onChange={e=>setPwForm(p=>({...p,[f.k]:e.target.value}))}
                                  placeholder={f.ph}
                                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"/>
                              </div>
                            </div>
                          ))}
                          {pwMsg.text && (
                            <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${pwMsg.type==='success'?'bg-green-50 text-green-700 border border-green-200':'bg-red-50 text-red-700 border border-red-200'}`}>
                              {pwMsg.type==='success'?<CheckCircle className="h-4 w-4"/>:<AlertCircle className="h-4 w-4"/>}
                              {pwMsg.text}
                            </div>
                          )}
                          <button type="submit" disabled={saving}
                            className="w-full py-3 brand-gradient text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                            {saving?<span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>:<Lock className="h-4 w-4"/>}
                            {saving?'Changing…':'Change Password'}
                          </button>
                        </form>
                      </div>
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default AccountPage;
