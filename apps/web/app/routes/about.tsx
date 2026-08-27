import { AboutPage } from '@/features/about';

import { type Route } from './+types/about';

/**
 * Route metadata for the about page.
 *
 * @param _args - React Router meta arguments.
 * @returns The page title, description, canonical, and social tags.
 */
export function meta({}: Route.MetaArgs) {
  const title = 'About | Kafi Tours';
  const description =
    'Learn about Kafi Tours — an Ethiopian Umrah operator helping pilgrims plan and navigate Umrah with practical support and thoughtful coordination.';
  const url = 'https://kafitour.com/about';

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

/**
 * Renders the about route.
 *
 * @returns The about page component.
 */
export default function AboutRoute() {
  return <AboutPage />;
}
