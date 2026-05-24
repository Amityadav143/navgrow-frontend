import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Package, Heart, Settings, LogOut, Edit2, CheckCircle, AlertCircle,
  Camera, Lock, Bell, MapPin, Phone, Mail, Building, CreditCard,
  ShoppingBag, Clock, Star, ChevronRight, Eye, Download,
} from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { ordersApi, userApi } from '@/lib/api';
import PageHero from '@/components/PageHero';
import { useApi } from '@/hooks/useApi';
import useSeo from '@/hooks/useSeo';

const StatusBadge = ({ status }) => {
  const cfg = {
    PENDING:    { cls: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
    CONFIRMED:  { cls: 'bg-blue-100 text-blue-700',    label: 'Confirmed' },
    PROCESSING: { cls: 'bg-indigo-100 text-indigo-700',label: 'Processing' },
    SHIPPED:    { cls: 'bg-cyan-100 text-cyan-700',    label: 'Shipped' },
    DELIVERED:  { cls: 'bg-green-100 text-green-700',  label: 'Delivered' },
    CANCELLED:  { cls: 'bg-red-100 text-red-700',      label: 'Cancelled' },
    REFUNDED:   { cls: 'bg-gray-100 text-gray-700',    label: 'Refunded' },
  };
  const c = cfg[status] || { cls:'bg-gray-100 text-gray-600', label: status };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${c.cls}`}>{c.label}</span>;
};

const TABS = [
  { id:'orders',   label:'My Orders',    icon:Package },
  { id:'wishlist', label:'Wishlist',      icon:Heart },
  { id:'profile',  label:'Profile',       icon:User },
  { id:'security', label:'Password',      icon:Lock },
  { id:'addresses',label:'Addresses',     icon:MapPin },
];

const AccountPage = () => {
  useSeo({ title: 'My Account', path: '/account' });
  const { user, isLoggedIn, logout } = useAuth();
  const { wishlist, removeFromWishlist, addItem, moveToCart } = useCart();
  const navigate = useNavigate();
  const fileRef = useRef();

  const [tab,         setTab]        = useState('orders');
  const [profile,     setProfile]    = useState({ fullName:'', phone:'', company:'', city:'', bio:'' });
  const [avatarUrl,   setAvatarUrl]  = useState('');
  const [saving,      setSaving]     = useState(false);
  const [profileMsg,  setProfileMsg] = useState({ type:'', text:'' });
  const [pwForm,      setPwForm]     = useState({ current:'', next:'', confirm:'' });
  const [pwMsg,       setPwMsg]      = useState({ type:'', text:'' });

  const { data: orders, loading: ordersLoading } = useApi(
    () => ordersApi.myOrders({ page:0, size:50 }),
    [isLoggedIn], { immediate: isLoggedIn }
  );

  useEffect(() => {
    if (!isLoggedIn) return;
    userApi.profile().then(r => {
      const d = r.data;
      setProfile({ fullName:d.fullName||'', phone:d.phone||'', company:d.company||'', city:d.city||'', bio:d.bio||'' });
      setAvatarUrl(d.avatarUrl || '');
    }).catch(() => {});
  }, [isLoggedIn]);

  if (!isLoggedIn) return <Navigate to="/" replace state={{ authRequired: true }} />;

  // Profile image upload (base64 preview — replace with S3 in prod)
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setProfileMsg({ type:'error', text:'Image must be under 2MB.' }); return; }
    const reader = new FileReader();
    reader.onload = ev => setAvatarUrl(ev.target.result);
    reader.readAsDataURL(file);
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await userApi.updateProfile({ ...profile, avatarUrl });
      setProfileMsg({ type:'success', text:'Profile updated successfully!' });
    } catch (err) {
      setProfileMsg({ type:'error', text: err.response?.data?.message || 'Update failed.' });
    } finally {
      setSaving(false);
      setTimeout(() => setProfileMsg({ type:'', text:'' }), 3000);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) { setPwMsg({ type:'error', text:'New passwords do not match.' }); return; }
    if (pwForm.next.length < 8) { setPwMsg({ type:'error', text:'Password must be at least 8 characters.' }); return; }
    setSaving(true);
    try {
      await userApi.changePassword({ currentPassword: pwForm.current, newPassword: pwForm.next });
      setPwMsg({ type:'success', text:'Password changed successfully!' });
      setPwForm({ current:'', next:'', confirm:'' });
    } catch (err) {
      setPwMsg({ type:'error', text: err.response?.data?.message || 'Failed to change password.' });
    } finally {
      setSaving(false);
      setTimeout(() => setPwMsg({ type:'', text:'' }), 4000);
    }
  };

  const orderList = orders?.content || (Array.isArray(orders) ? orders : []);
  const totalSpend = orderList.filter(o=>o.paymentStatus==='PAID').reduce((s,o)=>s+(o.grandTotal||0),0);

  return (
    <>
      <PageHero
        chip={<><User className="h-4 w-4"/> My Account</>}
        title={<>Welcome back<span className="gradient-text">{profile.fullName ? `, ${profile.fullName.split(' ')[0]}` : ''}!</span></>}
        subtitle="Manage your orders, profile, and preferences."
        breadcrumbs={[{ label:'My Account' }]}
      />

      <section className="py-12 bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

            {/* ── Sidebar ── */}
            <div className="lg:col-span-1 space-y-4">

              {/* Profile card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
                {/* Avatar */}
                <div className="relative w-20 h-20 mx-auto mb-4">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-blue-200 border-4 border-white shadow-lg">
                    {avatarUrl
                      ? <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover"/>
                      : <div className="w-full h-full flex items-center justify-center">
                          <span className="text-2xl font-extrabold text-blue-600">
                            {(profile.fullName || user?.email || 'U')[0].toUpperCase()}
                          </span>
                        </div>
                    }
                  </div>
                  <button onClick={() => fileRef.current?.click()}
                    className="absolute bottom-0 right-0 w-7 h-7 brand-gradient rounded-full flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity"
                    title="Change profile photo">
                    <Camera className="h-3.5 w-3.5 text-white"/>
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden"/>
                </div>

                <p className="font-bold text-gray-900 text-sm">{profile.fullName || 'Your Name'}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{user?.email}</p>
                {profile.city && <p className="text-xs text-gray-400 flex items-center justify-center gap-1 mt-1"><MapPin className="h-3 w-3"/>{profile.city}</p>}
              </div>

              {/* Stats */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                {[
                  { label:'Total Orders',   value: orderList.length, icon: Package,  color:'text-blue-600' },
                  { label:'Total Spend',    value:`₹${Math.round(totalSpend).toLocaleString('en-IN')}`, icon: CreditCard, color:'text-green-600' },
                  { label:'Wishlist Items', value: wishlist.length,  icon: Heart,    color:'text-red-500' },
                ].map(s=>(
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
                {TABS.map(t=>(
                  <button key={t.id} onClick={()=>setTab(t.id)}
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

                  {/* ORDERS */}
                  {tab === 'orders' && (
                    <div>
                      <h2 className="text-xl font-extrabold text-gray-900 mb-4">Order History</h2>
                      {ordersLoading
                        ? <div className="space-y-3">{[...Array(3)].map((_,i)=><div key={i} className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse"/>)}</div>
                        : orderList.length === 0
                        ? (
                          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                            <ShoppingBag className="h-12 w-12 text-gray-200 mx-auto mb-3"/>
                            <p className="font-bold text-gray-500">No orders yet</p>
                            <p className="text-sm text-gray-400 mt-1 mb-4">Browse our engineering shop and place your first order.</p>
                            <Link to="/shop" className="inline-flex items-center gap-2 px-5 py-2.5 brand-gradient text-white font-bold rounded-xl text-sm">
                              <ShoppingBag className="h-4 w-4"/> Browse Shop
                            </Link>
                          </div>
                        )
                        : (
                          <div className="space-y-3">
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
                                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                    {order.orderItems.map((item,i)=>(
                                      <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 shrink-0">
                                        <p className="text-xs text-gray-700 font-medium">{item.productName}</p>
                                        <span className="text-[10px] text-gray-400">×{item.quantity}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div className="flex items-center gap-2 mt-3">
                                  <Link to={`/track-order?order=${order.orderNumber}`}
                                    className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
                                    <Eye className="h-3.5 w-3.5"/> Track Order
                                  </Link>
                                  {order.invoiceUrl && (
                                    <a href={order.invoiceUrl} target="_blank" rel="noopener noreferrer"
                                      className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors">
                                      <Download className="h-3.5 w-3.5"/> Invoice
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      }
                    </div>
                  )}

                  {/* WISHLIST */}
                  {tab === 'wishlist' && (
                    <div>
                      <h2 className="text-xl font-extrabold text-gray-900 mb-4">Wishlist ({wishlist.length})</h2>
                      {wishlist.length === 0
                        ? (
                          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                            <Heart className="h-12 w-12 text-gray-200 mx-auto mb-3"/>
                            <p className="font-bold text-gray-500">Your wishlist is empty</p>
                            <p className="text-sm text-gray-400 mt-1 mb-4">Save products you like by clicking the heart icon.</p>
                            <Link to="/shop" className="inline-flex items-center gap-2 px-5 py-2.5 brand-gradient text-white font-bold rounded-xl text-sm">
                              <ShoppingBag className="h-4 w-4"/> Browse Shop
                            </Link>
                          </div>
                        )
                        : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {wishlist.map(item=>(
                              <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                                <div className="flex gap-3">
                                  {item.image && (
                                    <img src={item.image} alt={item.name}
                                      className="w-16 h-16 rounded-xl object-cover bg-gray-100 shrink-0"
                                      onError={e=>{e.target.style.display='none'}}/>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{item.name}</p>
                                    <p className="text-blue-700 font-bold text-sm mt-1">₹{(item.price||0).toLocaleString('en-IN')}</p>
                                  </div>
                                </div>
                                <div className="flex gap-2 mt-3">
                                  <button onClick={()=>moveToCart(item)}
                                    className="flex-1 py-2 brand-gradient text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5">
                                    <ShoppingBag className="h-3.5 w-3.5"/> Add to Cart
                                  </button>
                                  <button onClick={()=>typeof removeFromWishlist==='function'?removeFromWishlist(item.id):null}
                                    className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                                    <Heart className="h-4 w-4 fill-red-400"/>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      }
                    </div>
                  )}

                  {/* PROFILE */}
                  {tab === 'profile' && (
                    <div>
                      <h2 className="text-xl font-extrabold text-gray-900 mb-4">Edit Profile</h2>
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        {/* Profile image section */}
                        <div className="flex items-center gap-5 mb-6 pb-6 border-b border-gray-100">
                          <div className="relative w-20 h-20 shrink-0">
                            <div className="w-20 h-20 rounded-full overflow-hidden bg-blue-50 border-4 border-white shadow-lg">
                              {avatarUrl
                                ? <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover"/>
                                : <div className="w-full h-full flex items-center justify-center">
                                    <span className="text-2xl font-extrabold text-blue-600">
                                      {(profile.fullName || user?.email || 'U')[0].toUpperCase()}
                                    </span>
                                  </div>
                              }
                            </div>
                            <button onClick={()=>fileRef.current?.click()}
                              className="absolute bottom-0 right-0 w-7 h-7 brand-gradient rounded-full flex items-center justify-center shadow-lg hover:opacity-90">
                              <Camera className="h-3.5 w-3.5 text-white"/>
                            </button>
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">Profile Photo</p>
                            <p className="text-xs text-gray-400 mt-0.5">JPG or PNG, max 2MB. Shows in your account, reviews, and orders.</p>
                            <button onClick={()=>fileRef.current?.click()}
                              className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1">
                              <Camera className="h-3.5 w-3.5"/> Upload Photo
                            </button>
                          </div>
                        </div>

                        <form onSubmit={saveProfile} className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                              { k:'fullName', label:'Full Name',     ph:'Your full name',      icon:User },
                              { k:'phone',    label:'Phone Number',  ph:'+91 XXXXX XXXXX',     icon:Phone, type:'tel' },
                              { k:'company',  label:'Company',       ph:'Company name (optional)', icon:Building },
                              { k:'city',     label:'City',          ph:'e.g. Siliguri',       icon:MapPin },
                            ].map(f=>(
                              <div key={f.k}>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{f.label}</label>
                                <div className="relative">
                                  <f.icon className="absolute left-3 top-3 h-4 w-4 text-gray-300"/>
                                  <input type={f.type||'text'} value={profile[f.k]} onChange={e=>setProfile(p=>({...p,[f.k]:e.target.value}))}
                                    placeholder={f.ph}
                                    className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"/>
                                </div>
                              </div>
                            ))}
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Short Bio (optional)</label>
                              <textarea value={profile.bio} onChange={e=>setProfile(p=>({...p,bio:e.target.value}))}
                                rows={2} placeholder="A short note about yourself or your company…"
                                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 resize-none transition-colors"/>
                            </div>
                          </div>

                          {/* Read-only email */}
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <Mail className="h-4 w-4 text-gray-400 shrink-0"/>
                            <div>
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Email Address</p>
                              <p className="text-sm font-semibold text-gray-700">{user?.email}</p>
                            </div>
                            <span className="ml-auto text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">Verified</span>
                          </div>

                          {profileMsg.text && (
                            <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${profileMsg.type==='success'?'bg-green-50 text-green-700 border border-green-200':'bg-red-50 text-red-700 border border-red-200'}`}>
                              {profileMsg.type==='success' ? <CheckCircle className="h-4 w-4 shrink-0"/> : <AlertCircle className="h-4 w-4 shrink-0"/>}
                              {profileMsg.text}
                            </div>
                          )}
                          <button type="submit" disabled={saving}
                            className="w-full py-3 btn-gold rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                            {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <CheckCircle className="h-4 w-4"/>}
                            {saving ? 'Saving…' : 'Save Profile'}
                          </button>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* SECURITY */}
                  {tab === 'security' && (
                    <div>
                      <h2 className="text-xl font-extrabold text-gray-900 mb-4">Change Password</h2>
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <form onSubmit={changePassword} className="space-y-4 max-w-md">
                          {[
                            { k:'current', label:'Current Password',     ph:'Enter current password' },
                            { k:'next',    label:'New Password',          ph:'Min 8 characters' },
                            { k:'confirm', label:'Confirm New Password',  ph:'Repeat new password' },
                          ].map(f=>(
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
                        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                          <p className="text-xs text-amber-700 font-semibold">🔒 Password Requirements</p>
                          <ul className="text-xs text-amber-600 mt-1.5 space-y-0.5 list-disc list-inside">
                            <li>Minimum 8 characters</li>
                            <li>Mix of uppercase, lowercase, and numbers is recommended</li>
                            <li>Never share your password with anyone</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ADDRESSES */}
                  {tab === 'addresses' && (
                    <div>
                      <h2 className="text-xl font-extrabold text-gray-900 mb-4">Saved Addresses</h2>
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                        <MapPin className="h-12 w-12 text-gray-200 mx-auto mb-3"/>
                        <p className="font-bold text-gray-500">No saved addresses</p>
                        <p className="text-sm text-gray-400 mt-1">Addresses saved during checkout will appear here for faster future orders.</p>
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
