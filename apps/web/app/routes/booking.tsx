import type { Route } from './+types/booking';
import { BookingPage } from '@/features/booking';
import { packages } from '@/features/packages/data/packages';
import { buildOgMeta } from '@/lib/og';

export function meta({}: Route.MetaArgs) {
  const title = 'Booking Request | Kafi Tours';
  const description =
    'Submit a booking request for your Umrah journey. A Kafi travel coordinator will confirm availability and guide you through the next steps.';
  const url = 'https://kafitour.com/booking';

  return [
    { title },
    { name: 'description', content: description },
    { tagName: 'link', rel: 'canonical', href: url },
    ...buildOgMeta({ title, description, url }),
  ];
}

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const packageParam = url.searchParams.get('package');
  const prefilledPackage = packageParam
    ? packages.find(
        (pkg) => pkg.slug === packageParam || pkg.id === packageParam,
      )
    : undefined;

  return {
    defaultPackage: prefilledPackage?.slug,
    prefilledPackageName: prefilledPackage?.name,
  };
}

export default function BookingRoute({ loaderData }: Route.ComponentProps) {
  return (
    <BookingPage
      defaultPackage={loaderData.defaultPackage}
      prefilledPackageName={loaderData.prefilledPackageName}
    />
  );
}
