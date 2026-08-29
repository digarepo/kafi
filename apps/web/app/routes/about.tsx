import { AboutPage } from '@/features/about';

import { type Route } from './+types/about';
import { buildOgMeta } from '@/lib/og';

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
    ...buildOgMeta({ title, description, url }),
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
