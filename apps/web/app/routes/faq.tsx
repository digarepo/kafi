import type { Route } from './+types/faq';
import FaqPage from '@/features/faq/components/faq-page';
import { buildOgMeta } from '@/lib/og';

export function meta({}: Route.MetaArgs) {
  const title = 'FAQ | Kafi Tours';
  const description =
    'Find answers to common questions about Kafi Tours Umrah packages, visas, flights, accommodation, and the pilgrimage journey.';
  const url = 'https://kafitour.com/faq';

  return [
    { title },
    { name: 'description', content: description },
    { tagName: 'link', rel: 'canonical', href: url },
    ...buildOgMeta({ title, description, url }),
  ];
}

export default function FaqRoute() {
  return <FaqPage />;
}
