import { School } from '../types';

const DEFAULT_TITLE = 'JMC Innovators Learning Platform — JMC Classroom';
const DEFAULT_DESCRIPTION =
  'JMC Innovators Learning Platform (JMC Classroom) — Sri Lankan Grade 6-11 school management and online learning platform with school pages, classrooms, assignments, attendance, and assessments.';

const CANONICAL_ORIGIN = 'https://jmcinnovator.cc.cd';

function resolveBaseOrigin(): string {
  return CANONICAL_ORIGIN;
}

function setMetaTag(attr: 'name' | 'property', key: string, content: string): void {
  if (typeof document === 'undefined') return;
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonicalLink(href: string): void {
  if (typeof document === 'undefined') return;
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

function setDynamicJsonLd(payload: Record<string, unknown> | null): void {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById('jmc-school-jsonld');
  if (!payload) {
    if (existing) existing.remove();
    return;
  }
  const script = existing || document.createElement('script');
  script.id = 'jmc-school-jsonld';
  script.setAttribute('type', 'application/ld+json');
  script.textContent = JSON.stringify(payload);
  if (!existing) {
    document.head.appendChild(script);
  }
}

export function buildSchoolMeta(school: School, baseOrigin = resolveBaseOrigin()) {
  const schoolName = (school.name || school.schoolName || 'School Portal').trim();
  const schoolType = (school.schoolType || 'School').trim();
  const district = (school.district || '').trim();
  const province = (school.province || '').trim();
  const address = (school.address || '').trim();
  const academicYear = (school.academicYear || '2026').trim();

  const locationParts = [district, province ? `${province} Province` : '', 'Sri Lanka'].filter(Boolean);
  const locationLabel = locationParts.join(', ');

  const title = district
    ? `${schoolName} (${district}) — JMC Innovators Learning Platform`
    : `${schoolName} — JMC Innovators Learning Platform`;

  const descriptionParts = [
    `${schoolName} (${schoolType})`,
    address ? `at ${address},` : 'in',
    `${locationLabel}.`,
    `Access Grade 6-11 classrooms, assignments, attendance, and ${academicYear} academic records on JMC Innovators Learning Platform.`,
  ];
  const description = descriptionParts.join(' ').replace(/\s+/g, ' ').trim();
  const canonicalUrl = `${baseOrigin}/schools/${encodeURIComponent(school.id)}`;

  const schoolNode: Record<string, unknown> = {
    '@type': ['School', 'EducationalOrganization'],
    '@id': `${canonicalUrl}#school`,
    name: schoolName,
    description,
    url: canonicalUrl,
    image: `${baseOrigin}/og-image.jpg`,
    address: {
      '@type': 'PostalAddress',
      ...(address ? { streetAddress: address } : {}),
      addressLocality: district || 'Sri Lanka',
      ...(province ? { addressRegion: `${province} Province` } : {}),
      addressCountry: 'LK',
    },
    areaServed: {
      '@type': 'AdministrativeArea',
      name: locationLabel,
    },
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${baseOrigin}/#website`,
      name: 'JMC Innovators Learning Platform',
      url: `${baseOrigin}/`,
    },
  };

  if (school.website && /^https?:\/\//i.test(school.website.trim())) {
    schoolNode.sameAs = [school.website.trim()];
  }
  if (school.phone || school.contactNumber) {
    schoolNode.telephone = String(school.phone || school.contactNumber).trim();
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      schoolNode,
      {
        '@type': 'WebPage',
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: title,
        description,
        isPartOf: {
          '@id': `${baseOrigin}/#website`,
        },
        about: {
          '@id': `${canonicalUrl}#school`,
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'JMC Innovators Learning Platform',
            item: `${baseOrigin}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: district ? `${district} Schools` : 'Schools',
            item: `${baseOrigin}/#schools-directory`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: schoolName,
            item: canonicalUrl,
          },
        ],
      },
    ],
  };

  return { title, description, canonicalUrl, structuredData };
}

export function applySchoolSeo(school: School): void {
  if (typeof document === 'undefined') return;
  const baseOrigin = resolveBaseOrigin();
  const { title, description, canonicalUrl, structuredData } = buildSchoolMeta(school, baseOrigin);

  document.title = title;
  setMetaTag('name', 'description', description);
  setMetaTag('property', 'og:site_name', 'JMC Innovators Learning Platform');
  setMetaTag('property', 'og:title', title);
  setMetaTag('property', 'og:description', description);
  setMetaTag('property', 'og:url', canonicalUrl);
  setMetaTag('name', 'twitter:title', title);
  setMetaTag('name', 'twitter:description', description);
  setCanonicalLink(canonicalUrl);
  setDynamicJsonLd(structuredData);
}

export function applyDefaultSeo(): void {
  if (typeof document === 'undefined') return;
  const baseOrigin = resolveBaseOrigin();

  document.title = DEFAULT_TITLE;
  setMetaTag('name', 'description', DEFAULT_DESCRIPTION);
  setMetaTag('property', 'og:site_name', 'JMC Innovators Learning Platform');
  setMetaTag('property', 'og:title', DEFAULT_TITLE);
  setMetaTag('property', 'og:description', DEFAULT_DESCRIPTION);
  setMetaTag('property', 'og:url', `${baseOrigin}/`);
  setMetaTag('name', 'twitter:title', DEFAULT_TITLE);
  setMetaTag('name', 'twitter:description', DEFAULT_DESCRIPTION);
  setCanonicalLink(`${baseOrigin}/`);
  setDynamicJsonLd(null);
}
