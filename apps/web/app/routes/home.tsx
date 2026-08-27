import type { Route } from './+types/home';
import { Hero } from '@/features/home/components/Hero';
import {
  CTA,
  Destinations,
  Features,
  Partners,
  Pricing,
} from '@/features/home/components/Features';

const SITE_URL = 'https://kafitour.com';
const OG_IMAGE = `${SITE_URL}/hero-mecca.webp`;

/**
 * Home page SEO metadata: title, description, canonical, Open Graph, Twitter.
 */
export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Kafi Tours — Umrah Pilgrimage Packages from Ethiopia' },
    {
      name: 'description',
      content:
        'Kafi Tours arranges Umrah pilgrimage packages from Addis Ababa to Makkah and Madinah. Ethiopian Airlines flights, visa assistance, hotel accommodation, and group guidance for Economy, Comfort, and Premium tiers.',
    },
    { tagName: 'link', rel: 'canonical', href: SITE_URL },
    // Open Graph
    { property: 'og:type', content: 'website' },
    {
      property: 'og:title',
      content: 'Kafi Tours — Umrah Pilgrimage Packages from Ethiopia',
    },
    {
      property: 'og:description',
      content:
        'Umrah pilgrimage packages from Addis Ababa. Ethiopian Airlines flights, visa assistance, and hotel accommodation near the Haram.',
    },
    { property: 'og:url', content: SITE_URL },
    { property: 'og:site_name', content: 'Kafi Tours' },
    { property: 'og:image', content: OG_IMAGE },
    {
      property: 'og:image:alt',
      content: 'Makkah Al-Mukarramah with the Masjid al-Haram',
    },
    { property: 'og:locale', content: 'en_US' },
    // Twitter
    { name: 'twitter:card', content: 'summary_large_image' },
    {
      name: 'twitter:title',
      content: 'Kafi Tours — Umrah Pilgrimage Packages from Ethiopia',
    },
    {
      name: 'twitter:description',
      content:
        'Umrah pilgrimage packages from Addis Ababa. Ethiopian Airlines flights, visa assistance, and hotel accommodation near the Haram.',
    },
    { name: 'twitter:image', content: OG_IMAGE },
  ];
}

/**
 * JSON-LD structured data for a travel agency offering pilgrimage services.
 * Uses real business facts from the project (address, phone, social links).
 */
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'TravelAgency',
  name: 'Kafi Tours',
  description:
    'Umrah pilgrimage package provider coordinating flights, visa, accommodation, and ground transportation from Addis Ababa, Ethiopia to Makkah and Madinah.',
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
  knowsAbout: ['Umrah', 'Hajj', 'Pilgrimage Travel', 'Visa Assistance'],
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
