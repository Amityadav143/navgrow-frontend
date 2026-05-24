import React, { useState } from 'react';
import useSeo from '@/hooks/useSeo';
import { Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';
import PageHero from '@/components/PageHero';

const LAST_UPDATED = '01 April 2026';

const sections = [
  { id: 'who', title: '1. Who We Are', content: `Navgrow Engineering Service Pvt. Ltd. ("Navgrow", "we", "us", "our") is a DPIIT-recognised engineering firm registered under the Companies Act, 2013 (CIN: U74999WB2022PTC256012), with registered office at Ward No-47, Old Matigara Road, Pati Colony, Siliguri, West Bengal – 734001.\n\nWe are the Data Controller of the personal information you provide to us. You can reach our data contact at info@navgrow.org.` },
  { id: 'collect', title: '2. Information We Collect', content: `We collect information you provide directly:\n- Contact & identity details: name, email address, phone number, company name\n- Shipping & billing address (for shop orders)\n- Payment information (processed securely by Razorpay; we do not store card numbers)\n- Communications: messages sent via our contact form or email\n- Professional details: company, project requirements (for B2B enquiries)\n\nWe also collect automatically:\n- Device and browser type, operating system\n- IP address and approximate location\n- Pages visited, time spent, links clicked (via analytics cookies)\n- Referral source (how you found our website)` },
  { id: 'use', title: '3. How We Use Your Information', content: `We use your personal information to:\n- Process and fulfil product orders and service requests\n- Send order confirmations, invoices, and delivery updates\n- Respond to enquiries and provide customer support\n- Send newsletters and updates (only if you opt in)\n- Improve our website and services through analytics\n- Comply with legal obligations under Indian law\n- Detect and prevent fraud\n\nWe do not sell, rent, or trade your personal information to third parties for marketing purposes.` },
  { id: 'legal-basis', title: '4. Legal Basis for Processing', content: `We process your personal data on the following bases:\n- Contractual necessity: to fulfil orders and service agreements\n- Legitimate interests: for analytics, fraud prevention, and improving our services\n- Legal obligation: to comply with tax, accounting, and regulatory requirements under Indian law\n- Consent: for marketing communications (you may withdraw consent at any time)` },
  { id: 'sharing', title: '5. Sharing Your Information', content: `We share your data only with trusted third parties who assist in operating our business:\n- Razorpay Financial Solutions Pvt. Ltd. – payment processing\n- Courier and logistics partners – order fulfilment\n- EmailJS – email delivery for contact form submissions\n- Google Analytics – website analytics (anonymised)\n\nAll third-party processors are contractually required to maintain confidentiality and use your data only for the specified purpose. We do not transfer your data outside India except where required by these service providers and in compliance with applicable data protection law.` },
  { id: 'retention', title: '6. Data Retention', content: `We retain personal data for as long as necessary to fulfil the purposes outlined above:\n- Order and transaction records: 7 years (required by Indian tax law)\n- Contact enquiries: 2 years from last interaction\n- Analytics data: 26 months (anonymised)\n- Newsletter subscriptions: until you unsubscribe\n\nYou may request deletion of your data at any time, subject to legal retention requirements.` },
  { id: 'rights', title: '7. Your Rights', content: `Under the Information Technology Act 2000 and applicable Indian data protection regulations, you have the right to:\n- Access the personal data we hold about you\n- Correct inaccurate or incomplete data\n- Request deletion of your data (right to be forgotten)\n- Object to or restrict certain processing\n- Withdraw consent for marketing at any time\n- Lodge a complaint with the relevant authority\n\nTo exercise these rights, email info@navgrow.org with subject "Data Request – [Your Name]". We will respond within 30 days.` },
  { id: 'cookies', title: '8. Cookies', content: `We use cookies to enhance your experience:\n- Essential cookies: required for the website to function correctly\n- Analytics cookies: help us understand how visitors use the site (Google Analytics)\n- Preference cookies: remember your settings\n\nYou can manage cookie preferences through our cookie banner or your browser settings. Disabling essential cookies may affect website functionality.` },
  { id: 'security', title: '9. Security', content: `We implement appropriate technical and organisational measures to protect your personal data, including SSL/TLS encryption, secure payment processing via PCI-DSS compliant Razorpay, access controls, and regular security reviews.\n\nNo method of transmission over the Internet is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.` },
  { id: 'contact-privacy', title: '10. Contact & Complaints', content: `For privacy-related queries or to exercise your rights:\n\nEmail: info@navgrow.org\nSubject line: Privacy Enquiry\nPhone: +91 89270 70972\nAddress: Ward No-47, Old Matigara Road, Pati Colony, Siliguri, West Bengal – 734001\n\nWe aim to respond to all privacy requests within 30 days.` },
];

const Acc = ({ s }) => {
  useSeo({ title: "Privacy Policy | Navgrow Engineering", description: "Privacy policy for Navgrow Engineering Service Pvt. Ltd. — how we collect, use, and protect your personal data.", path: "/privacy" });
  const [o, setO] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      className={`border rounded-2xl overflow-hidden transition-colors ${o ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100 bg-white hover:border-blue-100'}`}>
      <button onClick={() => setO(!o)} className="w-full flex items-center justify-between p-5 text-left">
        <span className={`font-bold text-base ${o ? 'text-blue-700' : 'text-gray-900'}`}>{s.title}</span>
        {o ? <ChevronUp className="h-5 w-5 text-blue-500 shrink-0" /> : <ChevronDown className="h-5 w-5 text-gray-400 shrink-0" />}
      </button>
      {o && (
        <div className="px-5 pb-5">
          {s.content.split('\n\n').map((p, i) => (
            <p key={i} className="text-gray-600 leading-relaxed text-sm mb-3 last:mb-0 whitespace-pre-line">{p}</p>
          ))}
        </div>
      )}
    </motion.div>
  );
};

const PrivacyPage = () => (
  <>
    <PageHero
      chip={<><Shield className="h-4 w-4" /> Legal</>}
      title={<>Privacy <span className="gradient-text">Policy</span></>}
      subtitle="How we collect, use, and protect your personal information."
      breadcrumbs={[{ label: 'Privacy Policy' }]}
    />
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-8 text-sm text-blue-800">
          <strong>Last Updated:</strong> {LAST_UPDATED}. This policy applies to all personal data collected by Navgrow Engineering Service Pvt. Ltd. through navgrow.org.
        </div>
        <div className="flex flex-col gap-3">
          {sections.map(s => <Acc key={s.id} s={s} />)}
        </div>
      </div>
    </section>
  </>
);

export default PrivacyPage;
