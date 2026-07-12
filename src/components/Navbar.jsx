/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 · navgrow.org · info@navgrow.org
 * Unauthorised reproduction, modification or distribution is strictly prohibited.
 */
import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronDown, Phone, ShoppingCart, Search, Heart, User, LogOut, Settings, Package, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { useRfq } from '@/context/RfqContext';
import { useAuth } from '@/context/AuthContext';
import AuthModal from '@/components/AuthModal';

const NAV = [
  { name: 'Home',       path: '/' },
  { name: 'About',      path: '/about' },
  {
    name: 'Services', path: '/services',
    /* Grouped: rendered as a two-column mega dropdown on desktop; flat list on mobile. */
    sub: [
      { name: 'Railway Infrastructure',   path: '/services/railway-infrastructure',  group: 'Engineering' },
      { name: 'Industrial Engineering',   path: '/services/industrial-engineering',  group: 'Engineering' },
      { name: 'Civil & Construction',     path: '/services/civil-construction',      group: 'Engineering' },
      { name: 'Government Contracts',     path: '/services/government-contracts',    group: 'Engineering' },
      { name: 'Maintenance & AMC',        path: '/services/maintenance',             group: 'Engineering' },
      { name: 'Rainwater Harvesting',     path: '/services/rainwater-harvesting',    group: 'Sustainability' },
      { name: 'Solar Energy',             path: '/services/solar-solutions',         group: 'Sustainability' },
      { name: 'Wastewater & Recycling',   path: '/services/wastewater-treatment',    group: 'Sustainability' },
      { name: 'Energy Efficiency',        path: '/services/energy-efficiency',       group: 'Sustainability' },
      { name: 'Green Building Consulting',path: '/services/green-building',          group: 'Sustainability' },
    ],
  },
  { name: 'Projects',    path: '/projects' },
  { name: 'Shop',        path: '/shop', badge: 'New' },
  { name: 'Calculator',  path: '/quote-calculator' },
  { name: 'Contact',     path: '/contact' },
];

const WishlistBtn = ({ dark }) => {
  const { wishlist } = useCart();
  return (
    <Link to="/wishlist" aria-label="Wishlist"
      className={cn('relative p-2.5 rounded-xl transition-colors', dark ? 'text-white hover:bg-white/15' : 'text-gray-700 hover:bg-gray-100')}>
      <Heart className="h-5 w-5" />
      {wishlist.length > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
          {wishlist.length}
        </span>
      )}
    </Link>
  );
};

const UserMenu = ({ dark }) => {
  const { user, isLoggedIn, isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const navigate = useNavigate();

  if (!isLoggedIn) return (
    <>
      <button
        onClick={() => setAuthOpen(true)}
        className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors',
          dark ? 'text-white hover:bg-white/15' : 'text-gray-700 hover:bg-gray-100')}
      >
        <User className="h-4 w-4" /> Sign In
      </button>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );

  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button aria-label="Expand" className={cn('flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-colors',
        dark ? 'text-white hover:bg-white/15' : 'text-gray-700 hover:bg-gray-100')}>
        <div className="w-7 h-7 rounded-full brand-gradient flex items-center justify-center text-white text-xs font-bold">
          {user?.email?.[0]?.toUpperCase() || 'U'}
        </div>
        <ChevronDown className="h-3 w-3" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }} transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.email}</p>
              <p className="text-xs text-gray-400">{isAdmin ? 'Administrator' : 'Customer'}</p>
            </div>
            {[
              { icon: User,    label: 'My Profile',     path: '/account' },
              { icon: Package, label: 'My Orders',      path: '/account/orders' },
              { icon: Heart,   label: 'Wishlist',       path: '/wishlist' },
            ].map(({ icon: Icon, label, path }) => (
              <Link key={path} to={path} onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                <Icon className="h-4 w-4" /> {label}
              </Link>
            ))}
            {isAdmin && (
              <Link to="/admin" onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 transition-colors border-t border-gray-100 mt-1">
                <Settings className="h-4 w-4" /> Admin Dashboard
              </Link>
            )}
            <button onClick={() => { logout(); setOpen(false); navigate('/'); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors border-t border-gray-100 mt-1">
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Navbar = ({ scrolled, onSearchOpen }) => {
  // useLocation MUST be declared before any useEffect that uses location
  const location = useLocation();
  const [mobileOpen, setMobileOpen]     = useState(false);

  // Close mobile menu whenever route changes
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [authOpen, setAuthOpen]         = useState(false);
  const { totalItems, setCartOpen } = useCart();
  const { totalItems: rfqCount, setDrawerOpen: setRfqOpen } = useRfq();
  const onDark = false;
  // Promo note shown at top

  return (
    <>
      <div className={cn('transition-all duration-300', scrolled ? 'bg-white/95 backdrop-blur-xl shadow-lg shadow-gray-900/8' : 'bg-transparent')}>
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-[70px]">

            <Link to="/" onClick={() => setMobileOpen(false)} className="shrink-0 flex items-center">
              <img loading="lazy" decoding="async" key={onDark ? 'white' : 'color'} src={onDark ? '/ng_white_logo.png' : '/ng_logo.png'}
                alt="Navgrow Engineering Service" className="h-16 md:h-24 w-auto object-contain" style={{ maxWidth: 210 }} />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-0.5">
              {NAV.map((link) =>
                link.sub ? (
                  <div key={link.path} className="relative" onMouseEnter={() => setServicesOpen(true)} onMouseLeave={() => setServicesOpen(false)}>
                    <button aria-label="Expand" className={cn('flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold transition-all',
                      location.pathname.startsWith('/services')
                        ? onDark ? 'text-white bg-white/15' : 'text-blue-700 bg-blue-50 border-b-2 border-amber-400'
                        : onDark ? 'text-white/85 hover:text-white hover:bg-white/15' : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50')}>
                      {link.name}
                      <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', servicesOpen && 'rotate-180')} />
                    </button>
                    <AnimatePresence>
                      {servicesOpen && (
                        <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }} transition={{ duration: 0.15 }}
                          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[560px] bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-50">
                          <div className="grid grid-cols-2 gap-4">
                            {['Engineering', 'Sustainability'].map((grp) => (
                              <div key={grp}>
                                <p className={cn('px-3 pb-2 text-[11px] font-extrabold uppercase tracking-wider',
                                  grp === 'Engineering' ? 'text-blue-700' : 'text-emerald-700')}>
                                  {grp === 'Engineering' ? 'Engineering Services' : 'Sustainability Solutions'}
                                </p>
                                {link.sub.filter((s) => s.group === grp).map((s) => (
                                  <Link key={s.path} to={s.path} onClick={() => setServicesOpen(false)}
                                    className={cn('flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-700 transition-colors',
                                      grp === 'Engineering' ? 'hover:text-blue-700 hover:bg-blue-50' : 'hover:text-emerald-700 hover:bg-emerald-50')}>
                                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0',
                                      grp === 'Engineering' ? 'bg-blue-500' : 'bg-emerald-500')} />
                                    {s.name}
                                  </Link>
                                ))}
                              </div>
                            ))}
                          </div>
                          <Link to="/services" onClick={() => setServicesOpen(false)}
                            className="mt-3 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-blue-50 text-sm font-bold text-gray-800 hover:text-blue-700 transition-colors border-t border-gray-100">
                            View all 10 services →
                          </Link>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <NavLink key={link.path} to={link.path}
                    className={({ isActive }) => cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all',
                      isActive ? onDark ? 'text-white bg-white/15' : 'text-blue-700 bg-blue-50 border-b-2 border-amber-400'
                               : onDark ? 'text-white/85 hover:text-white hover:bg-white/15' : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50')}>
                    {link.name}
                    {link.badge && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-600 text-white leading-none">{link.badge}</span>}
                  </NavLink>
                )
              )}
            </nav>

            {/* Desktop right */}
            <div className="hidden lg:flex items-center gap-2">
              <a href="tel:+918927070972" className={cn('flex items-center gap-1.5 text-sm font-semibold transition-colors', onDark ? 'text-white/80 hover:text-white' : 'text-gray-600 hover:text-blue-600')}>
                <Phone className="h-3.5 w-3.5" /> +91 89270 70972
              </a>

              {/* Search */}
              <button onClick={onSearchOpen} aria-label="Search" title="Ctrl+K"
                className={cn('p-2.5 rounded-xl transition-colors', onDark ? 'text-white hover:bg-white/15' : 'text-gray-700 hover:bg-gray-100')}>
                <Search className="h-5 w-5" />
              </button>

              <WishlistBtn dark={onDark} />

              {/* RFQ — Request for Quote basket */}
              <button onClick={() => setRfqOpen(true)} aria-label="Request for Quote"
                className={cn('relative p-2.5 rounded-xl transition-colors', onDark ? 'text-white hover:bg-white/15' : 'text-gray-700 hover:bg-gray-100')}>
                <FileText className="h-5 w-5" />
                {rfqCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                    {rfqCount > 9 ? '9+' : rfqCount}
                  </span>
                )}
              </button>

              {/* Cart */}
              <button onClick={() => setCartOpen(true)} aria-label="Cart"
                className={cn('relative p-2.5 rounded-xl transition-colors', onDark ? 'text-white hover:bg-white/15' : 'text-gray-700 hover:bg-gray-100')}>
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center px-1">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </button>

              <UserMenu dark={onDark} />

              <Link to="/contact" className="px-5 py-2.5 rounded-xl text-sm font-bold text-white btn-gold shadow-md">
                Get a Quote
              </Link>
            </div>

            {/* Mobile right */}
            <div className="lg:hidden flex items-center gap-1">
              <button onClick={() => setRfqOpen(true)} aria-label="Request for Quote"
                className={cn('relative p-2 rounded-lg', onDark ? 'text-white' : 'text-gray-700')}>
                <FileText className="h-5 w-5" />
                {rfqCount > 0 && <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">{rfqCount}</span>}
              </button>
              <button onClick={() => setCartOpen(true)}
                className={cn('relative p-2 rounded-lg', onDark ? 'text-white' : 'text-gray-700')}>
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">{totalItems}</span>}
              </button>
              <button onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu"
                className={cn('p-2 rounded-xl', onDark ? 'text-white hover:bg-white/15' : 'text-gray-700 hover:bg-gray-100')}>
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }}
              className="lg:hidden bg-white border-t border-gray-100 shadow-2xl overflow-hidden">
              <div className="px-4 py-5 flex flex-col gap-1 overflow-y-auto"
                style={{ maxHeight: 'calc(100dvh - 140px)', paddingBottom: 'max(80px, env(safe-area-inset-bottom, 80px))' }}>
                {NAV.map((link) => (
                  <div key={link.path}>
                    <NavLink to={link.path} onClick={() => setMobileOpen(false)}
                      className={({ isActive }) => cn('flex items-center gap-2 px-4 py-3 rounded-xl font-semibold transition-colors', isActive ? 'text-blue-700 bg-blue-50 border-b-2 border-amber-400' : 'text-gray-800 hover:bg-gray-50')}>
                      {link.name}
                      {link.badge && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-600 text-white">{link.badge}</span>}
                    </NavLink>
                    {link.sub && (
                      <div className="ml-4 pl-4 border-l-2 border-blue-100 mt-1 mb-1 flex flex-col gap-1">
                        {link.sub.map((s) => (
                          <Link key={s.path} to={s.path} onClick={() => setMobileOpen(false)} className="py-1.5 text-sm text-gray-600 hover:text-blue-600 transition-colors">{s.name}</Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <div className="pt-4 border-t border-gray-100 mt-2 flex flex-col gap-2">
                  <a href="tel:+918927070972" onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 py-3 text-sm font-semibold text-gray-700 border-2 border-gray-200 rounded-xl">
                    <Phone className="h-4 w-4 text-blue-600" /> +91 89270 70972
                  </a>
                  <button onClick={() => { setMobileOpen(false); setAuthOpen(true); }}
                    className="flex items-center justify-center gap-2 py-3 text-sm font-semibold text-gray-700 border-2 border-gray-200 rounded-xl">
                    <User className="h-4 w-4 text-blue-600" /> Sign In / Register
                  </button>
                  <Link to="/contact" onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center py-3 rounded-xl font-bold text-white brand-gradient shadow-md">
                    Get a Quote
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
};

export default Navbar;
