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
import { motion } from 'framer-motion';
import { Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, MessageSquare, FileText,
  Users, Newspaper, Image, Briefcase, Tag, ChevronRight, Bell, Settings,
  TrendingUp, AlertCircle, CheckCircle, Clock, BarChart2, ClipboardList } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useApi } from '@/hooks/useApi';
import { analyticsApi } from '@/lib/api';

const NAV_ITEMS = [
  // Overview
  { path: '/admin',           label: 'Dashboard',      icon: LayoutDashboard, exact: true, group: 'Overview' },
  // Commerce
  { path: '/admin/orders',    label: 'Orders',         icon: ShoppingCart,                group: 'Commerce' },
  { path: '/admin/products',  label: 'Products',       icon: Package,                     group: 'Commerce' },
  { path: '/admin/quotes',    label: 'Quote Requests', icon: FileText,                    group: 'Commerce' },
  { path: '/admin/rfqs',      label: 'RFQ Pipeline',   icon: ClipboardList,               group: 'Commerce' },
  { path: '/admin/coupons',   label: 'Coupons',        icon: Tag,                         group: 'Commerce' },
  // CRM
  { path: '/admin/contacts',  label: 'Messages',       icon: MessageSquare,               group: 'CRM' },
  { path: '/admin/users',     label: 'Users',          icon: Users,                       group: 'CRM' },
  // Content
  { path: '/admin/news',      label: 'News & Posts',   icon: Newspaper,                   group: 'Content' },
  { path: '/admin/projects',  label: 'Projects',       icon: Image,                       group: 'Content' },
  { path: '/admin/gallery',   label: 'Gallery',        icon: Image,                       group: 'Content' },
  { path: '/admin/jobs',      label: 'Careers / Jobs', icon: Briefcase,                   group: 'Content' },
  { path: '/admin/tenders',   label: 'Tenders',        icon: Tag,                         group: 'Content' },
  // System
  { path: '/admin/settings',  label: 'Site Settings',  icon: Settings,                    group: 'System' },
  { path: '/admin/audit',     label: 'Audit Log',      icon: BarChart2,                   group: 'System' },
];

const NAV_GROUPS = ['Overview', 'Commerce', 'CRM', 'Content', 'System'];

export const AdminLayout = () => {
  const { isAdmin, isManager, isEditor, user } = useAuth();
  const location = useLocation();

  if (!isAdmin && !isManager && !isEditor) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-gray-300 flex flex-col shrink-0">
        {/* Logo */}
        <div className="p-5 border-b border-gray-800">
          <Link to="/">
            <img loading="lazy" decoding="async" src="/ng_white_logo.png" alt="Navgrow" className="h-10 w-auto object-contain" />
          </Link>
          <p className="text-xs text-gray-500 mt-2">Admin Console</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 overflow-y-auto">
          {NAV_GROUPS.map(group => {
            const groupItems = NAV_ITEMS.filter(i => i.group === group);
            return (
              <div key={group} className="mb-3">
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3 mb-1 mt-2">{group}</p>
                {groupItems.map(({ path, label, icon: Icon, exact }) => {
                  const active = exact ? location.pathname === path : location.pathname.startsWith(path) && path !== '/admin';
                  const isExactActive = exact && location.pathname === '/admin';
                  const isActive = active || isExactActive;
                  return (
                    <Link key={path} to={path}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors mb-0.5 ${
                        isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                      }`}>
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-300 truncate">{user?.email}</p>
              <p className="text-[10px] text-gray-500">{isAdmin ? 'Admin' : 'Manager'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

// ── KPI Card ──────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, icon: Icon, color, sub, loading }) => (
  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
    <div className="flex items-center justify-between mb-3">
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
    </div>
    {loading ? (
      <div className="h-8 w-20 bg-gray-200 animate-pulse rounded-lg" />
    ) : (
      <p className="text-3xl font-extrabold text-gray-900">{value ?? '—'}</p>
    )}
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

// ── Dashboard Home ────────────────────────────────────────────────────────────
const AdminHome = () => {
  const { data: stats, loading } = useApi(analyticsApi.dashboard, []);
  const { data: recent } = useApi(analyticsApi.recentOrders, []);
  const { data: funnel } = useApi(() => analyticsApi.funnel(30), []);

  const kpis = [
    { label: 'Total Orders',         value: stats?.totalOrders,          icon: ShoppingCart, color: 'bg-blue-600', sub: `${stats?.pendingOrders || 0} pending` },
    { label: 'Revenue (30 days)',     value: stats ? `₹${Number(stats.revenueLastMonth).toLocaleString('en-IN')}` : null, icon: TrendingUp, color: 'bg-green-600', sub: 'paid orders' },
    { label: 'Unread Messages',       value: stats?.unreadMessages,       icon: MessageSquare, color: 'bg-amber-500', sub: 'need response' },
    { label: 'New Quote Requests',    value: stats?.newQuotes,            icon: FileText, color: 'bg-violet-600', sub: 'awaiting review' },
    { label: 'Newsletter Subscribers',value: stats?.newsletterSubscribers,icon: Users,  color: 'bg-cyan-600', sub: 'active' },
    { label: 'New Applications',      value: stats?.newApplications,      icon: Briefcase, color: 'bg-rose-600', sub: 'job applicants' },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-extrabold text-white mb-0.5">Dashboard</h1>
          <p className="text-gray-400 text-sm">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex gap-3">
          <Link to="/admin/contacts" className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 rounded-xl text-sm hover:bg-gray-700 transition-colors">
            <Bell className="h-4 w-4" />
            {stats?.unreadMessages ? <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{stats.unreadMessages}</span> : null}
          </Link>
          <Link to="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-500 transition-colors">
            View Site
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-7">
        {kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} loading={loading} />)}
      </div>

      {/* Conversion funnel (last 30 days) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Conversion Funnel <span className="text-xs font-normal text-gray-400">· last 30 days</span></h3>
          {funnel?.conversionRate != null && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700">
              {funnel.conversionRate}% view → buy
            </span>
          )}
        </div>
        {!funnel ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[...Array(4)].map((_,i)=><div key={i} className="h-20 bg-gray-100 animate-pulse rounded-xl"/>)}</div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              {(funnel.shopFunnel || []).map((s, i) => {
                const labels = { product_view:'Product Views', add_to_cart:'Added to Cart', checkout_start:'Checkout Started', order_placed:'Orders Placed' };
                const colors = ['bg-blue-50 text-blue-700','bg-violet-50 text-violet-700','bg-amber-50 text-amber-700','bg-green-50 text-green-700'];
                return (
                  <div key={s.stage} className={`rounded-xl p-4 ${colors[i] || 'bg-gray-50 text-gray-700'}`}>
                    <p className="text-2xl font-extrabold">{Number(s.sessions||0).toLocaleString('en-IN')}</p>
                    <p className="text-xs font-semibold opacity-80 mt-0.5">{labels[s.stage] || s.stage}</p>
                    {s.dropFromPrev != null && s.dropFromPrev > 0 && (
                      <p className="text-[11px] mt-1 opacity-70">▼ {s.dropFromPrev}% drop-off</p>
                    )}
                  </div>
                );
              })}
            </div>
            {/* RFQ mini-funnel + top products */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">RFQ Funnel</p>
                <div className="flex items-center gap-2">
                  {(funnel.rfqFunnel || []).map((s, i) => {
                    const labels = { rfq_start:'Started', rfq_submit:'Submitted', rfq_accept:'Accepted' };
                    return (
                      <React.Fragment key={s.stage}>
                        <div className="flex-1 text-center rounded-xl bg-gray-50 py-3">
                          <p className="text-lg font-extrabold text-gray-900">{Number(s.sessions||0)}</p>
                          <p className="text-[11px] text-gray-500 font-semibold">{labels[s.stage] || s.stage}</p>
                        </div>
                        {i < (funnel.rfqFunnel.length - 1) && <span className="text-gray-300 font-bold">→</span>}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Most Viewed Products</p>
                {(funnel.topProducts || []).length === 0 ? (
                  <p className="text-sm text-gray-400">No product views recorded yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {(funnel.topProducts || []).slice(0,5).map((p) => (
                      <div key={p.label} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 truncate pr-2 font-mono text-xs">{p.label}</span>
                        <span className="font-bold text-gray-900 shrink-0">{p.views}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Recent orders */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Recent Orders</h3>
            <Link to="/admin/orders" className="text-xs text-blue-600 font-semibold hover:underline">View All →</Link>
          </div>
          {loading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-xl" />)}</div>
          ) : (recent || []).slice(0, 5).map((order) => (
            <div key={order.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-semibold text-gray-900">#{order.orderNumber}</p>
                <p className="text-xs text-gray-400">{order.customerName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900">₹{order.grandTotal?.toLocaleString('en-IN')}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                  order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                }`}>{order.status}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { to: '/admin/products', label: 'Add Product',  icon: Package,   color: 'bg-blue-50 text-blue-600' },
              { to: '/admin/news',     label: 'Write News',   icon: Newspaper, color: 'bg-amber-50 text-amber-600' },
              { to: '/admin/tenders',  label: 'Tenders',      icon: Tag,       color: 'bg-violet-50 text-violet-600' },
              { to: '/admin/contacts', label: 'View Messages',icon: MessageSquare, color: 'bg-green-50 text-green-600' },
              { to: '/admin/quotes',   label: 'View Quotes',  icon: FileText,  color: 'bg-rose-50 text-rose-600' },
              { to: '/admin/jobs',     label: 'Manage Jobs',  icon: Briefcase, color: 'bg-cyan-50 text-cyan-600' },
            ].map(({ to, label, icon: Icon, color }) => (
              <Link key={to} to={to}
                className={`flex items-center gap-3 p-3 rounded-xl ${color} text-sm font-semibold hover:opacity-80 transition-opacity`}>
                <Icon className="h-4 w-4 shrink-0" />{label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHome;
