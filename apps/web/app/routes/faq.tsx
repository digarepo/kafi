import type { Route } from './+types/faq';
import FaqPage from '@/features/faq/components/faq-page';

export function meta({}: Route.MetaArgs) {
  const title = 'FAQ | Kafi Tours';
  const description =
    'Find answers to common questions about Kafi Tours Umrah packages, visas, flights, accommodation, and the pilgrimage journey.';
  const url = 'https://kafitour.com/faq';

  return [
    { title },
    { name: 'description', content: description },
    { tagName: 'link', rel: 'canonical', href: url },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: url },
    { name: 'twitter:card', content: 'summary' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
  ];
}

export default function FaqRoute() {
  return <FaqPage />;
}
