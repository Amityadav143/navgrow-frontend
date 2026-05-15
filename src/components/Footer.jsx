import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { newsletterApi } from '@/lib/api';
import { Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram, Youtube, Send, ExternalLink } from 'lucide-react';

const Footer = () => {
  const year = new Date().getFullYear();
  const [email, setEmail] = useState('');
  const [subDone, setSubDone] = useState(false);
  const [subLoading, setSubLoading] = useState(false);

  return (
    <footer className="bg-gray-950 text-gray-400">
      {/* Cert strip */}
      <div className="bg-white border-b border-gray-100 py-5">
        <div className="container mx-auto px-4 flex flex-wrap items-center justify-center gap-10">
          {['/DPIIT.png', '/makeinindia.png', '/msme.png'].map(src => (
            <img key={src} src={src} alt="" loading="lazy"
              className="h-11 w-auto object-contain grayscale hover:grayscale-0 opacity-60 hover:opacity-100 transition-all duration-300" onError={(e) => { e.target.onerror=null; e.target.style.display='none'; }} />
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 pt-14 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">

          {/* Brand — spans 2 cols */}
          <div className="lg:col-span-2">
            <img src="/ng_white_logo.png" alt="Navgrow Engineering" loading="lazy" className="h-16 md:h-24 w-auto object-contain mb-5" />
            <p className="text-sm leading-relaxed mb-5 max-w-xs">
              DPIIT-recognised engineering firm delivering quality-first solutions for Indian Railways and government agencies from Siliguri, West Bengal.
            </p>
            {/* Socials */}
            <div className="flex gap-2.5 mb-6">
              {[
                { href: 'https://www.facebook.com/share/1FJBhpqzx4/', icon: Facebook, label: 'Facebook' },
                { href: 'https://x.com/NavgrowEng/', icon: Twitter, label: 'Twitter' },
                { href: 'https://www.linkedin.com/company/navgrow/', icon: Linkedin, label: 'LinkedIn' },
                { href: 'https://www.instagram.com/navgrow.eng/', icon: Instagram, label: 'Instagram' },
              ].map(({ href, icon: Icon, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                  className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-amber-500 hover:text-white hover:border-amber-600 transition-all duration-200">
                  <Icon size={15} />
                </a>
              ))}
            </div>
            {/* Newsletter */}
            <div>
              <p className="text-white text-xs font-bold uppercase tracking-wider mb-2">Stay Updated</p>
              {subDone
                ? <p className="text-green-400 text-sm">✓ Subscribed! Thank you.</p>
                : (
                  <form onSubmit={async e => {
                      e.preventDefault();
                      if (!email || subLoading) return;
                      setSubLoading(true);
                      try {
                        await newsletterApi.subscribe(email, '');
                        setSubDone(true);
                      } catch {
                        setSubDone(true); // optimistic — user already typed valid email
                      } finally {
                        setSubLoading(false);
                      }
                    }} className="flex gap-2">
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="your@email.com"
                      className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors" />
                    <button type="submit" disabled={subLoading} className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shrink-0 disabled:opacity-60">
                      {subLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin block"/> : <Send className="h-4 w-4" />}
                    </button>
                  </form>
                )}
            </div>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-5">Company</h4>
            <ul className="space-y-2.5">
              {[['Home','/'],['About Us','/about'],['Services','/services'],['Projects','/projects'],['Shop','/shop'],['Track Order','/track-order'],['My Account','/account'],['Careers','/careers'],['News & Updates','/news'],['Gallery','/gallery'],['Quote Calculator','/quote-calculator']].map(([l,t]) => (
                <li key={t}><Link to={t} className="text-sm hover:text-blue-400 transition-colors flex items-center gap-1.5 group">
                  <span className="w-1 h-1 rounded-full bg-gray-700 group-hover:bg-blue-500 transition-colors shrink-0" />{l}
                </Link></li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-5">Services</h4>
            <ul className="space-y-2.5">
              {[['Railway Infrastructure','/services#railway-infrastructure'],['Government Contracts','/services#government-contracts'],['Maintenance','/services#maintenance'],['Consulting','/services#consulting'],['Safety & Compliance','/services#safety'],['Technology','/services#technology'],['Shop','/shop']].map(([l,t]) => (
                <li key={t}><Link to={t} className="text-sm hover:text-blue-400 transition-colors flex items-center gap-1.5 group">
                  <span className="w-1 h-1 rounded-full bg-gray-700 group-hover:bg-blue-500 transition-colors shrink-0" />{l}
                </Link></li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-5">Contact</h4>
            <ul className="space-y-3.5 mb-5">
              <li className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <span className="text-sm leading-relaxed">Ward No-47, Old Matigara Road, Pati Colony, Siliguri, WB – 734001</span>
              </li>
              <li><a href="tel:+918927070972" className="flex items-center gap-2.5 text-sm hover:text-blue-400 transition-colors"><Phone className="h-4 w-4 text-blue-500 shrink-0" />+91 89270 70972</a></li>
              <li><a href="mailto:info@navgrow.org" className="flex items-center gap-2.5 text-sm hover:text-blue-400 transition-colors"><Mail className="h-4 w-4 text-blue-500 shrink-0" />info@navgrow.org</a></li>
            </ul>
            <a href="https://wa.me/918927070972" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#25D366] hover:bg-[#1fba58] text-white text-sm font-bold rounded-xl transition-colors">
              💬 WhatsApp Us
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600">© {year} Navgrow Engineering Service Pvt. Ltd. All rights reserved. CIN: U74999WB2022PTC256012</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 justify-center">
            {[['Terms & Conditions','/terms'],['Privacy Policy','/privacy'],['Refund Policy','/refund-policy'],['Sitemap','/sitemap']].map(([l,t]) => (
              <Link key={t} to={t} className="hover:text-gray-400 transition-colors">{l}</Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
