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
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, MessageSquare, FileText,
  Users, Newspaper, Image, Briefcase, Tag, ChevronRight, Bell, Settings,
  TrendingUp, AlertCircle, CheckCircle, Clock, BarChart2, ClipboardList, Layers, FileDown, Percent, Truck, Menu, X,
  Crown, ShieldCheck, LogIn, Lock, Loader2, KeyRound, Star,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useApi } from '@/hooks/useApi';
import { analyticsApi } from '@/lib/api';
import AuthModal from '@/components/AuthModal';

// Each item declares the Permission it needs (perm). Items with no perm are
// visible to any admin-area user. The sidebar hides items the user lacks access
// to; SUPER_ADMIN/ADMIN see everything.
const NAV_ITEMS = [
  // Overview
  { path: '/admin',           label: 'Dashboard',      icon: LayoutDashboard, exact: true, group: 'Overview' },
  // Commerce
  { path: '/admin/orders',    label: 'Orders',         icon: ShoppingCart,                group: 'Commerce', perm: 'ORDERS' },
  { path: '/admin/products',  label: 'Products',       icon: Package,                     group: 'Commerce', perm: 'PRODUCTS' },
  { path: '/admin/reviews',   label: 'Reviews',        icon: Star,                        group: 'Commerce', perm: 'PRODUCTS', hint: 'Approve customer reviews before they go live' },
  { path: '/admin/quotes',    label: 'Quote Requests', icon: FileText,                    group: 'Commerce', perm: 'QUOTES' },
  { path: '/admin/catalogue-leads', label: 'Catalogue Leads', icon: FileDown,             group: 'Commerce', perm: 'CATALOGUE_LEADS' },
  { path: '/admin/tax-rules', label: 'Tax Rules',       icon: Percent,              group: 'Commerce', perm: 'TAX_RULES' },
  { path: '/admin/delivery-zones', label: 'Delivery Zones', icon: Truck,         group: 'Commerce', perm: 'DELIVERY_ZONES' },
  { path: '/admin/rfqs',      label: 'RFQ Pipeline',   icon: ClipboardList,               group: 'Commerce', perm: 'RFQS' },
  { path: '/admin/coupons',   label: 'Coupons',        icon: Tag,                         group: 'Commerce', perm: 'COUPONS' },
  // CRM
  { path: '/admin/contacts',  label: 'Messages',       icon: MessageSquare,               group: 'CRM', perm: 'MESSAGES' },
  { path: '/admin/users',     label: 'Users',          icon: Users,                       group: 'CRM', perm: 'USERS' },
  // Content
  { path: '/admin/news',      label: 'News & Posts',   icon: Newspaper,                   group: 'Content', perm: 'NEWS' },
  { path: '/admin/projects',  label: 'Projects',       icon: Image,                       group: 'Content', perm: 'PROJECTS' },
  { path: '/admin/gallery',   label: 'Gallery',        icon: Image,                       group: 'Content', perm: 'GALLERY' },
  { path: '/admin/jobs',      label: 'Careers / Jobs', icon: Briefcase,                   group: 'Content', perm: 'JOBS' },
  { path: '/admin/tenders',   label: 'Tenders',        icon: Tag,                         group: 'Content', perm: 'TENDERS' },
  { path: '/admin/catalog',   label: 'Categories & Services', icon: Layers,               group: 'Content', perm: 'CATALOG' },
  // System
  { path: '/admin/settings',  label: 'Site Settings',  icon: Settings,                    group: 'System', perm: 'SETTINGS' },
  { path: '/admin/notifications', label: 'Notifications', icon: Bell,                       group: 'System', perm: 'NOTIFICATIONS' },
  { path: '/admin/audit',     label: 'Audit Log',      icon: BarChart2,                   group: 'System', perm: 'AUDIT' },
];

const NAV_GROUPS = ['Overview', 'Commerce', 'CRM', 'Content', 'System'];

// One-line descriptions for the dashboard's "Your workspace" launcher.
const SECTION_HINTS = {
  ORDERS: 'Track, confirm and ship customer orders', PRODUCTS: 'Add products, stock, pricing & delivery areas',
  QUOTES: 'Respond to quote requests', CATALOGUE_LEADS: 'People who downloaded the catalogue',
  TAX_RULES: 'GST rates by category', DELIVERY_ZONES: 'Pincodes, charges and ETAs',
  RFQS: 'Bulk / B2B requests for quotation', COUPONS: 'Discount codes & offers',
  MESSAGES: 'Contact-form enquiries', USERS: 'Accounts, roles & custom access',
  NEWS: 'Write and publish news & posts', PROJECTS: 'Showcase completed projects',
  GALLERY: 'Photos & media', JOBS: 'Openings and applications', TENDERS: 'Tender notices',
  CATALOG: 'Categories & services', SETTINGS: 'Contact details, SEO & homepage',
  NOTIFICATIONS: 'Email / SMS delivery settings', AUDIT: 'Who changed what, and when',
};

const ROLE_LABEL = (a) => a.isSuperAdmin ? 'Super Admin' : a.isAdmin ? 'Admin' : a.isManager ? 'Manager' : a.isEditor ? 'Editor' : 'Custom access';

// Full-screen states for the admin gate (dark, to match the console).
const GateShell = ({ children }) => (
  <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
    <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center shadow-2xl">
      <img src="/ng_white_logo.png" alt="Navgrow" className="h-9 w-auto mx-auto mb-6 object-contain" />
      {children}
    </div>
  </div>
);

const AdminSignInGate = () => {
  const [open, setOpen] = React.useState(true);
  return (
    <GateShell>
      <div className="w-12 h-12 rounded-full bg-blue-600/15 flex items-center justify-center mx-auto mb-4">
        <Lock className="h-6 w-6 text-blue-400" />
      </div>
      <h1 className="text-white text-xl font-extrabold mb-1">Admin Console</h1>
      <p className="text-gray-400 text-sm mb-6">Sign in with your staff account to continue.</p>
      <button onClick={() => setOpen(true)}
        className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold">
        <LogIn className="h-4 w-4" /> Sign in
      </button>
      <Link to="/" className="block mt-4 text-xs text-gray-500 hover:text-gray-300">← Back to website</Link>
      {/* staffRedirect=false: we're already on /admin — the gate re-renders once signed in. */}
      <AuthModal open={open} onClose={() => setOpen(false)} staffRedirect={false} />
    </GateShell>
  );
};

const AdminNoAccessGate = ({ user, onLogout }) => (
  <GateShell>
    <div className="w-12 h-12 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto mb-4">
      <ShieldCheck className="h-6 w-6 text-amber-400" />
    </div>
    <h1 className="text-white text-xl font-extrabold mb-1">No admin access on this account</h1>
    <p className="text-gray-400 text-sm mb-2">
      You're signed in as <span className="text-gray-200 font-semibold">{user?.email}</span>
      {user?.role ? <> (role: <span className="text-gray-200 font-semibold">{user.role}</span>)</> : null}.
    </p>
    <p className="text-gray-500 text-xs mb-6">
      If a Super Admin has just given you access, sign out and sign in again to refresh your session.
    </p>
    <div className="flex gap-2">
      <Link to="/account" className="flex-1 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-200 text-sm font-bold hover:bg-gray-700">My account</Link>
      <button onClick={onLogout} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold">Sign out</button>
    </div>
  </GateShell>
);

export const AdminLayout = () => {
  const { isSuperAdmin, isAdmin, isManager, isEditor, can, canAccessAdmin, user,
          isLoggedIn, sessionChecked, logout } = useAuth();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  // Close the mobile drawer whenever the route changes (a nav item was tapped).
  React.useEffect(() => { setMobileNavOpen(false); }, [location.pathname]);

  // Reachable if a known admin role (incl. SUPER_ADMIN) OR any custom permission.
  // Instead of silently bouncing to the home page (which looked like "normal
  // access"), explain what's going on:
  if (!canAccessAdmin) {
    if (!isLoggedIn) return <AdminSignInGate />;
    // Cached session still being re-checked with the server (e.g. the account
    // was just promoted to Super Admin) — wait rather than redirect.
    if (!sessionChecked) {
      return (
        <GateShell>
          <Loader2 className="h-7 w-7 text-blue-400 animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Checking your access…</p>
        </GateShell>
      );
    }
    return <AdminNoAccessGate user={user} onLogout={logout} />;
  }

  // Only show nav items this user can access (Dashboard/no-perm always shown).
  const visibleItems = NAV_ITEMS.filter(i => !i.perm || can(i.perm));

  const SidebarContent = (
    <>
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
          const groupItems = visibleItems.filter(i => i.group === group);
          if (groupItems.length === 0) return null;
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
            <p className={`text-[10px] flex items-center gap-1 ${isSuperAdmin ? 'text-amber-400 font-bold' : 'text-gray-500'}`}>
              {isSuperAdmin && <Crown className="h-3 w-3" />}
              {ROLE_LABEL({ isSuperAdmin, isAdmin, isManager, isEditor })}
            </p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Desktop sidebar — fixed column, hidden on small screens */}
      <aside className="hidden lg:flex w-64 bg-gray-900 text-gray-300 flex-col shrink-0">
        {SidebarContent}
      </aside>

      {/* Mobile drawer + backdrop */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileNavOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[80vw] bg-gray-900 text-gray-300 flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
            <button onClick={() => setMobileNavOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 z-10">
              <X className="h-5 w-5" />
            </button>
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar with hamburger — only on small screens */}
        <header className="lg:hidden sticky top-0 z-40 flex items-center gap-3 px-4 h-14 bg-gray-900 border-b border-gray-800">
          <button onClick={() => setMobileNavOpen(true)}
            className="p-2 -ml-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <img loading="lazy" decoding="async" src="/ng_white_logo.png" alt="Navgrow" className="h-7 w-auto object-contain" />
          <span className="text-xs text-gray-500 ml-auto">Admin</span>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
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
// Permission-aware: commerce analytics load only for users who can see them
// (Super Admin / Admin / Manager / ORDERS grant). Everyone else — editors and
// custom-access staff — gets a launcher of exactly the sections they can open,
// instead of a wall of empty "—" cards and failed requests.
const AdminHome = () => {
  const auth = useAuth();
  const { user, can, isSuperAdmin, isAdmin, isManager } = auth;
  const canSeeCommerce = isSuperAdmin || isAdmin || isManager || can('ORDERS');
  const none = () => Promise.resolve({ data: null });

  const { data: stats, loading } = useApi(canSeeCommerce ? analyticsApi.dashboard : none, [canSeeCommerce]);
  const { data: recent }         = useApi(canSeeCommerce ? analyticsApi.recentOrders : none, [canSeeCommerce]);
  const { data: funnelRaw }      = useApi(canSeeCommerce ? () => analyticsApi.funnel(30) : none, [canSeeCommerce]);
  // Defensive shapes: one odd API response must never take the whole dashboard down.
  const arr = (v) => (Array.isArray(v) ? v : (Array.isArray(v?.content) ? v.content : []));
  const recentList = arr(recent);
  const funnel = funnelRaw && typeof funnelRaw === 'object' ? {
    ...funnelRaw,
    shopFunnel: arr(funnelRaw.shopFunnel), rfqFunnel: arr(funnelRaw.rfqFunnel), topProducts: arr(funnelRaw.topProducts),
  } : null;

  const firstName = (user?.fullName || user?.email || '').split(/[\s@]/)[0];
  const sections  = NAV_ITEMS.filter(i => i.perm && can(i.perm));

  const kpis = [
    { label: 'Total Orders',          value: stats?.totalOrders,           icon: ShoppingCart, color: 'bg-blue-600',   sub: `${stats?.pendingOrders || 0} pending`, to: '/admin/orders', perm: 'ORDERS' },
    { label: 'Revenue (30 days)',     value: stats ? `₹${Number(stats.revenueLastMonth || 0).toLocaleString('en-IN')}` : null, icon: TrendingUp, color: 'bg-green-600', sub: 'paid orders', to: '/admin/orders', perm: 'ORDERS' },
    { label: 'Unread Messages',       value: stats?.unreadMessages,        icon: MessageSquare, color: 'bg-amber-500', sub: 'need response', to: '/admin/contacts', perm: 'MESSAGES' },
    { label: 'New Quote Requests',    value: stats?.newQuotes,             icon: FileText,  color: 'bg-violet-600',   sub: 'awaiting review', to: '/admin/quotes', perm: 'QUOTES' },
    { label: 'Newsletter Subscribers',value: stats?.newsletterSubscribers, icon: Users,     color: 'bg-cyan-600',     sub: 'active' },
    { label: 'New Applications',      value: stats?.newApplications,       icon: Briefcase, color: 'bg-rose-600',     sub: 'job applicants', to: '/admin/jobs', perm: 'JOBS' },
    { label: 'Catalogue Leads',       value: stats?.totalCatalogueLeads,   icon: FileDown,  color: 'bg-amber-600',    sub: `${stats?.newCatalogueLeads || 0} new`, to: '/admin/catalogue-leads', perm: 'CATALOGUE_LEADS' },
  ];

  const quickActions = [
    { to: '/admin/products', label: 'Add Product',     icon: Package,       color: 'bg-blue-50 text-blue-600',     perm: 'PRODUCTS' },
    { to: '/admin/news',     label: 'Write News',      icon: Newspaper,     color: 'bg-amber-50 text-amber-600',   perm: 'NEWS' },
    { to: '/admin/rfqs',     label: 'RFQ Pipeline',    icon: ClipboardList, color: 'bg-indigo-50 text-indigo-600', perm: 'RFQS' },
    { to: '/admin/contacts', label: 'View Messages',   icon: MessageSquare, color: 'bg-green-50 text-green-600',   perm: 'MESSAGES' },
    { to: '/admin/quotes',   label: 'View Quotes',     icon: FileText,      color: 'bg-rose-50 text-rose-600',     perm: 'QUOTES' },
    { to: '/admin/catalogue-leads', label: 'Catalogue Leads', icon: FileDown, color: 'bg-amber-50 text-amber-600', perm: 'CATALOGUE_LEADS' },
    { to: '/admin/jobs',     label: 'Manage Jobs',     icon: Briefcase,     color: 'bg-cyan-50 text-cyan-600',     perm: 'JOBS' },
    { to: '/admin/tenders',  label: 'Tenders',         icon: Tag,           color: 'bg-violet-50 text-violet-600', perm: 'TENDERS' },
    { to: '/admin/users',    label: 'Team & Access',   icon: KeyRound,      color: 'bg-yellow-50 text-yellow-700', perm: 'USERS' },
  ].filter(a => can(a.perm));

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6 sm:mb-7">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mb-0.5 truncate">
            {firstName ? `Welcome back, ${firstName}` : 'Dashboard'}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${isSuperAdmin ? 'bg-amber-500/15 text-amber-300' : 'bg-blue-500/15 text-blue-300'}`}>
              {isSuperAdmin ? <Crown className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
              {ROLE_LABEL(auth)}
            </span>
            <p className="text-gray-400 text-xs sm:text-sm truncate">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
        <div className="flex gap-2 sm:gap-3 shrink-0">
          {can('MESSAGES') && (
            <Link to="/admin/contacts" aria-label="Messages" className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-800 text-gray-300 rounded-xl text-sm hover:bg-gray-700 transition-colors">
              <Bell className="h-4 w-4" />
              {stats?.unreadMessages ? <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{stats.unreadMessages}</span> : null}
            </Link>
          )}
          <Link to="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-500 transition-colors whitespace-nowrap">
            View Site
          </Link>
        </div>
      </div>

      {/* Super Admin: access management shortcut */}
      {isSuperAdmin && (
        <Link to="/admin/users"
          className="flex items-center gap-4 mb-6 p-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-transparent hover:border-amber-400/60 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0"><Crown className="h-5 w-5 text-amber-300" /></div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm">Super Admin controls</p>
            <p className="text-gray-400 text-xs">Create staff accounts, set roles and grant custom access to specific sections.</p>
          </div>
          <ChevronRight className="h-4 w-4 text-amber-300 shrink-0" />
        </Link>
      )}

      {canSeeCommerce && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-7">
            {kpis.map(({ to, perm, ...kpi }) => (to && can(perm))
              ? <Link key={kpi.label} to={to} className="block hover:-translate-y-0.5 transition-transform"><KpiCard {...kpi} loading={loading} /></Link>
              : <KpiCard key={kpi.label} {...kpi} loading={loading} />)}
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
        </>
      )}

      <div className={`grid grid-cols-1 ${canSeeCommerce ? 'lg:grid-cols-2' : ''} gap-5 mb-5`}>
        {/* Recent orders */}
        {canSeeCommerce && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Recent Orders</h3>
              {can('ORDERS') && <Link to="/admin/orders" className="text-xs text-blue-600 font-semibold hover:underline">View All →</Link>}
            </div>
            {loading ? (
              <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-xl" />)}</div>
            ) : recentList.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">No orders in the last 7 days.</p>
            ) : recentList.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-gray-900">#{order.orderNumber}</p>
                  <p className="text-xs text-gray-400">{order.customerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">₹{Number(order.grandTotal || 0).toLocaleString('en-IN')}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                    order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-700' :
                    order.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>{order.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick actions — only what this user can open */}
        {quickActions.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
            <div className={`grid grid-cols-2 ${canSeeCommerce ? '' : 'sm:grid-cols-3 lg:grid-cols-4'} gap-3`}>
              {quickActions.map(({ to, label, icon: Icon, color }) => (
                <Link key={to} to={to}
                  className={`flex items-center gap-3 p-3 rounded-xl ${color} text-sm font-semibold hover:opacity-80 transition-opacity`}>
                  <Icon className="h-4 w-4 shrink-0" />{label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Your workspace — every section this account can open */}
      {!canSeeCommerce && (
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Your workspace</h3>
          {sections.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center text-gray-400 text-sm">
              No sections have been assigned to your account yet. Ask a Super Admin to grant access.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sections.map(({ path, label, icon: Icon, perm, hint }) => (
                <Link key={path} to={path}
                  className="group flex items-start gap-3 p-4 rounded-2xl bg-gray-900 border border-gray-800 hover:border-blue-500/60 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-blue-600/15 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-bold flex items-center gap-1">{label}
                      <ChevronRight className="h-3.5 w-3.5 text-gray-600 group-hover:text-blue-400 transition-colors" /></p>
                    <p className="text-gray-500 text-xs mt-0.5">{hint || SECTION_HINTS[perm] || ''}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminHome;
