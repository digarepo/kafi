import { type Route } from './+types/packages';
import PackagesPage from '@/features/packages/components/packagesPage';
import {
  listPublicPackages,
  type PublicPackageVersion,
} from '@/lib/public-api';
import { selectShowcasePackages } from '@/features/packages/components/live-packages';
import { buildOgMeta, SITE_URL } from '@/lib/og';

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
  const title = 'Umrah Packages | Kafi Tours';
  const description =
    'Compare Kafi Tours Umrah packages — Economy, Comfort, and Premium tiers. Flights, visa, accommodation, transport, and guided Umrah from Addis Ababa.';
  const url = `${SITE_URL}/packages`;
  return [
    { title },
    { name: 'description', content: description },
    { tagName: 'link', rel: 'canonical', href: url },
    ...buildOgMeta({ title, description, url }),
  ];
}

export default function ServicesRoute({ loaderData }: Route.ComponentProps) {
  return <PackagesPage packages={loaderData.packages} />;
}
