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
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, User, Tag, Eye, Share2, Clock, ChevronRight, Newspaper, Check } from 'lucide-react';
import { renderArticleHtml } from '@/lib/richText';
import { useApi } from '@/hooks/useApi';
import { newsApi } from '@/lib/api';
import useSeo from '@/hooks/useSeo';
import PageProgress from '@/components/PageProgress';

/* ── Static fallback map ─────────────────────────────────────────────────── */
const STATIC_DETAIL = {
  'wabtec-lube-oil-storage-commissioned': {
    title: 'Wabtec Lube Oil Storage Project Successfully Commissioned',
    category: 'Project Update', publishedAt: '2026-03-15',
    imageUrl: '/wltpsguj.jpeg', authorName: 'Navgrow Team', viewCount: 142,
    tags: ['Wabtec', 'Storage Solutions', 'Siliguri'],
    content: `
<h2>Project Overview</h2>
<p>Navgrow Engineering Service Pvt. Ltd. has successfully delivered and commissioned specialised lube oil storage solutions for Wabtec Locomotives Pvt. Ltd. at their Siliguri facility. This project represents a significant milestone in our growing partnership with one of the world's leading locomotive manufacturers.</p>

<h2>Project Scope & Execution</h2>
<p>The modular lube oil storage system was designed to ensure safe, well-ventilated storage for volatile locomotive fluids. The design complied fully with fire safety regulations and Indian Petroleum regulations for Class A and Class B petroleum product storage.</p>
<ul>
  <li>Designed and fabricated modular storage racks with secondary containment</li>
  <li>Installed fire detection and suppression infrastructure</li>
  <li>Implemented inventory labelling and MSDS (Material Safety Data Sheet) organisation</li>
  <li>Trained Wabtec personnel on safe handling and spill response procedures</li>
  <li>Completed hazardous area classification survey</li>
</ul>

<h2>Technical Highlights</h2>
<p>The system accommodates over 20 different lubricant grades used in WDP-4D/WDG-4G series locomotives. All storage vessels were colour-coded per industry standards, with dedicated dispensing areas to prevent cross-contamination.</p>

<h2>Outcome</h2>
<p>The commissioning was completed ahead of schedule with zero safety incidents. Wabtec's operations team has reported a 35% improvement in fluid management efficiency. Navgrow has since been retained for ongoing maintenance support at the facility.</p>

<blockquote>"The professionalism and technical expertise of the Navgrow team was evident throughout the project. They delivered exactly what was promised, on time and within budget." — Wabtec Facility Manager, Siliguri</blockquote>
    `,
  },
  'dpiit-startup-india-recognition': {
    title: 'Navgrow Receives DPIIT Startup India Recognition',
    category: 'Milestone', publishedAt: '2025-12-05',
    imageUrl: '/DPIIT.png', authorName: 'Navgrow Team', viewCount: 387,
    tags: ['DPIIT', 'Recognition', 'Startup India'],
    content: `
<h2>A Landmark Achievement</h2>
<p>Navgrow Engineering Service Pvt. Ltd. has been officially recognised under the Government of India's DPIIT Startup India programme. This recognition marks a significant milestone in our journey as a technology-driven engineering services company.</p>

<h2>What This Means</h2>
<p>DPIIT recognition validates our commitment to innovation and grants access to several government benefits including:</p>
<ul>
  <li>Tax exemptions under Section 80-IAC of the Income Tax Act</li>
  <li>Self-certification compliance under 9 labour and 3 environmental laws</li>
  <li>Faster intellectual property registration with rebates</li>
  <li>Access to government tender fast-track provisions for startups</li>
  <li>Networking through the Startup India portal ecosystem</li>
</ul>

<h2>Our Innovation Focus</h2>
<p>Navgrow was recognised for its innovative approach to railway infrastructure engineering, combining traditional civil/mechanical expertise with modern IoT monitoring, AI-powered customer support (NavBot), and digital-first procurement via navgrow.org.</p>

<h2>Looking Ahead</h2>
<p>This recognition opens doors to government grants, incubation support, and investor visibility through the Startup India platform. We are committed to continuing our growth as a trusted engineering partner for Indian Railways and industrial clients across North-East India.</p>
    `,
  },

  'hand-brake-fitment-siliguri-loco-shed': {
    title: 'Modified Hand Brake Fitment Completed at Siliguri Diesel Loco Shed',
    category: 'Project Update', publishedAt: '2026-01-10',
    imageUrl: '/handbreak.jpg', authorName: 'Navgrow Team', viewCount: 98,
    tags: ['Indian Railways', 'Hand Brake', 'Loco Shed', 'RDSO'],
    content: `
<h2>Project Overview</h2>
<p>Navgrow Engineering Service Pvt. Ltd. has completed the fitment of modified hand brake assemblies across multiple diesel-electric locomotives at the Siliguri Diesel Loco Shed, one of the key maintenance facilities serving the Northeast Frontier Railway zone. The upgrade improves parking-brake reliability and brings the fleet in line with the latest Indian Railways safety directives.</p>

<h2>Why the Modification Matters</h2>
<p>The hand brake is a locomotive's last line of defence against unintended movement when it is stabled or under maintenance. Worn or non-standard assemblies increase the risk of roll-away incidents on graded sidings — a genuine concern in the hilly terrain around Siliguri and the Dooars. The modified design increases mechanical advantage, reduces the effort a loco pilot needs to apply, and improves holding force on gradients.</p>

<h2>Scope of Work</h2>
<ul>
  <li>Removal and inspection of legacy hand brake assemblies</li>
  <li>Fitment of modified assemblies to RDSO-approved drawings and material specifications</li>
  <li>Load and holding-force testing on graded track</li>
  <li>Documentation of measurement books, material test certificates and inspection records</li>
  <li>On-shed training for maintenance staff on the revised assembly</li>
</ul>

<h2>Standards & Compliance</h2>
<p>All work was carried out to Research Designs and Standards Organisation (RDSO) specifications, using ISI-marked components and approved-vendor materials. Every stage was executed under qualified supervision with defined hold points, and a full handover dossier — drawings, certificates, and test results — was submitted for audit.</p>

<h2>Outcome</h2>
<p>The fitment programme was completed on schedule with zero safety incidents and no disruption to the shed's routine maintenance schedule. The upgraded assemblies have improved braking consistency across the treated locomotives, and Navgrow continues to support the shed with railway maintenance and fabrication services.</p>

<blockquote>Navgrow specialises in railway infrastructure and rolling-stock support — from shed and testing-plant works to track-side fabrication — delivered to Indian Railways vendor norms. <a href="/services">Explore our railway services</a> or <a href="/contact">request a quotation</a>.</blockquote>
    `,
  },

  'rainwater-testing-plant-commissioned': {
    title: 'Rainwater Leakage Testing Plant Commissioned at Siliguri Diesel Loco Shed',
    category: 'Project Update', publishedAt: '2025-09-20',
    imageUrl: '/wltpsguj.jpeg', authorName: 'Navgrow Team', viewCount: 215,
    tags: ['Indian Railways', 'Testing Plant', 'Innovation', 'Rolling Stock'],
    content: `
<h2>Project Overview</h2>
<p>Navgrow Engineering has designed, built and commissioned a Rainwater Leakage Testing Plant for electric locomotives at the Siliguri Diesel Loco Shed. The facility simulates heavy monsoon conditions to verify that a locomotive's roof, windows, doors and cable entries are fully watertight before the machine returns to service.</p>

<h2>The Problem It Solves</h2>
<p>Water ingress is a leading cause of electrical faults in rolling stock, particularly in the high-rainfall belt of North Bengal and the Northeast. A single leak can short high-voltage equipment, corrode cabling and cause expensive in-service failures. A controlled rain-simulation test lets the shed catch leaks in the workshop rather than on the main line.</p>

<h2>How the Plant Works</h2>
<ul>
  <li>An overhead spray gantry delivers a calibrated, monsoon-intensity water flow across the full locomotive body</li>
  <li>Adjustable nozzles target known weak points — roof seams, windscreen seals, door gaskets and cable glands</li>
  <li>A recirculation and filtration loop conserves water between test cycles</li>
  <li>Inspection walkways allow staff to observe the interior for ingress during the test</li>
  <li>Test duration and flow are standardised so results are repeatable and auditable</li>
</ul>

<h2>Engineering & Sustainability</h2>
<p>The plant was engineered for water efficiency: the closed-loop recirculation system reuses the majority of test water, reflecting Navgrow's focus on sustainable infrastructure. The structure was fabricated to withstand continuous exposure and designed for low-maintenance operation.</p>

<h2>Outcome</h2>
<p>Since commissioning, the shed has been able to certify locomotive water-tightness in-house, reducing rain-related electrical failures and improving fleet availability during the monsoon. The project showcases Navgrow's ability to combine railway domain knowledge with practical, water-smart engineering.</p>

<blockquote>From testing plants to water-recycling systems, Navgrow builds infrastructure that lasts. <a href="/services">See our capabilities</a> or <a href="/quote-calculator">get an instant estimate</a>.</blockquote>
    `,
  },

  'indian-railways-budget-fy26-infrastructure': {
    title: 'Indian Railways Announces \u20b92.5 Lakh Crore Infrastructure Push for FY26',
    category: 'Industry', publishedAt: '2025-06-15',
    imageUrl: '/barricading.jpg', authorName: 'Navgrow Team', viewCount: 489,
    tags: ['Indian Railways', 'Infrastructure', 'Budget 2025-26', 'Tenders', 'GeM'],
    content: `
<h2>A Record Capital Outlay</h2>
<p>The Union Budget 2025-26 allocated a record capital expenditure to Indian Railways, continuing the government's multi-year modernisation drive. For engineering contractors and suppliers, this sustained investment translates into a large and steady pipeline of work across track, electrification, station redevelopment, rolling-stock support and safety systems.</p>

<h2>Where the Spending Goes</h2>
<ul>
  <li><strong>Track renewal &amp; new lines</strong> — doubling, tripling and gauge-conversion projects nationwide</li>
  <li><strong>Electrification</strong> — overhead equipment (OHE) as the network approaches full electrification</li>
  <li><strong>Station redevelopment</strong> — the Amrit Bharat Station Scheme upgrading hundreds of stations</li>
  <li><strong>Safety</strong> — Kavach train-collision-avoidance deployment, signalling and level-crossing works</li>
  <li><strong>Rolling stock &amp; sheds</strong> — new manufacturing plus maintenance and testing-plant upgrades</li>
</ul>

<h2>What It Means for MSME Engineering Firms</h2>
<p>A significant share of railway work reaches the market through the Government e-Marketplace (GeM) and the Indian Railways E-Procurement System (IREPS), where MSMEs enjoy procurement preferences. For a DPIIT-recognised, Udyam-registered firm, this is a genuine opportunity — provided the firm can meet the documentation, quality and safety bar that railway contracts demand.</p>

<h2>How Navgrow Is Positioned</h2>
<p>Navgrow Engineering works to Indian Railways and departmental vendor norms, with hands-on experience in shed works, testing plants, fabrication and track-side infrastructure around the strategic Siliguri corridor — a gateway to the Northeast, Nepal, Bhutan and Bangladesh. We combine approved-vendor discipline, ISI-marked materials and audit-ready documentation with a single accountable point of responsibility from design to handover.</p>

<h2>Turning Budget Into Delivery</h2>
<p>Record allocations only create value when they are executed well. Navgrow helps government departments and prime contractors deliver on time and to standard — with GST-compliant billing and full traceability. As the FY26 pipeline opens up, we are ready to support railway and infrastructure projects across the region.</p>

<blockquote>Planning a railway or infrastructure project? Navgrow delivers tender-based execution via GeM and IREPS with complete documentation. <a href="/contact">Talk to our team</a> or <a href="/quote-calculator">request a quote</a>.</blockquote>
    `,
  },

  'navgrow-online-engineering-shop-launch': {
    title: 'Navgrow Online Engineering Shop Now Live',
    category: 'Company News', publishedAt: '2025-08-01',
    imageUrl: '/placeholder.jpg', authorName: 'Navgrow Team', viewCount: 312,
    tags: ['E-commerce', 'Shop Launch', 'B2B', 'Safety Equipment', 'PPE'],
    content: `
<h2>Engineering Supplies, Now a Click Away</h2>
<p>Navgrow Engineering has launched its B2B online store at <a href="/shop">navgrow.org/shop</a>, bringing industrial safety equipment, railway tools and personal protective equipment (PPE) online with transparent pricing, GST invoices and pan-India delivery. The store is built for contractors, factories, government departments and MSMEs who want a reliable, compliant supplier without the friction of phone-and-paper procurement.</p>

<h2>What You Can Buy</h2>
<ul>
  <li><strong>ISI-marked safety helmets</strong> and high-visibility vests for site and track work</li>
  <li><strong>Safety footwear</strong> — steel-toe boots built for industrial environments</li>
  <li><strong>Hand and cut protection</strong> — impact gloves, cut-resistant sleeves, knee pads</li>
  <li><strong>Respiratory &amp; face protection</strong> — full-face respirators and arc-flash shields</li>
  <li><strong>Precision tools &amp; instruments</strong> — torque wrenches, vernier calipers, infrared thermometers, vibration analysers</li>
  <li><strong>Railway-specific items</strong> — track gauges, fish-bolt sets and maintenance consumables</li>
</ul>

<h2>Built for B2B Buyers</h2>
<p>Every order generates a proper GST invoice with HSN codes — essential for input-tax-credit claims. Prices are shown GST-inclusive with a clear tax breakdown, and delivery charges are transparent by PIN code. For larger requirements, buyers can raise a bulk enquiry or full Request for Quotation (RFQ) and receive institutional pricing, typically within 24 hours.</p>

<h2>Why It Matters</h2>
<p>Sourcing safety gear and tools in regional India often means chasing quotes over WhatsApp with no audit trail. Navgrow's store replaces that with a professional, compliant experience: quality-first products, honest pricing, and documentation that stands up to audit. It is the same engineering rigour we bring to our project work, applied to everyday procurement.</p>

<h2>Getting Started</h2>
<p>Browse the catalogue, add items to your cart, enter your PIN code for an exact delivery charge, and check out online or by Cash on Delivery. Need a formal quotation for a tender or bulk order? Use the RFQ option and our team will respond quickly.</p>

<blockquote>Explore the store at <a href="/shop">navgrow.org/shop</a>, or <a href="/quote-calculator">request a bulk quote</a> for institutional pricing.</blockquote>
    `,
  },
};

const CAT_COLORS = {
  'Project Update': 'bg-blue-100 text-blue-700',
  'Milestone':      'bg-yellow-100 text-yellow-700',
  'Company News':   'bg-green-100 text-green-700',
  'Industry':       'bg-violet-100 text-violet-700',
};

const NewsDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  // Try live API
  const { data: apiArticle, loading } = useApi(
    () => newsApi.get(slug),
    [slug], { immediate: true }
  );

  // Fallback to static
  const article = apiArticle || STATIC_DETAIL[slug];

  useSeo({
    title: article ? `${article.title} | Navgrow News` : 'Article | Navgrow News',
    description: article?.excerpt || article?.content?.replace(/<[^>]+>/g,'').slice(0,160) || '',
    path: `/news/${slug}`,
    image: article?.imageUrl || article?.image || '/og-share.jpg',
    type: 'article',
  });

  const readingTime = article
    ? Math.max(1, Math.ceil((article.content?.replace(/<[^>]+>/g,'').length || 0) / 200))
    : 1;

  const [copied, setCopied] = useState(false);
  const handleShare = async () => {
    // Prefer native share sheet on mobile
    if (navigator.share) {
      try {
        await navigator.share({ title: article?.title, url: window.location.href });
        return;
      } catch { /* user cancelled — fall through to copy */ }
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch { /* clipboard unavailable */ }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  if (!article) return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-4 px-4 text-center">
      <Newspaper className="h-16 w-16 text-gray-300" />
      <h2 className="text-2xl font-bold text-gray-700">Article Not Found</h2>
      <p className="text-gray-500">This article may have been moved or deleted.</p>
      <Link to="/news" className="brand-gradient text-white px-6 py-3 rounded-xl font-bold">
        ← Back to News
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fefdf9]">
      <PageProgress />

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-3 flex items-center gap-2 text-sm text-gray-500 flex-wrap">
          <Link to="/" className="hover:text-blue-600 transition-colors">Home</Link>
          <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
          <Link to="/news" className="hover:text-blue-600 transition-colors">News</Link>
          <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
          <span className="text-gray-800 font-medium line-clamp-1">{article.title}</span>
        </div>
      </div>

      <article className="container mx-auto px-4 py-10 max-w-4xl">

        {/* Back button */}
        <motion.button onClick={() => navigate(-1)}
          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 mb-8 transition-colors group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to News
        </motion.button>

        {/* Hero image */}
        {article.imageUrl && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl overflow-hidden mb-8 shadow-xl bg-gray-50 flex justify-center">
            {/* Contain, not cover: article images are often tall infographics or
                posters. Cropping them to a fixed 16:7 banner (the old behaviour)
                cut off content. We cap the height and letterbox instead so the
                whole image is always visible. */}
            <img loading="lazy" decoding="async" src={article.imageUrl} alt={article.title}
              className="w-full max-h-[70vh] object-contain"
              onError={e => { e.target.src = '/placeholder.jpg'; }} />
          </motion.div>
        )}

        {/* Meta */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="flex flex-wrap items-center gap-3 mb-5">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${CAT_COLORS[article.category] || 'bg-blue-100 text-blue-700'}`}>
            {article.category}
          </span>
          <span className="text-sm text-gray-400 flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {article.publishedAt
              ? new Date(article.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
              : article.date || ''}
          </span>
          <span className="text-sm text-gray-400 flex items-center gap-1.5">
            <User className="h-4 w-4" />{article.authorName || 'Navgrow Team'}
          </span>
          <span className="text-sm text-gray-400 flex items-center gap-1.5">
            <Clock className="h-4 w-4" />{readingTime} min read
          </span>
          {article.viewCount > 0 && (
            <span className="text-sm text-gray-400 flex items-center gap-1.5">
              <Eye className="h-4 w-4" />{article.viewCount} views
            </span>
          )}
        </motion.div>

        {/* Title */}
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight mb-6">
          {article.title}
        </motion.h1>

        {/* Tags */}
        {article.tags?.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="flex flex-wrap gap-2 mb-8 pb-6 border-b border-gray-200">
            {article.tags.map(t => (
              <span key={t} className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full flex items-center gap-1">
                <Tag className="h-3 w-3" />{t}
              </span>
            ))}
            <button onClick={handleShare}
              className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded-full hover:bg-blue-100 transition-colors">
              <Share2 className="h-3 w-3" />Share
            </button>
          </motion.div>
        )}

        {/* Content */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="article-body prose prose-lg prose-blue max-w-none
            prose-headings:font-bold prose-headings:text-gray-900
            prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
            prose-p:text-gray-700 prose-p:leading-relaxed
            prose-li:text-gray-700 prose-ul:my-4
            prose-blockquote:border-l-4 prose-blockquote:border-blue-400
            prose-blockquote:bg-blue-50 prose-blockquote:rounded-r-xl
            prose-blockquote:px-5 prose-blockquote:py-3 prose-blockquote:italic
            prose-blockquote:text-blue-800 prose-blockquote:not-italic
            prose-img:rounded-xl prose-img:w-full prose-img:my-6
            prose-a:text-blue-600 prose-a:font-medium
            prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
            prose-ul:list-disc prose-ul:pl-5 prose-ol:list-decimal prose-ol:pl-5"
          dangerouslySetInnerHTML={{ __html: renderArticleHtml(article.content || article.excerpt || '') }}
        />

        {/* Image gallery */}
        {(() => {
          const gallery = (article.imageUrls || '')
            .split('\n').map(u => u.trim()).filter(Boolean);
          if (gallery.length === 0) return null;
          return (
            <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="mt-10">
              <h3 className="text-lg font-extrabold text-gray-900 mb-4">Gallery</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {gallery.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="block rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow aspect-[4/3] bg-gray-100">
                    <img loading="lazy" decoding="async" src={url} alt={`${article.title} — image ${i + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      onError={e => { e.target.onerror = null; e.target.parentElement.style.display = 'none'; }} />
                  </a>
                ))}
              </div>
            </motion.div>
          );
        })()}

        {/* Share + Back */}
        <div className="mt-12 pt-6 border-t border-gray-200 flex items-center justify-between flex-wrap gap-4">
          <Link to="/news"
            className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors">
            <ArrowLeft className="h-4 w-4" />Browse All Articles
          </Link>
          <button onClick={handleShare}
            className={`flex items-center gap-2 px-5 py-2.5 font-bold rounded-xl text-sm transition-all ${
              copied ? 'bg-green-600 text-white' : 'brand-gradient text-white hover:opacity-90'
            }`}>
            {copied ? <><Check className="h-4 w-4" />Link Copied!</> : <><Share2 className="h-4 w-4" />Share This Article</>}
          </button>
        </div>
      </article>
    </div>
  );
};

export default NewsDetailPage;
