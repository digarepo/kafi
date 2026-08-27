import { type Route } from './+types/services';
import ServicesPage from '@/features/services/components/servicesPage';

/**
 * Route metadata for the services listing page.
 */
export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Services | Kafi Tours' },
    {
      name: 'description',
      content:
        'Comprehensive Umrah pilgrimage services from Kafi Tours — visa processing, flight ticketing, luxury accommodations near the Haram, ground transport, guided Ziyarah tours, and scholar-led guidance.',
    },
    {
      tagName: 'link',
      rel: 'canonical',
      href: 'https://kafitour.com/services',
    },
    { property: 'og:title', content: 'Services | Kafi Tours' },
    {
      property: 'og:description',
      content:
        'Comprehensive Umrah pilgrimage services — visa processing, flights, accommodations, ground transport, guided Ziyarah tours, and scholar-led guidance.',
    },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: 'https://kafitour.com/services' },
    { name: 'twitter:card', content: 'summary' },
    { name: 'twitter:title', content: 'Services | Kafi Tours' },
    {
      name: 'twitter:description',
      content:
        'Comprehensive Umrah pilgrimage services — visa, flights, accommodations, transport, guided tours, and scholar-led guidance.',
    },
  ];
}

export default function ServicesRoute() {
  return <ServicesPage />;
}
