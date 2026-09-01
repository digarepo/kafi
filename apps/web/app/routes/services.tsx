import { type Route } from './+types/services';
import ServicesPage from '@/features/services/components/servicesPage';
import { buildOgMeta, SITE_URL } from '@/lib/og';

/**
 * Route metadata for the services listing page.
 */
export function meta({}: Route.MetaArgs) {
  const title = 'Services | Kafi Tours';
  const description =
    'Comprehensive Umrah travel services from Kafi Tours — visa processing, flight ticketing, luxury accommodations near the Haram, ground transport, guided Ziyarah tours, and scholar-led guidance.';
  const url = `${SITE_URL}/services`;
  return [
    { title },
    { name: 'description', content: description },
    { tagName: 'link', rel: 'canonical', href: url },
    ...buildOgMeta({ title, description, url }),
  ];
}

export default function ServicesRoute() {
  return <ServicesPage />;
}
