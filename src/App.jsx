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
import React, { Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import MainLayout from '@/layouts/MainLayout';
import { AdminLayout } from '@/pages/admin/AdminDashboard';

// Public pages
const HomePage           = React.lazy(() => import('@/pages/HomePage'));
const AboutPage          = React.lazy(() => import('@/pages/AboutPage'));
const ServicesPage       = React.lazy(() => import('@/pages/ServicesPage'));
const ProjectsPage       = React.lazy(() => import('@/pages/ProjectsPage'));
const ContactPage        = React.lazy(() => import('@/pages/ContactPage'));
const ShopPage           = React.lazy(() => import('@/pages/ShopPage'));
const WishlistPage       = React.lazy(() => import('@/pages/WishlistPage'));
const ProductDetailPage  = React.lazy(() => import('@/pages/ProductDetailPage'));
const CareersPage        = React.lazy(() => import('@/pages/CareersPage'));
const NewsPage           = React.lazy(() => import('@/pages/NewsPage'));
const GalleryPage        = React.lazy(() => import('@/pages/GalleryPage'));
const QuoteCalculatorPage= React.lazy(() => import('@/pages/QuoteCalculatorPage'));
const OrderTrackPage     = React.lazy(() => import('@/pages/OrderTrackPage'));
const AccountPage        = React.lazy(() => import('@/pages/AccountPage'));
const TermsPage          = React.lazy(() => import('@/pages/TermsPage'));
const PrivacyPage        = React.lazy(() => import('@/pages/PrivacyPage'));
const RefundPolicyPage   = React.lazy(() => import('@/pages/RefundPolicyPage'));
const SitemapPage        = React.lazy(() => import('@/pages/SitemapPage'));
const NotFoundPage       = React.lazy(() => import('@/pages/NotFoundPage'));

// Admin pages
const AdminHome          = React.lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminSettings      = React.lazy(() => import('@/pages/admin/AdminSettings'));
const AdminOrders        = React.lazy(() => import('@/pages/admin/AdminOrders'));
const AdminProducts      = React.lazy(() => import('@/pages/admin/AdminProducts'));
const AdminContacts      = React.lazy(() => import('@/pages/admin/AdminContacts'));
const AdminQuotes        = React.lazy(() => import('@/pages/admin/AdminQuotes'));
const AdminRfqs          = React.lazy(() => import('@/pages/admin/AdminRfqs'));
const AdminNews          = React.lazy(() => import('@/pages/admin/AdminNews'));
const AdminCoupons       = React.lazy(() => import('@/pages/admin/AdminCoupons'));
const EditorLayout       = React.lazy(() => import('@/pages/editor/EditorLayout'));
const AdminUsers         = React.lazy(() => import('@/pages/admin/AdminUsers'));
const AdminJobs          = React.lazy(() => import('@/pages/admin/AdminJobs'));
const AdminAuditLog      = React.lazy(() => import('@/pages/admin/AdminAuditLog'));
const AdminGallery       = React.lazy(() => import('@/pages/admin/AdminGallery'));
const AdminProjects      = React.lazy(() => import('@/pages/admin/AdminProjects'));
const AdminTenders       = React.lazy(() => import('@/pages/admin/AdminTenders'));
const NewsDetailPage     = React.lazy(() => import('@/pages/NewsDetailPage'));

const PageLoader = () => (
  <div style={{
    position:'fixed',inset:0,
    background:'linear-gradient(135deg,#0c1845 0%,#1e3a8a 40%,#1e40af 70%,#0c1845 100%)',
    display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
    zIndex:9999,
  }}>
    {/* Animated dot grid background */}
    <div style={{
      position:'absolute',inset:0,
      backgroundImage:'radial-gradient(rgba(255,255,255,0.06) 1px,transparent 1px)',
      backgroundSize:'24px 24px',
    }}/>
    {/* Gold top accent bar */}
    <div style={{position:'absolute',top:0,left:0,right:0,height:'3px',
      background:'linear-gradient(90deg,transparent,#f59e0b 30%,#fbbf24 50%,#f59e0b 70%,transparent)',
      animation:'ng-bar 2s ease-in-out infinite'}}/>

    {/* Main content */}
    <div style={{position:'relative',zIndex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'2rem'}}>

      {/* Hexagonal logo frame */}
      <div style={{position:'relative',width:'100px',height:'100px'}}>
        {/* Rotating gold ring */}
        <svg width="100" height="100" viewBox="0 0 100 100" style={{position:'absolute',inset:0,animation:'ng-spin 3s linear infinite'}}>
          <defs>
            <linearGradient id="ld-gold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b"/>
              <stop offset="50%" stopColor="#fbbf24"/>
              <stop offset="100%" stopColor="#d97706"/>
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="none" stroke="url(#ld-gold)" strokeWidth="2"
            strokeDasharray="72 216" strokeLinecap="round"/>
        </svg>
        {/* Counter-rotating inner ring */}
        <svg width="100" height="100" viewBox="0 0 100 100" style={{position:'absolute',inset:0,animation:'ng-spin-rev 2s linear infinite'}}>
          <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(59,130,246,0.5)" strokeWidth="1"
            strokeDasharray="24 48" strokeLinecap="round"/>
        </svg>
        {/* Logo center */}
        <div style={{
          position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
          width:'62px',height:'62px',borderRadius:'50%',
          background:'linear-gradient(135deg,#1e40af,#1e3a8a)',
          border:'1.5px solid rgba(96,165,250,0.3)',
          display:'flex',alignItems:'center',justifyContent:'center',
          boxShadow:'0 0 24px rgba(37,99,235,0.5),inset 0 0 12px rgba(30,58,138,0.8)',
        }}>
          <img loading="lazy" decoding="async" src="/ng_logo.png" alt="Navgrow"
            style={{width:'44px',height:'44px',objectFit:'contain',filter:'brightness(0) invert(1)',animation:'ng-pulse 2s ease-in-out infinite'}}
            onError={e=>{e.target.style.display='none';}}/>
        </div>
        {/* Gold center dot pulse */}
        <div style={{
          position:'absolute',top:'50%',left:'50%',
          transform:'translate(-50%,-50%)',
          width:'8px',height:'8px',borderRadius:'50%',
          background:'#fbbf24',
          boxShadow:'0 0 12px #f59e0b',
          animation:'ng-dot 1.5s ease-in-out infinite',
          zIndex:2,
        }}/>
      </div>

      {/* Brand name */}
      <div style={{textAlign:'center'}}>
        <div style={{
          fontSize:'22px',fontWeight:900,letterSpacing:'0.18em',
          background:'linear-gradient(90deg,#93c5fd,#ffffff,#fbbf24)',
          WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',
          animation:'ng-shimmer 2.5s linear infinite',
          backgroundSize:'200% auto',
          textTransform:'uppercase',
          fontFamily:'system-ui,sans-serif',
        }}>NAVGROW</div>
        <div style={{fontSize:'10px',letterSpacing:'0.22em',color:'rgba(147,197,253,0.7)',
          textTransform:'uppercase',fontFamily:'system-ui,sans-serif',marginTop:'4px'}}>
          Engineering Service
        </div>
      </div>

      {/* Progress track */}
      <div style={{width:'180px',display:'flex',flexDirection:'column',alignItems:'center',gap:'10px'}}>
        <div style={{
          width:'100%',height:'2px',background:'rgba(255,255,255,0.08)',borderRadius:'2px',overflow:'hidden',
        }}>
          <div style={{
            height:'100%',borderRadius:'2px',
            background:'linear-gradient(90deg,#1e40af,#3b82f6,#f59e0b)',
            animation:'ng-progress 1.8s ease-in-out infinite',
          }}/>
        </div>
        {/* Three segment dots */}
        <div style={{display:'flex',gap:'8px'}}>
          {[0,1,2].map(i=>(
            <div key={i} style={{
              width:'6px',height:'6px',borderRadius:'50%',
              background: i%2===0 ? '#3b82f6' : '#f59e0b',
              animation:`ng-bounce 0.9s ease-in-out ${i*0.18}s infinite alternate`,
              boxShadow:`0 0 6px ${i%2===0?'#3b82f6':'#f59e0b'}`,
            }}/>
          ))}
        </div>
      </div>
    </div>

    <style>{`
      @keyframes ng-spin       { from{transform:rotate(0deg)}    to{transform:rotate(360deg)} }
      @keyframes ng-spin-rev   { from{transform:rotate(0deg)}    to{transform:rotate(-360deg)} }
      @keyframes ng-pulse      { 0%,100%{opacity:.7} 50%{opacity:1} }
      @keyframes ng-dot        { 0%,100%{transform:translate(-50%,-50%) scale(1)} 50%{transform:translate(-50%,-50%) scale(1.8)} }
      @keyframes ng-bounce     { from{transform:translateY(0);opacity:.4} to{transform:translateY(-8px);opacity:1} }
      @keyframes ng-progress   { 0%{width:0%;opacity:1} 70%{width:100%;opacity:1} 100%{width:100%;opacity:0} }
      @keyframes ng-bar        { 0%,100%{opacity:.5} 50%{opacity:1} }
      @keyframes ng-shimmer    { 0%{background-position:-100% center} 100%{background-position:200% center} }
    `}</style>
  </div>
);

const W = ({ children }) => <Suspense fallback={<PageLoader />}>{children}</Suspense>;

function App() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>

        {/* ── Admin routes (dark layout) ── */}
        <Route path="/admin" element={<W><AdminLayout /></W>}>
          <Route index         element={<W><AdminHome /></W>} />
          <Route path="orders"  element={<W><AdminOrders /></W>} />
          <Route path="products"element={<W><AdminProducts /></W>} />
          <Route path="contacts"element={<W><AdminContacts /></W>} />
          <Route path="quotes"  element={<W><AdminQuotes /></W>} />
          <Route path="rfqs"    element={<W><AdminRfqs /></W>} />
          <Route path="news"    element={<W><AdminNews /></W>} />
          <Route path="coupons" element={<W><AdminCoupons /></W>} />
          <Route path="settings"  element={<W><AdminSettings /></W>} />
          <Route path="users"     element={<W><AdminUsers /></W>} />
          <Route path="jobs"      element={<W><AdminJobs /></W>} />
          <Route path="audit"     element={<W><AdminAuditLog /></W>} />
          <Route path="gallery"   element={<W><AdminGallery /></W>} />
          <Route path="projects"  element={<W><AdminProjects /></W>} />
          <Route path="tenders"   element={<W><AdminTenders /></W>} />
        </Route>

        {/* ── Editor routes ── */}
        <Route path="/editor" element={<W><EditorLayout /></W>} />

        {/* ── Public routes (main layout) ── */}
        <Route path="/" element={<MainLayout />}>
          <Route index                element={<W><HomePage /></W>} />
          <Route path="about"         element={<W><AboutPage /></W>} />
          <Route path="services"      element={<W><ServicesPage /></W>} />
          <Route path="projects"      element={<W><ProjectsPage /></W>} />
          <Route path="contact"       element={<W><ContactPage /></W>} />
          <Route path="shop"          element={<W><ShopPage /></W>} />
          <Route path="shop/:slug"    element={<W><ProductDetailPage /></W>} />
          <Route path="wishlist"      element={<W><WishlistPage /></W>} />
          <Route path="careers"       element={<W><CareersPage /></W>} />
          <Route path="news"          element={<W><NewsPage /></W>} />
          <Route path="news/:slug"     element={<W><NewsDetailPage /></W>} />
          <Route path="gallery"       element={<W><GalleryPage /></W>} />
          <Route path="quote-calculator" element={<W><QuoteCalculatorPage /></W>} />
          <Route path="track-order"   element={<W><OrderTrackPage /></W>} />
          <Route path="account"       element={<W><AccountPage /></W>} />
          <Route path="account/orders"element={<W><AccountPage /></W>} />
          <Route path="terms"         element={<W><TermsPage /></W>} />
          <Route path="privacy"       element={<W><PrivacyPage /></W>} />
          <Route path="refund-policy" element={<W><RefundPolicyPage /></W>} />
          <Route path="sitemap"       element={<W><SitemapPage /></W>} />
          <Route path="*"             element={<W><NotFoundPage /></W>} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

export default App;
