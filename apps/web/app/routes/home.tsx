import type { Route } from './+types/home';
import { Hero } from '@/features/home/components/Hero';
import {
  CTA,
  Destinations,
  Features,
  Partners,
  Pricing,
} from '@/features/home/components/Features';
import { buildOgMeta, SITE_URL, DEFAULT_OG_IMAGE } from '@/lib/og';

const OG_IMAGE = DEFAULT_OG_IMAGE;

/**
 * Home page SEO metadata: title, description, canonical, Open Graph, Twitter.
 */
export function meta({}: Route.MetaArgs) {
  const title = 'Kafi Tours — Umrah Travel Packages from Ethiopia';
  const description =
    'Kafi Tours arranges Umrah travel packages from Addis Ababa to Makkah and Madinah. Ethiopian Airlines flights, visa assistance, hotel accommodation, and group guidance for Economy, Comfort, and Premium tiers.';
  return [
    { title },
    { name: 'description', content: description },
    { tagName: 'link', rel: 'canonical', href: SITE_URL },
    ...buildOgMeta({ title, description, url: SITE_URL, image: OG_IMAGE }),
  ];
}

/**
 * JSON-LD structured data for a travel agency offering travel services.
 * Uses real business facts from the project (address, phone, social links).
 */
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'TravelAgency',
  name: 'Kafi Tours',
  description:
    'Umrah travel package provider coordinating flights, visa, accommodation, and ground transportation from Addis Ababa, Ethiopia to Makkah and Madinah.',
  url: SITE_URL,
  email: 'info@kafitour.com',
  telephone: ['+251111262965', '+251930737337'],
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Yobek Commercial',
    addressLocality: 'Addis Ababa',
    addressCountry: 'ET',
  },
  areaServed: ['Makkah', 'Madinah', 'Saudi Arabia'],
  knowsAbout: ['Umrah', 'Hajj', 'Travel', 'Visa Assistance'],
  sameAs: [
    'https://t.me/kafitours',
    'https://facebook.com/kafitours',
    'https://instagram.com/kafitours',
  ],
};

export default function Home() {
  return (
    <main id="main-content" className="min-h-screen bg-background py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {/* Preload the LCP image — the Makkah destination card is the largest paint element */}
      <link
        rel="preload"
        as="image"
        href="/hero-mecca-md.webp"
        fetchPriority="high"
      />
      <Hero />
      <Partners />
      <Destinations />
      <Features />
      <Pricing />
      <CTA />
    </main>
  );
}
