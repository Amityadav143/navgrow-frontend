import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Newspaper, Calendar, Tag, ArrowRight, TrendingUp, Award, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHero from '@/components/PageHero';
import CtaSection from '@/components/CtaSection';

const NEWS = [
  {
    id: 1, cat: 'Project Update', date: 'March 2026', icon: Zap, color: 'from-blue-500 to-blue-700',
    title: 'Wabtec Lube Oil Storage Project Successfully Commissioned',
    summary: 'Navgrow Engineering has successfully delivered and commissioned specialised lube oil storage solutions for Wabtec Locomotives Pvt. Ltd. at their Siliguri facility. The modular system ensures safe, ventilated storage for volatile locomotive fluids.',
    tags: ['Wabtec', 'Storage Solutions', 'Siliguri'],
  },
  {
    id: 2, cat: 'Project Update', date: 'January 2026', icon: Zap, color: 'from-indigo-500 to-indigo-700',
    title: 'Modified Hand Brake Fitment Completed at Siliguri Diesel Loco Shed',
    summary: 'Our engineering team successfully completed the fitment of modified hand brake assemblies across multiple locomotives at the Siliguri Diesel Loco Shed. The project was executed ahead of schedule with zero safety incidents.',
    tags: ['Indian Railways', 'Hand Brake', 'Loco Shed'],
  },
  {
    id: 3, cat: 'Milestone', date: 'December 2025', icon: Award, color: 'from-yellow-500 to-orange-600',
    title: 'Navgrow Receives DPIIT Startup India Recognition',
    summary: 'We are proud to announce that Navgrow Engineering Service Pvt. Ltd. has been officially recognised under the DPIIT Startup India programme. This recognition validates our commitment to innovation and makes us eligible for government scheme benefits.',
    tags: ['DPIIT', 'Recognition', 'Startup India'],
  },
  {
    id: 4, cat: 'Project Update', date: 'September 2025', icon: Zap, color: 'from-cyan-500 to-cyan-700',
    title: 'Rainwater Leakage Testing Plant Commissioned at Siliguri Diesel Loco Shed',
    summary: 'Navgrow has successfully designed and commissioned a state-of-the-art Rainwater Leakage Testing Plant for electric locomotives at the Siliguri Diesel Loco Shed. The facility enables comprehensive water ingress testing under simulated rain conditions.',
    tags: ['Indian Railways', 'Testing Plant', 'Innovation'],
  },
  {
    id: 5, cat: 'Company News', date: 'August 2025', icon: TrendingUp, color: 'from-green-500 to-green-700',
    title: 'Navgrow Online Engineering Shop Now Live',
    summary: 'We have launched our B2B online engineering supply store at navgrow.org/shop. The shop features over 20 products including safety equipment, railway tools, maintenance supplies, and PPE — with Razorpay payment integration and bulk quote support.',
    tags: ['E-commerce', 'Shop Launch', 'B2B'],
  },
  {
    id: 6, cat: 'Industry', date: 'June 2025', icon: TrendingUp, color: 'from-violet-500 to-violet-700',
    title: 'Indian Railways Announces ₹2.5 Lakh Crore Infrastructure Push for FY26',
    summary: 'The Union Budget 2025-26 has allocated a record ₹2.5 lakh crore for Indian Railways capital expenditure. This represents a significant opportunity for engineering contractors like Navgrow to participate in track upgradation, loco shed modernisation, and station development projects.',
    tags: ['Indian Railways', 'Budget', 'Opportunity'],
  },
];

const NewsCard = ({ item }) => (
  <motion.article initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
    className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
    <div className={`h-2 bg-gradient-to-r ${item.color}`} />
    <div className="p-6 flex flex-col flex-1">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center`}>
          <item.icon className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{item.cat}</span>
        <span className="text-gray-300 text-xs">·</span>
        <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar className="h-3 w-3" />{item.date}</span>
      </div>
      <h3 className="font-bold text-gray-900 text-lg leading-snug mb-3 flex-1">{item.title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed mb-4">{item.summary}</p>
      <div className="flex flex-wrap gap-2">
        {item.tags.map(t => (
          <span key={t} className="px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full flex items-center gap-1">
            <Tag className="h-2.5 w-2.5" />{t}
          </span>
        ))}
      </div>
    </div>
  </motion.article>
);

const NewsPage = () => {
  const [cat, setCat] = useState('All');
  const cats = ['All', ...Array.from(new Set(NEWS.map(n => n.cat)))];
  const visible = cat === 'All' ? NEWS : NEWS.filter(n => n.cat === cat);

  return (
    <>
      <PageHero
        chip={<><Newspaper className="h-4 w-4" /> Updates</>}
        title={<>News & <span className="gradient-text">Updates</span></>}
        subtitle="Latest project milestones, company announcements, and industry insights from Navgrow Engineering."
        breadcrumbs={[{ label: 'News & Updates' }]}
      />

      <section className="py-16 bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4">
          {/* Filter */}
          <div className="flex flex-wrap gap-2 mb-8">
            {cats.map(c => (
              <button key={c} onClick={() => setCat(c)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${cat === c ? 'brand-gradient text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'}`}>
                {c}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visible.map(item => <NewsCard key={item.id} item={item} />)}
          </div>

          {/* Newsletter CTA */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="mt-16 bg-blue-950 rounded-3xl p-8 text-center max-w-2xl mx-auto">
            <Newspaper className="h-8 w-8 text-blue-400 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-white mb-2">Stay Informed</h3>
            <p className="text-blue-300 mb-5 text-sm">Get the latest project updates, tender alerts, and industry news delivered to your inbox.</p>
            <form onSubmit={e => { e.preventDefault(); }} className="flex gap-2 max-w-sm mx-auto">
              <input type="email" required placeholder="your@email.com"
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-900 border border-blue-700 text-white placeholder-blue-400 focus:outline-none focus:border-blue-500 text-sm" />
              <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-colors">
                Subscribe
              </button>
            </form>
          </motion.div>
        </div>
      </section>
      <CtaSection />
    </>
  );
};

export default NewsPage;
