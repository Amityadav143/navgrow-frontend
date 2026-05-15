import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Package, Heart, Settings, LogOut, Edit2, CheckCircle, AlertCircle } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ordersApi, userApi } from '@/lib/api';
import PageHero from '@/components/PageHero';
import { useApi } from '@/hooks/useApi';
import useSeo from '@/hooks/useSeo';

const StatusBadge = ({ status }) => {
  const colors = {
    PENDING: 'bg-yellow-100 text-yellow-700', CONFIRMED: 'bg-blue-100 text-blue-700',
    PROCESSING: 'bg-indigo-100 text-indigo-700', SHIPPED: 'bg-cyan-100 text-cyan-700',
    DELIVERED: 'bg-green-100 text-green-700', CANCELLED: 'bg-red-100 text-red-700',
    REFUNDED: 'bg-gray-100 text-gray-700',
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${colors[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
};

const AccountPage = () => {
  useSeo({ title: 'My Account', path: '/account' });
  const { user, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('orders');
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState({ fullName: '', phone: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  const { data: orders, loading: ordersLoading } = useApi(
    () => ordersApi.myOrders({ page: 0, size: 20 }),
    [isLoggedIn],
    { immediate: isLoggedIn }
  );

  useEffect(() => {
    if (!isLoggedIn) return;
    userApi.profile().then(r => {
      setProfile({ fullName: r.data.fullName || '', phone: r.data.phone || '' });
    }).catch(() => {});
  }, [isLoggedIn]);

  if (!isLoggedIn) return <Navigate to="/" replace state={{ authRequired: true }} />;

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await userApi.updateProfile(profile);
      setProfileMsg('Profile updated successfully!');
      setEditing(false);
    } catch (err) {
      setProfileMsg(err.response?.data?.message || 'Update failed.');
    } finally {
      setSavingProfile(false);
      setTimeout(() => setProfileMsg(''), 3000);
    }
  };

  const orderList = orders?.content || orders || [];

  return (
    <>
      <PageHero chip={<><User className="h-4 w-4" /> Account</>}
        title={<>My <span className="gradient-text">Account</span></>}
        subtitle={`Welcome back! Manage your orders, wishlist, and profile.`}
        breadcrumbs={[{ label: 'My Account' }]} />

      <section className="py-14 bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="brand-gradient p-5 text-center">
                  <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-2">
                    {user?.email?.[0]?.toUpperCase()}
                  </div>
                  <p className="text-white font-bold text-sm">{profile.fullName || user?.email}</p>
                  <p className="text-blue-200 text-xs">{user?.email}</p>
                </div>
                <nav className="p-2">
                  {[
                    { id: 'orders',  icon: Package, label: 'My Orders' },
                    { id: 'profile', icon: Settings, label: 'Profile' },
                  ].map(({ id, icon: Icon, label }) => (
                    <button key={id} onClick={() => setTab(id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${tab === id ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}>
                      <Icon className="h-4 w-4" />{label}
                    </button>
                  ))}
                  <Link to="/wishlist" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                    <Heart className="h-4 w-4" />Wishlist
                  </Link>
                  <button onClick={() => { logout(); navigate('/'); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors mt-1 border-t border-gray-100">
                    <LogOut className="h-4 w-4" />Sign Out
                  </button>
                </nav>
              </div>
            </div>

            {/* Main */}
            <div className="lg:col-span-3">
              {/* Orders Tab */}
              {tab === 'orders' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">My Orders</h2>
                  {ordersLoading ? (
                    <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}</div>
                  ) : orderList.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                      <Package className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-400 font-medium">No orders yet</p>
                      <Link to="/shop" className="mt-4 inline-block px-5 py-2.5 btn-gold rounded-xl text-sm font-semibold">Browse Shop</Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orderList.map((order) => (
                        <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                            <div>
                              <p className="font-bold text-gray-900">#{order.orderNumber}</p>
                              <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <StatusBadge status={order.status} />
                              <span className="font-bold text-gray-900">₹{order.grandTotal?.toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-2">
                            {order.items?.length || 0} item(s)
                            {order.trackingNumber && <span className="ml-2 text-blue-600 font-medium">Track: {order.trackingNumber}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Profile Tab */}
              {tab === 'profile' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Profile</h2>
                    {!editing && <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-sm text-blue-600 font-semibold hover:underline"><Edit2 className="h-4 w-4" />Edit</button>}
                  </div>

                  {profileMsg && (
                    <div className={`flex items-center gap-2 p-3 rounded-xl mb-4 text-sm ${profileMsg.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      {profileMsg.includes('success') ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                      {profileMsg}
                    </div>
                  )}

                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    {editing ? (
                      <form onSubmit={saveProfile} className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                          <input value={profile.fullName} onChange={e => setProfile(p => ({ ...p, fullName: e.target.value }))}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" placeholder="Your name" />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email <span className="text-gray-400">(cannot change)</span></label>
                          <input value={user?.email} disabled className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone</label>
                          <input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" placeholder="+91 xxxxx xxxxx" />
                        </div>
                        <div className="flex gap-3">
                          <button type="submit" disabled={savingProfile} className="px-6 py-2.5 btn-gold rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-60">
                            {savingProfile ? 'Saving…' : 'Save Changes'}
                          </button>
                          <button type="button" onClick={() => setEditing(false)} className="px-6 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-semibold text-sm hover:border-gray-300">
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="space-y-4">
                        {[['Name', profile.fullName || '—'],['Email', user?.email],['Phone', profile.phone || '—']].map(([k, v]) => (
                          <div key={k} className="flex items-center py-3 border-b border-gray-50 last:border-0">
                            <span className="w-24 text-sm text-gray-400 font-medium">{k}</span>
                            <span className="text-sm font-semibold text-gray-900">{v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default AccountPage;
