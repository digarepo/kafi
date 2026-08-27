import { type Route } from './+types/packages';
import PackagesPage from '@/features/packages/components/packagesPage';
import {
  listPublicPackages,
  type PublicPackageVersion,
} from '@/lib/public-api';
import { selectShowcasePackages } from '@/features/packages/components/live-packages';

/**
 * Server-side loader — fetches published packages during SSR so the card data
 * is present in the initial HTML, eliminating the client-side fetch and loading
 * skeleton flash that was delaying FCP/LCP.
 */
export async function loader(): Promise<{
  packages: PublicPackageVersion[];
}> {
  try {
    const res = await listPublicPackages();
    return { packages: selectShowcasePackages(res.data) };
  } catch {
    return { packages: [] };
  }
}

/**
 * Route metadata for the packages listing page.
 */
export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Umrah Packages | Kafi Tours' },
    {
      name: 'description',
      content:
        'Compare Kafi Tours Umrah packages — Economy, Comfort, and Premium tiers. Flights, visa, accommodation, transport, and guided Umrah from Addis Ababa.',
    },
    {
      tagName: 'link',
      rel: 'canonical',
      href: 'https://kafitour.com/packages',
    },
    { property: 'og:title', content: 'Umrah Packages | Kafi Tours' },
    {
      property: 'og:description',
      content:
        'Compare Kafi Tours Umrah packages — Economy, Comfort, and Premium tiers. Flights, visa, accommodation, transport, and guided Umrah from Addis Ababa.',
    },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: 'https://kafitour.com/packages' },
    { name: 'twitter:card', content: 'summary' },
    { name: 'twitter:title', content: 'Umrah Packages | Kafi Tours' },
    {
      name: 'twitter:description',
      content:
        'Compare Kafi Tours Umrah packages — Economy, Comfort, and Premium tiers.',
    },
  ];
}

export default function ServicesRoute({ loaderData }: Route.ComponentProps) {
  return <PackagesPage packages={loaderData.packages} />;
}
