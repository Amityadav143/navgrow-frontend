import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Newspaper, Calendar, Tag, ArrowRight, TrendingUp, Award, Zap, Clock, User, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHero from '@/components/PageHero';
import CtaSection from '@/components/CtaSection';
import useSeo from '@/hooks/useSeo';
import { useApi } from '@/hooks/useApi';
import { newsApi, newsletterApi } from '@/lib/api';

/* ── Static fallback articles (shown when API unavailable) ───────────────── */
const STATIC_NEWS = [
  {
    id: '1', slug: 'wabtec-lube-oil-storage-commissioned', cat: 'Project Update',
    category: 'Project Update', date: 'March 2026', publishedAt: '2026-03-15',
    imageUrl: '/wltpsguj.jpeg', authorName: 'Navgrow Team', viewCount: 142,
    title: 'Wabtec Lube Oil Storage Project Successfully Commissioned',
    excerpt: 'Navgrow Engineering has successfully delivered and commissioned specialised lube oil storage solutions for Wabtec Locomotives Pvt. Ltd. at their Siliguri facility.',
    tags: ['Wabtec', 'Storage Solutions', 'Siliguri'],
  },
  {
    id: '2', slug: 'hand-brake-fitment-siliguri-loco-shed', cat: 'Project Update',
    category: 'Project Update', date: 'January 2026', publishedAt: '2026-01-10',
    imageUrl: '/handbreak.png', authorName: 'Navgrow Team', viewCount: 98,
    title: 'Modified Hand Brake Fitment Completed at Siliguri Diesel Loco Shed',
    excerpt: 'Our engineering team successfully completed the fitment of modified hand brake assemblies across multiple locomotives at the Siliguri Diesel Loco Shed.',
    tags: ['Indian Railways', 'Hand Brake', 'Loco Shed'],
  },
  {
    id: '3', slug: 'dpiit-startup-india-recognition', cat: 'Milestone',
    category: 'Milestone', date: 'December 2025', publishedAt: '2025-12-05',
    imageUrl: '/DPIIT.png', authorName: 'Navgrow Team', viewCount: 387,
    title: 'Navgrow Receives DPIIT Startup India Recognition',
    excerpt: 'We are proud to announce that Navgrow Engineering Service Pvt. Ltd. has been officially recognised under the DPIIT Startup India programme.',
    tags: ['DPIIT', 'Recognition', 'Startup India'],
  },
  {
    id: '4', slug: 'rainwater-testing-plant-commissioned', cat: 'Project Update',
    category: 'Project Update', date: 'September 2025', publishedAt: '2025-09-20',
    imageUrl: '/wltpsguj.jpeg', authorName: 'Navgrow Team', viewCount: 215,
    title: 'Rainwater Leakage Testing Plant Commissioned at Siliguri Diesel Loco Shed',
    excerpt: 'Navgrow has successfully designed and commissioned a state-of-the-art Rainwater Leakage Testing Plant for electric locomotives.',
    tags: ['Indian Railways', 'Testing Plant', 'Innovation'],
  },
  {
    id: '5', slug: 'navgrow-online-engineering-shop-launch', cat: 'Company News',
    category: 'Company News', date: 'August 2025', publishedAt: '2025-08-01',
    imageUrl: '/Railway_Infra.jpg', authorName: 'Navgrow Team', viewCount: 312,
    title: 'Navgrow Online Engineering Shop Now Live',
    excerpt: 'We have launched our B2B online engineering supply store at navgrow.org/shop with 20+ ISI-certified safety equipment, railway tools, and PPE products.',
    tags: ['E-commerce', 'Shop Launch', 'B2B'],
  },
  {
    id: '6', slug: 'indian-railways-budget-fy26-infrastructure', cat: 'Industry',
    category: 'Industry', date: 'June 2025', publishedAt: '2025-06-15',
    imageUrl: '/barricading.png', authorName: 'Navgrow Team', viewCount: 489,
    title: 'Indian Railways Announces ₹2.5 Lakh Crore Infrastructure Push for FY26',
    excerpt: 'The Union Budget 2025-26 has allocated a record ₹2.5 lakh crore for Indian Railways capital expenditure — a major opportunity for engineering contractors.',
    tags: ['Indian Railways', 'Budget', 'Opportunity'],
  },
];

const CAT_COLORS = {
  'Project Update': 'from-blue-500 to-blue-700',
  'Milestone':      'from-yellow-500 to-orange-600',
  'Company News':   'from-green-500 to-green-700',
  'Industry':       'from-violet-500 to-violet-700',
};

/* ── Featured card (hero size) ───────────────────────────────────────────── */
const FeaturedCard = ({ item }) => (
  <motion.article
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    className="relative bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 mb-8 group"
  >
    <div className="grid grid-cols-1 lg:grid-cols-2">
      <Link to={`/news/${item.slug || item.id}`} className="block">
        <div className="aspect-[16/9] lg:aspect-auto lg:h-full overflow-hidden">
          <img
            src={item.imageUrl || '/Railway_Infra.jpg'}
            alt={item.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 min-h-[260px]"
            onError={e => { e.target.src = '/Railway_Infra.jpg'; }}
          />
        </div>
      </Link>
      <div className="p-8 lg:p-10 flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-4">
          <span className={`px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${CAT_COLORS[item.category || item.cat] || 'from-blue-500 to-blue-700'}`}>
            {item.category || item.cat}
          </span>
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {item.date || (item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '')}
          </span>
        </div>
        <Link to={`/news/${item.slug || item.id}`}>
          <h2 className="text-2xl font-extrabold text-gray-900 leading-tight mb-4 hover:text-blue-700 transition-colors">
            {item.title}
          </h2>
        </Link>
        <p className="text-gray-600 leading-relaxed mb-6 line-clamp-3">{item.excerpt}</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {(item.tags || []).map(t => (
            <span key={t} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full flex items-center gap-1">
              <Tag className="h-2.5 w-2.5" />{t}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><User className="h-3 w-3" />{item.authorName || 'Navgrow Team'}</span>
            {item.viewCount > 0 && <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{item.viewCount} views</span>}
          </div>
          <Link to={`/news/${item.slug || item.id}`}
            className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors group/link">
            Read Full Article <ArrowRight className="h-4 w-4 group-hover/link:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  </motion.article>
);

/* ── Standard news card ──────────────────────────────────────────────────── */
const NewsCard = ({ item, index }) => (
  <motion.article
    initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }} transition={{ delay: index * 0.05 }}
    className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col"
  >
    {/* Image */}
    <Link to={`/news/${item.slug || item.id}`} className="block overflow-hidden aspect-[16/9] bg-gray-100">
      <img
        src={item.imageUrl || '/Railway_Infra.jpg'}
        alt={item.title}
        loading="lazy"
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        onError={e => { e.target.src = '/Railway_Infra.jpg'; }}
      />
    </Link>

    <div className="p-5 flex flex-col flex-1">
      {/* Meta row */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white bg-gradient-to-r ${CAT_COLORS[item.category || item.cat] || 'from-blue-500 to-blue-700'}`}>
          {item.category || item.cat}
        </span>
        <span className="text-[11px] text-gray-400 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {item.date || (item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '')}
        </span>
      </div>

      {/* Title */}
      <Link to={`/news/${item.slug || item.id}`}>
        <h3 className="font-bold text-gray-900 text-base leading-snug mb-3 flex-1 hover:text-blue-700 transition-colors line-clamp-2">
          {item.title}
        </h3>
      </Link>

      {/* Excerpt */}
      <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-3">{item.excerpt}</p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {(item.tags || []).slice(0, 3).map(t => (
          <span key={t} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[11px] font-semibold rounded-full">{t}</span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <User className="h-3 w-3" />{item.authorName || 'Navgrow Team'}
        </span>
        <Link to={`/news/${item.slug || item.id}`}
          className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors group/r">
          Read More <ArrowRight className="h-3.5 w-3.5 group-hover/r:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  </motion.article>
);

/* ── Main page ───────────────────────────────────────────────────────────── */
const NewsPage = () => {
  useSeo({
    title: 'News & Updates | Engineering Projects & Industry Insights',
    description: 'Latest news from Navgrow Engineering — project updates, industry insights, DPIIT recognition, and company announcements from Siliguri.',
    path: '/news',
  });

  const [cat, setCat]           = useState('All');
  const [email, setEmail]       = useState('');
  const [subDone, setSubDone]   = useState(false);
  const [subLoading, setSubLoading] = useState(false);

  // Try live API first; fallback to static
  const { data: apiData } = useApi(() => newsApi.list({ status: 'PUBLISHED', size: 50 }), [], { immediate: true });
  const articles = useMemo(() => {
    const list = apiData?.content || (Array.isArray(apiData) ? apiData : null);
    return list && list.length > 0 ? list : STATIC_NEWS;
  }, [apiData]);

  const cats   = ['All', ...Array.from(new Set(articles.map(n => n.category || n.cat)))];
  const visible = cat === 'All' ? articles : articles.filter(n => (n.category || n.cat) === cat);
  const [featured, ...rest] = visible;

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email || subLoading) return;
    setSubLoading(true);
    try {
      await newsletterApi.subscribe(email, '');
      setSubDone(true);
    } catch {
      setSubDone(true);
    } finally {
      setSubLoading(false);
    }
  };

  return (
    <>
      <PageHero
        chip={<><Newspaper className="h-4 w-4" /> Updates</>}
        title={<>News &amp; <span className="gradient-text">Updates</span></>}
        subtitle="Latest project milestones, company announcements, and industry insights from Navgrow Engineering."
        breadcrumbs={[{ label: 'News & Updates' }]}
      />

      <section className="py-16 bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4">

          {/* Category filter */}
          <div className="flex flex-wrap gap-2 mb-8">
            {cats.map(c => (
              <button key={c} onClick={() => setCat(c)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${cat === c ? 'brand-gradient text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-700'}`}>
                {c}
              </button>
            ))}
          </div>

          {/* Featured article */}
          {featured && <FeaturedCard item={featured} />}

          {/* Grid */}
          {rest.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rest.map((item, i) => <NewsCard key={item.id} item={item} index={i} />)}
            </div>
          )}

          {visible.length === 0 && (
            <div className="text-center py-16">
              <Newspaper className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-semibold">No articles in this category yet.</p>
            </div>
          )}

          {/* Newsletter */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="mt-16 bg-gradient-to-br from-blue-950 to-blue-900 rounded-3xl p-8 md:p-10 text-center max-w-2xl mx-auto">
            <Newspaper className="h-10 w-10 text-blue-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">Stay Informed</h3>
            <p className="text-blue-300 mb-6 text-sm">Get the latest project updates, tender alerts, and industry news delivered to your inbox.</p>
            {subDone
              ? <p className="text-green-400 font-semibold">✓ You're subscribed! Thank you.</p>
              : (
                <form onSubmit={handleSubscribe} className="flex gap-2 max-w-sm mx-auto">
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-blue-900 border border-blue-700 text-white placeholder-blue-400 focus:outline-none focus:border-blue-500 text-sm" />
                  <button type="submit" disabled={subLoading}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-60">
                    {subLoading ? '…' : 'Subscribe'}
                  </button>
                </form>
              )
            }
          </motion.div>
        </div>
      </section>
      <CtaSection />
    </>
  );
};

export default NewsPage;
