/**
 * © 2024–2026 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 *
 * serviceSchema.js — the JSON-LD of a service page (/services/<slug>): Service,
 * WebPage, BreadcrumbList and FAQPage, as ONE array.
 *
 * Shared by the build-time prerender and the service page in the browser, and
 * published under the same script id (#page-jsonld). The page used to replace
 * the prerendered markup with a bare Service once its JavaScript ran — the
 * breadcrumb, FAQ and the WebPage's link to the Service (#service) vanished from
 * what Google renders. Plain ESM with no imports, so Node can load it.
 */
const SITE_URL = 'https://navgrow.org';
const SHORT_NAME = 'Navgrow Engineering';

const plain = (s, max = 300) => {
  const t = String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

/** The <title> of a service page. */
export function serviceTitle(sv) {
  return `${sv.title} Services — ${sv.tagline ? sv.tagline.replace(/\.$/, '') : SHORT_NAME} | ${SHORT_NAME}`.slice(0, 160);
}

export const serviceDescription = (sv) => plain(sv.description, 300);

export function buildServiceSchemas(sv, { siteUrl = SITE_URL } = {}) {
  if (!sv || !sv.slug) return [];
  const url = `${siteUrl}/services/${sv.slug}`;
  const image = sv.image ? (/^https?:\/\//.test(sv.image) ? sv.image : `${siteUrl}${sv.image.startsWith('/') ? '' : '/'}${sv.image}`) : '';
  const service = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${url}#service`,
    name: sv.title,
    serviceType: sv.title,
    description: serviceDescription(sv),
    url,
    ...(image ? { image } : {}),
    provider: { '@id': `${siteUrl}/#organization` },
    areaServed: { '@type': 'Country', name: 'India' },
  };
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
      { '@type': 'ListItem', position: 2, name: 'Services', item: `${siteUrl}/services` },
      { '@type': 'ListItem', position: 3, name: sv.title, item: url },
    ],
  };
  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: serviceTitle(sv),
    isPartOf: { '@id': `${siteUrl}/#website` },
    breadcrumb: { '@id': `${url}#breadcrumb` },
    mainEntity: { '@id': `${url}#service` },
  };
  const faqs = (sv.faqs || []).filter(f => f && f.q && f.a);
  const faq = faqs.length ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${url}#faq`,
    mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  } : null;
  return [service, webPage, breadcrumb, faq].filter(Boolean);
}
