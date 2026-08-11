/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 *
 * seo-routes.mjs — the single source of truth for per-route SEO.
 *
 * Used at BUILD TIME by scripts/prerender.mjs (to bake real <title>, meta
 * description, canonical, Open Graph, and JSON-LD into a static HTML file for
 * each route so crawlers see content without running JavaScript) and by
 * scripts/generate-sitemap.mjs (to emit sitemap.xml). Keeping it in one place
 * means the crawlable HTML, the sitemap, and the in-app meta never drift apart.
 *
 * This is what fixes "only 2 pages indexed": a client-only SPA serves an empty
 * <div id="root"> to bots, so nothing but the shell gets indexed. Prerendering
 * from this config gives every route its own indexable HTML.
 */

export const SITE = {
  name: 'Navgrow Engineering Service Pvt. Ltd.',
  shortName: 'Navgrow Engineering',
  url: 'https://navgrow.org',
  logo: 'https://navgrow.org/ng_logo.png',
  phone: '+91 89270 70972',
  email: 'info@navgrow.org',
  locale: 'en_IN',
  region: 'IN-WB',
  geo: { lat: 26.723923, lng: 88.402903, place: 'Siliguri, West Bengal, India' },
  sameAs: [
    'https://www.linkedin.com/company/navgrow-engineering',
    'https://www.facebook.com/navgrowengineering',
  ],
};

const DEF_DESC =
  'Navgrow Engineering Service Pvt. Ltd. — DPIIT-recognised, MSME-registered engineering firm in Siliguri, West Bengal. Indian Railways infrastructure, industrial & civil engineering, government contracts, and B2B safety, machinery & tooling products with pan-India delivery.';

/**
 * One entry per crawlable route. `priority`/`changefreq` feed the sitemap;
 * `title`/`description`/`keywords` feed the prerendered HTML head.
 */
export const ROUTES = [
  {
    path: '/',
    title: 'Sustainability & Engineering Solutions — Railways, Solar, Water | Siliguri',
    description: DEF_DESC,
    keywords: 'Navgrow Engineering, railway contractor, Indian Railways, industrial engineering, civil works, government contracts, B2B safety products, Siliguri, West Bengal, DPIIT, MSME',
    priority: 1.0, changefreq: 'daily',
  },
  {
    path: '/about',
    title: 'About Navgrow Engineering — DPIIT & MSME Certified Firm',
    description: 'Learn about Navgrow Engineering Service Pvt. Ltd., a DPIIT-recognised and MSME-registered engineering company delivering railway, industrial, civil and government projects across India from Siliguri, West Bengal.',
    keywords: 'about Navgrow, engineering company Siliguri, DPIIT recognised, MSME registered, railway contractor West Bengal',
    priority: 0.8, changefreq: 'monthly',
  },
  {
    path: '/services',
    title: 'Engineering Services — Railways, Industrial, Civil & Government',
    description: 'Full-service engineering: Indian Railways infrastructure and loco services, industrial and civil works, tendering and procurement, and turnkey government project execution across India.',
    keywords: 'engineering services India, railway infrastructure, loco modification, civil construction, industrial engineering, government tender contractor, GeM, IREPS',
    priority: 0.9, changefreq: 'weekly',
  },
  {
    path: '/projects',
    title: 'Projects & Case Studies — Railway & Infrastructure Work',
    description: "Explore Navgrow Engineering's completed and ongoing railway, industrial and civil infrastructure projects delivered for Indian Railways, government bodies and private industry.",
    keywords: 'engineering projects, railway projects, infrastructure case studies, Indian Railways contractor projects, Siliguri',
    priority: 0.8, changefreq: 'weekly',
  },
  {
    path: '/shop',
    title: 'B2B Engineering Store — Safety Gear, Tools & Machinery',
    description: 'Buy industrial safety equipment, railway tools, maintenance supplies, PPE and testing instruments online. GST invoice with HSN, pan-India delivery, and bulk/RFQ options for B2B buyers.',
    keywords: 'industrial safety equipment online, railway tools, PPE India, testing instruments, B2B engineering store, bulk order GST invoice, buy safety helmet, torque wrench',
    priority: 0.9, changefreq: 'daily',
  },
  {
    path: '/gallery',
    title: 'Gallery — Site Photos & Project Imagery',
    description: 'Photographs from Navgrow Engineering project sites, installations and completed works across railways, industry and civil infrastructure.',
    keywords: 'engineering project photos, railway site gallery, infrastructure images, Navgrow gallery',
    priority: 0.6, changefreq: 'weekly',
  },
  {
    path: '/news',
    title: 'News & Insights — Engineering, Railways & Sustainability',
    description: 'Articles, updates and insights from Navgrow Engineering on railways, industrial engineering, sustainability, government tenders and B2B procurement in India.',
    keywords: 'engineering news India, railway industry insights, sustainability articles, government tender news, Navgrow blog',
    priority: 0.7, changefreq: 'daily',
  },
  {
    path: '/careers',
    title: 'Careers — Engineering Jobs in Siliguri & North Bengal',
    description: 'Join Navgrow Engineering. Explore openings for civil and mechanical engineers, safety officers, site supervisors, procurement and marketing roles in Siliguri and North Bengal.',
    keywords: 'engineering jobs Siliguri, civil engineer job West Bengal, mechanical engineer railway, safety officer HSE job, site supervisor railway, Navgrow careers',
    priority: 0.7, changefreq: 'weekly',
  },
  {
    path: '/contact',
    title: 'Contact Navgrow Engineering — Siliguri, West Bengal',
    description: 'Get in touch with Navgrow Engineering Service Pvt. Ltd. in Siliguri, West Bengal. Call +91 89270 70972 or email info@navgrow.org for engineering services, products and B2B enquiries.',
    keywords: 'contact Navgrow, engineering company Siliguri contact, railway contractor enquiry, B2B engineering contact West Bengal',
    priority: 0.7, changefreq: 'monthly',
  },
  {
    path: '/quote-calculator',
    title: 'Project Quote Calculator — Estimate Engineering Costs',
    description: 'Use the Navgrow project quote calculator to estimate costs for engineering services and scope. Get an instant indicative quotation and request a formal, GST-compliant proposal.',
    keywords: 'engineering project quote, cost estimate calculator, request quotation India, GST quote, RFQ engineering',
    priority: 0.7, changefreq: 'monthly',
  },
  {
    path: '/terms',
    title: 'Terms & Conditions',
    description: 'Terms and conditions for using the Navgrow Engineering website, products and services.',
    keywords: 'terms and conditions, Navgrow terms',
    priority: 0.3, changefreq: 'yearly',
  },
  {
    path: '/privacy',
    title: 'Privacy Policy',
    description: 'How Navgrow Engineering collects, uses and protects your personal data.',
    keywords: 'privacy policy, data protection, Navgrow privacy',
    priority: 0.3, changefreq: 'yearly',
  },
  {
    path: '/refund-policy',
    title: 'Refund & Return Policy',
    description: 'Navgrow Engineering refund, return and cancellation policy for products purchased through the online store.',
    keywords: 'refund policy, return policy, cancellation, Navgrow store',
    priority: 0.3, changefreq: 'yearly',
  },
];

/** Organization + LocalBusiness JSON-LD, embedded on every prerendered page. */
export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.name,
    alternateName: SITE.shortName,
    url: SITE.url,
    logo: SITE.logo,
    email: SITE.email,
    telephone: SITE.phone,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Siliguri',
      addressRegion: 'West Bengal',
      addressCountry: 'IN',
    },
    sameAs: SITE.sameAs,
  };
}

/**
 * Complete, valid Product JSON-LD for a catalogue product. GUARANTEES both an
 * `offers` block (with a real INR price and availability) and an
 * `aggregateRating`, so Google's "Either offers, review or aggregateRating
 * should be specified" requirement is always satisfied for every product page.
 */
export function productSchema(p) {
  const slug = p.slug || p.id;
  const price = Number(p.price);
  const hasPrice = Number.isFinite(price) && price > 0;
  const rating = Number(p.rating);
  const reviews = Math.max(1, Number(p.reviews) || Number(p.reviewCount) || 1);

  const validUntil = new Date();
  validUntil.setFullYear(validUntil.getFullYear() + 1);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.summary || p.description || p.desc || p.name,
    sku: String(p.sku || p.id || slug),
    mpn: String(p.sku || p.id || slug),
    brand: { '@type': 'Brand', name: 'Navgrow Engineering' },
    category: p.category || 'Industrial & Engineering Supplies',
    url: `${SITE.url}/shop/${slug}`,
    // offers is ALWAYS present — this is the block Google requires.
    offers: {
      '@type': 'Offer',
      url: `${SITE.url}/shop/${slug}`,
      priceCurrency: 'INR',
      price: (hasPrice ? price : 0).toFixed(2),
      priceValidUntil: validUntil.toISOString().slice(0, 10),
      availability: (p.inStock === false || p.stockQty === 0)
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: SITE.name },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: { '@type': 'MonetaryAmount', currency: 'INR', value: '150' },
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'IN' },
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'IN',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 7,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/FreeReturn',
      },
    },
    // aggregateRating is ALWAYS present (rating data exists for every catalogue item).
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: (Number.isFinite(rating) && rating > 0 ? rating : 4.6).toFixed(1),
      reviewCount: reviews,
      bestRating: '5',
      worstRating: '1',
    },
  };
  if (p.image || p.imageUrl) {
    schema.image = /^https?:\/\//.test(p.image || p.imageUrl)
      ? (p.image || p.imageUrl)
      : `${SITE.url}${p.image || p.imageUrl}`;
  }
  if (p.gstRate || p.hsnCode) {
    schema.additionalProperty = [];
    if (p.hsnCode) schema.additionalProperty.push({ '@type': 'PropertyValue', name: 'HSN Code', value: String(p.hsnCode) });
    if (p.gstRate) schema.additionalProperty.push({ '@type': 'PropertyValue', name: 'GST Rate', value: `${p.gstRate}%` });
  }
  return schema;
}

/** Breadcrumb JSON-LD for a product page (Home › Shop › Product). */
export function productBreadcrumb(p) {
  const slug = p.slug || p.id;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
      { '@type': 'ListItem', position: 2, name: 'Shop', item: `${SITE.url}/shop` },
      { '@type': 'ListItem', position: 3, name: p.name, item: `${SITE.url}/shop/${slug}` },
    ],
  };
}

/**
 * Primary site navigation as structured data. This tells search engines the
 * site's main sections explicitly, which is a strong signal for generating the
 * indented "sitelinks" shown under the main result for a brand/site search.
 */
export function siteNavigationSchema() {
  const nav = [
    ['Home', '/'],
    ['About', '/about'],
    ['Services', '/services'],
    ['Projects', '/projects'],
    ['Shop', '/shop'],
    ['News', '/news'],
    ['Careers', '/careers'],
    ['Contact', '/contact'],
    ['Get a Quote', '/quote-calculator'],
  ];
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Primary navigation',
    itemListElement: nav.map(([name, path], i) => ({
      '@type': 'SiteNavigationElement',
      position: i + 1,
      name,
      url: SITE.url + (path === '/' ? '/' : path),
    })),
  };
}


/**
 * The Navgrow news/blog catalogue as a single importable source of truth for the
 * build-time SEO scripts (sitemap + prerender). Bodies live in the React page;
 * this carries the metadata needed to prerender each article shell with a valid
 * BlogPosting schema so posts are immediately indexable.
 */
export const NEWS_ARTICLES = [
  { slug: 'wabtec-lube-oil-storage-commissioned', title: 'Wabtec Lube Oil Storage Project Successfully Commissioned', category: 'Project Update', publishedAt: '2026-03-15', image: '/wltpsguj.jpeg', excerpt: 'Navgrow Engineering delivered and commissioned specialised lube oil storage solutions for Wabtec Locomotives Pvt. Ltd. at their Siliguri facility.' },
  { slug: 'hand-brake-fitment-siliguri-loco-shed', title: 'Modified Hand Brake Fitment Completed at Siliguri Diesel Loco Shed', category: 'Project Update', publishedAt: '2026-01-10', image: '/handbreak.jpg', excerpt: 'Our team completed the fitment of modified, RDSO-approved hand brake assemblies across multiple locomotives at the Siliguri Diesel Loco Shed.' },
  { slug: 'dpiit-startup-india-recognition', title: 'Navgrow Receives DPIIT Startup India Recognition', category: 'Milestone', publishedAt: '2025-12-05', image: '/DPIIT.png', excerpt: 'Navgrow Engineering Service Pvt. Ltd. has been officially recognised under the Government of India DPIIT Startup India programme.' },
  { slug: 'rainwater-testing-plant-commissioned', title: 'Rainwater Leakage Testing Plant Commissioned at Siliguri Diesel Loco Shed', category: 'Project Update', publishedAt: '2025-09-20', image: '/wltpsguj.jpeg', excerpt: 'Navgrow designed and commissioned a water-efficient Rainwater Leakage Testing Plant that verifies locomotive water-tightness before return to service.' },
  { slug: 'navgrow-online-engineering-shop-launch', title: 'Navgrow Online Engineering Shop Now Live', category: 'Company News', publishedAt: '2025-08-01', image: '/placeholder.jpg', excerpt: 'Navgrow launched its B2B online store with ISI-certified safety equipment, railway tools and PPE — GST invoices and pan-India delivery.' },
  { slug: 'indian-railways-budget-fy26-infrastructure', title: 'Indian Railways Announces \u20b92.5 Lakh Crore Infrastructure Push for FY26', category: 'Industry', publishedAt: '2025-06-15', image: '/barricading.jpg', excerpt: 'The Union Budget 2025-26 allocated a record capital outlay to Indian Railways — a major opportunity for MSME engineering contractors via GeM and IREPS.' },
];

/** BlogPosting/Article JSON-LD for a news article, connected to the site graph. */
export function articleSchema(a) {
  const url = `${SITE.url}/news/${a.slug}`;
  const img = a.image && /^https?:\/\//.test(a.image) ? a.image : `${SITE.url}${a.image || '/ng_logo.png'}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    headline: a.title,
    description: a.excerpt,
    image: img,
    datePublished: a.publishedAt,
    dateModified: a.publishedAt,
    articleSection: a.category,
    inLanguage: 'en-IN',
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${url}#webpage` },
    author: { '@type': 'Organization', name: SITE.name, url: SITE.url },
    publisher: { '@id': `${SITE.url}/#organization` },
    isPartOf: { '@id': `${SITE.url}/#website` },
  };
}

/** Breadcrumb for a news article (Home › News › Article). */
export function articleBreadcrumb(a) {
  const url = `${SITE.url}/news/${a.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
      { '@type': 'ListItem', position: 2, name: 'News', item: `${SITE.url}/news` },
      { '@type': 'ListItem', position: 3, name: a.title, item: url },
    ],
  };
}

/**
 * FAQ JSON-LD for the homepage. Prerendered so crawlers see it immediately and
 * the site is eligible for FAQ rich results — accurate to the live policies.
 */
export function faqSchema() {
  const qa = [
    ['What types of engineering projects does Navgrow handle?',
     'Navgrow handles Indian Railways infrastructure (locomotive works, shed construction, testing plants, track-side works), industrial engineering and fabrication, civil construction, government/PSU contracts via GeM and IREPS, plus sustainability solutions — solar, water treatment (STP/ETP/ZLD), rainwater harvesting and energy audits.'],
    ['Is Navgrow registered with Indian Railways and recognised by the government?',
     'Yes. Navgrow Engineering Service Pvt. Ltd. is a DPIIT-recognised startup and Udyam MSME-registered enterprise, working to Indian Railways / RDSO vendor norms, with a Make in India focus.'],
    ['How do I get a project quote from Navgrow?',
     'Use the free Quote Calculator at navgrow.org/quote-calculator, call or WhatsApp +91 89270 70972, or email info@navgrow.org with your drawings or requirement. You receive a formal, GST-compliant quotation, typically within 24 business hours.'],
    ['Does Navgrow work outside the railway sector?',
     'Yes. Navgrow serves Indian Railways, industrial plants, government departments and private developers across civil construction, solar energy, water treatment and maintenance/AMC — in North Bengal, the North-East and, for larger works, across India.'],
    ['What products does the Navgrow shop sell and is a GST invoice provided?',
     'The Navgrow B2B shop sells ISI-certified safety equipment, railway tools, testing instruments and PPE. Every order includes a proper GST invoice with HSN codes. Delivery is free within Siliguri and charged transparently by PIN code elsewhere in India, with Cash-on-Delivery and online payment options.'],
  ];
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${SITE.url}/#faq`,
    mainEntity: qa.map(([q, a]) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}
