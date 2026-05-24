import React, { useState } from 'react';
import useSeo from '@/hooks/useSeo';
import { motion } from 'framer-motion';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';
import PageHero from '@/components/PageHero';

const LAST_UPDATED = '01 April 2026';

const sections = [
  {
    id: 'acceptance',
    title: '1. Acceptance of Terms',
    content: `By accessing or using the website of Navgrow Engineering Service Pvt. Ltd. ("Navgrow", "we", "us", or "our") at navgrow.org, or by placing an order through our online shop, you agree to be bound by these Terms & Conditions. If you do not agree to these terms, please do not use our website or services.

These terms apply to all visitors, users, customers, and others who access or use the Service. We reserve the right to update these terms at any time, and continued use of the website constitutes acceptance of the revised terms.`
  },
  {
    id: 'services',
    title: '2. Services & Scope',
    content: `Navgrow Engineering Service Pvt. Ltd. provides engineering solutions for Indian Railways and government agencies, including but not limited to: locomotive modification, shed construction, testing facilities, safety compliance, consulting, and supply of industrial products.

All services are subject to separate written contracts or work orders. Nothing on this website constitutes a binding contractual offer unless confirmed in writing by an authorised representative of Navgrow.

Our online shop offers safety equipment, railway tools, maintenance supplies, and PPE. Product specifications, prices, and availability are subject to change without notice.`
  },
  {
    id: 'orders',
    title: '3. Orders, Pricing & Payment',
    content: `All prices displayed on our website are in Indian Rupees (₹) and are exclusive of GST unless stated otherwise. GST at 18% (or applicable rate) will be added at checkout.

"Buy Now" orders are processed via Razorpay and are subject to Razorpay's Payment Terms. Payment is due in full at the time of order. We accept UPI, credit/debit cards, and net banking.

"Request a Quote" submissions are not binding orders. A formal quotation will be issued within 24 business hours. Orders are confirmed only upon issuance of a Purchase Order or written acceptance by Navgrow.

We reserve the right to refuse or cancel any order, including after payment, if the product is out of stock, the price was listed in error, or there is suspected fraud.`
  },
  {
    id: 'delivery',
    title: '4. Delivery & Shipping',
    content: `Standard delivery timelines are 3–5 business days within India, subject to product availability and delivery location. Delivery to remote areas (including parts of North-East India) may take longer.

Navgrow is not liable for delays caused by courier partners, natural disasters, strikes, government action, or other circumstances beyond our control.

Shipping charges are calculated at checkout based on order weight and destination. Free shipping may apply on orders above a specified threshold, as displayed on the shop page.

Customers are responsible for providing accurate delivery addresses. Navgrow is not liable for non-delivery due to incorrect information provided by the customer.`
  },
  {
    id: 'returns',
    title: '5. Returns, Refunds & Cancellations',
    content: `Products may be returned within 7 days of delivery if they are: (a) defective or damaged on arrival, (b) significantly different from the description on our website, or (c) wrong item delivered.

To initiate a return, email info@navgrow.org with your order ID, photos of the product, and reason for return. We will arrange reverse pickup within 3 business days of approval.

Refunds are processed to the original payment method within 7–10 business days of receiving the returned item in acceptable condition.

Customised products, consumables already opened, and products damaged due to customer misuse are not eligible for return.

Service contracts are non-refundable once work has commenced. Cancellation of a service contract must be notified in writing and is subject to the terms of the individual contract.`
  },
  {
    id: 'intellectual',
    title: '6. Intellectual Property',
    content: `All content on this website, including but not limited to text, images, logos, graphics, and software, is the property of Navgrow Engineering Service Pvt. Ltd. or its licensors and is protected by Indian copyright law.

You may not reproduce, distribute, modify, or create derivative works from any content on this website without prior written permission.

The Navgrow name and logo are trademarks of Navgrow Engineering Service Pvt. Ltd. Unauthorised use is prohibited.`
  },
  {
    id: 'liability',
    title: '7. Limitation of Liability',
    content: `To the maximum extent permitted by applicable law, Navgrow shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of our website, services, or products.

Our total liability for any claim arising out of or relating to these Terms or our services shall not exceed the amount you paid to Navgrow in the 12 months preceding the claim.

We do not warrant that our website will be error-free, uninterrupted, or free of viruses or other harmful components.`
  },
  {
    id: 'governing',
    title: '8. Governing Law & Disputes',
    content: `These Terms are governed by and construed in accordance with the laws of India. Any disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts located in Siliguri, West Bengal, India.

Before initiating legal proceedings, we encourage you to contact us at info@navgrow.org to resolve disputes amicably.`
  },
  {
    id: 'contact-legal',
    title: '9. Contact for Legal Enquiries',
    content: `For any queries regarding these Terms & Conditions, please contact:\n\nNavgrow Engineering Service Pvt. Ltd.\nWard No-47, Old Matigara Road, Pati Colony,\nSiliguri, West Bengal – 734001\n\nEmail: info@navgrow.org\nPhone: +91 89270 70972\nCIN: U74999WB2022PTC256012`
  },
];

const AccordionItem = ({ section }) => {
  useSeo({ title: "Terms & Conditions | Navgrow Engineering", description: "Terms and conditions governing use of navgrow.org and engagement with Navgrow Engineering Service Pvt. Ltd.", path: "/terms" });
  const [open, setOpen] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      className={`border rounded-2xl overflow-hidden transition-colors ${open ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100 bg-white hover:border-blue-100'}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 text-left">
        <span className={`font-bold text-base ${open ? 'text-blue-700' : 'text-gray-900'}`}>{section.title}</span>
        {open ? <ChevronUp className="h-5 w-5 text-blue-500 shrink-0" /> : <ChevronDown className="h-5 w-5 text-gray-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-5">
          {section.content.split('\n\n').map((p, i) => (
            <p key={i} className="text-gray-600 leading-relaxed text-sm mb-3 last:mb-0 whitespace-pre-line">{p}</p>
          ))}
        </div>
      )}
    </motion.div>
  );
};

const TermsPage = () => (
  <>
    <PageHero
      chip={<><FileText className="h-4 w-4" /> Legal</>}
      title={<>Terms & <span className="gradient-text">Conditions</span></>}
      subtitle="Please read these terms carefully before using our website or placing an order."
      breadcrumbs={[{ label: 'Terms & Conditions' }]}
    />

    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8 text-sm text-amber-800">
          <strong>Last Updated:</strong> {LAST_UPDATED}. These terms govern your use of our website and services. By continuing to use navgrow.org, you accept these terms in full.
        </div>
        <div className="flex flex-col gap-3">
          {sections.map(s => <AccordionItem key={s.id} section={s} />)}
        </div>
      </div>
    </section>
  </>
);

export default TermsPage;
