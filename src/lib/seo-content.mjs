/**
 * seo-content.mjs — real, substantive page content rendered into the prerendered
 * HTML so search engines index meaningful text immediately, without depending on
 * client-side JavaScript execution.
 *
 * The SPA is client-rendered (empty #root), so without this the only crawlable
 * text was a thin <head> + a few links. Google's JS rendering is deferred and
 * budget-limited, which weakens indexing and ranking. Injecting genuine content
 * here (accurate to the business) gives crawlers a rich, immediate page.
 *
 * Keyed by route path. Each entry is an array of {h, p} or {h, list} sections.
 * Content is factual and mirrors what the live React pages present.
 */
export const SEO_CONTENT = {
  '/': [
    { h: 'Engineering Excellence. Sustainable Solutions.',
      p: 'Navgrow Engineering Service Pvt. Ltd. is a DPIIT-recognised, MSME-registered engineering company based in Siliguri, West Bengal, India. We deliver railway infrastructure, industrial and civil works, and sustainability solutions for Indian Railways, government departments and private industry across India.' },
    { h: 'What We Do',
      list: [
        'Railway infrastructure — locomotive shed works, testing plants, track-side installations and RDSO-standard fabrication for Indian Railways.',
        'Industrial & civil engineering — plant fabrication, maintenance, structural and civil construction delivered to specification.',
        'Sustainability solutions — rooftop and ground-mount solar, wastewater treatment (STP/ETP/ZLD), rainwater harvesting and energy efficiency.',
        'Government tendering & procurement — execution of GeM and IREPS tenders with full documentation and compliance.',
        'B2B engineering shop — ISI/BIS-certified safety equipment, tools, PPE and instruments with GST invoicing and pan-India delivery.',
      ] },
    { h: 'Why Choose Navgrow',
      p: 'Quality-first delivery with ISI-marked materials and audit-ready documentation; approved-vendor discipline trained to Indian Railways and departmental norms; one accountable partner for design, supply, execution and maintenance; and a 100% on-time delivery record. Sustainability is built into everything we do.' },
    { h: 'Serving National & Global Clients',
      p: 'Headquartered in Siliguri — a strategic gateway to the North-East, Nepal, Bhutan and Bangladesh — Navgrow serves clients across India and welcomes international enquiries. Contact us at info@navgrow.org or +91 89270 70972.' },
  ],
  '/about': [
    { h: 'About Navgrow Engineering Service Pvt. Ltd.',
      p: 'Incorporated in 2022 (CIN U74999WB2022PTC256012), Navgrow Engineering Service Pvt. Ltd. is a DPIIT-recognised startup and MSME-registered engineering firm headquartered at Ward No-47, Old Matigara Road, Pati Colony, Siliguri, West Bengal – 734001, India.' },
    { h: 'Our Mission',
      p: 'To deliver engineering excellence and sustainable solutions that help railways, industry and government build reliable, future-ready infrastructure — on time, to specification, and with full compliance.' },
    { h: 'Recognitions & Registrations',
      list: [
        'DPIIT / Startup India recognised',
        'MSME / Udyam registered',
        'Aligned with Make in India',
        'Trained to Indian Railways and departmental vendor norms',
      ] },
    { h: 'Capabilities',
      p: 'Railway infrastructure and loco-shed services, industrial fabrication and plant maintenance, civil construction, solar and water-treatment systems, and turnkey government project execution — backed by disciplined project management and documentation.' },
  ],
  '/services': [
    { h: 'Engineering & Sustainability Services',
      p: 'Navgrow provides end-to-end engineering services across four core areas, delivered to Indian Railways and departmental standards with complete documentation.' },
    { h: 'Railway Engineering',
      p: 'Locomotive shed works, testing and lube-oil plants, hand-brake and component fitment to RDSO-approved drawings, track-side infrastructure and railway fabrication for Indian Railways and its vendors.' },
    { h: 'Industrial & Civil Works',
      p: 'Structural fabrication, plant installation and maintenance, civil construction, barricading and site infrastructure for industrial and commercial clients.' },
    { h: 'Sustainability Solutions',
      list: [
        'Solar energy — rooftop and ground-mount PV, on-grid/off-grid/hybrid systems, net-metering support and AMC.',
        'Wastewater treatment — STP, ETP and Zero-Liquid-Discharge (ZLD) systems designed, built and maintained.',
        'Rainwater harvesting — recharge, storage and water audits for compliance and reuse.',
        'Energy efficiency and green-building consulting.',
      ] },
    { h: 'Government Tendering & Procurement',
      p: 'Tender-based execution via GeM and IREPS with compliant documentation, plus procurement and supply of engineered products and materials.' },
  ],
  '/shop': [
    { h: 'B2B Engineering Store',
      p: 'Buy ISI/BIS-certified industrial safety equipment, railway tools, maintenance supplies, PPE and testing instruments online. Every order includes a GST tax invoice with HSN codes for input-tax credit, with pan-India delivery (free within Siliguri) and bulk/RFQ options for institutional and government buyers.' },
    { h: 'Product Categories',
      list: [
        'Safety equipment & PPE — helmets, gloves, safety boots, vests, coveralls and respirators.',
        'Railway & industrial tools — hand tools, wrenches and maintenance equipment.',
        'Testing & measuring instruments.',
        'Maintenance supplies and consumables.',
      ] },
    { h: 'Why Buy From Navgrow',
      p: 'Certified, genuine products; GST-compliant invoicing on every order including COD; transparent PIN-code-based delivery; and dedicated support for bulk and tender procurement. Raise an RFQ for institutional pricing.' },
  ],
  '/projects': [
    { h: 'Projects & Case Studies',
      p: 'Navgrow has delivered railway, industrial and civil infrastructure projects for Indian Railways, government bodies and private industry — including locomotive-shed works, testing and lube-oil plants, water-treatment commissioning and barricading and safety installations, each executed to specification with full documentation.' },
    { h: 'Sectors We Serve',
      list: [
        'Indian Railways — sheds, testing plants and track-side works.',
        'Government departments — tender-based execution via GeM and IREPS.',
        'Industrial plants — fabrication, installation and maintenance.',
        'Private developers — civil, solar and water systems.',
      ] },
  ],
  '/careers': [
    { h: 'Careers at Navgrow Engineering',
      p: 'Join a growing DPIIT-recognised engineering firm in Siliguri, West Bengal. We hire civil and mechanical engineers, safety officers, site supervisors, and procurement and marketing professionals for projects across North Bengal and the North-East.' },
    { h: 'Why Work With Us',
      p: 'Real project responsibility, exposure to railway and infrastructure work, and a culture built on quality and accountability. Send your CV to info@navgrow.org.' },
  ],
  '/contact': [
    { h: 'Contact Navgrow Engineering',
      p: 'Navgrow Engineering Service Pvt. Ltd., Ward No-47, Old Matigara Road, Pati Colony, Siliguri, West Bengal – 734001, India. Phone/WhatsApp: +91 89270 70972. Email: info@navgrow.org. Office hours: Monday–Friday, 9 AM – 6 PM IST. The online shop is open 24/7.' },
    { h: 'How We Can Help',
      p: 'Reach out for engineering services and project quotes, B2B product orders and bulk RFQs, tender participation, or international enquiries. We respond within one business day.' },
  ],
  '/quote-calculator': [
    { h: 'Project Quote Calculator',
      p: 'Estimate indicative costs for Navgrow engineering services and scope, then request a formal, GST-compliant proposal. Share your requirement — drawings, BOQ or a brief — and our team responds with a detailed quotation, typically within 24 hours.' },
  ],
  '/gallery': [
    { h: 'Project Gallery',
      p: 'Photographs from Navgrow Engineering project sites, installations and completed works across railways, industry and civil infrastructure in North Bengal, the North-East and beyond.' },
  ],
  '/news': [
    { h: 'News & Insights',
      p: 'Updates and insights from Navgrow Engineering on railways, industrial engineering, sustainability, government tenders and B2B procurement in India — including company milestones, project commissionings and recognitions.' },
  ],
};

// Render a content section array to clean, crawlable HTML.
export function renderSeoContent(sections) {
  if (!sections || !sections.length) return '';
  return sections.map(s => {
    let out = `<h2>${escapeHtml(s.h)}</h2>`;
    if (s.p) out += `<p>${escapeHtml(s.p)}</p>`;
    if (s.list) out += `<ul>${s.list.map(li => `<li>${escapeHtml(li)}</li>`).join('')}</ul>`;
    return out;
  }).join('\n');
}

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
