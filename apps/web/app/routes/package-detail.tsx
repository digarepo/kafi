import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { ArrowLeftIcon } from '@phosphor-icons/react';

import { type Route } from './+types/package-detail';
import { LivePackageDetail } from '@/features/packages/components/live-package-detail';
import {
  getPublicPackage,
  listPublicPackages,
  type PublicPackageVersion,
} from '@/lib/public-api';

/**
 * Server-side loader — fetches the package and all published packages during
 * SSR so the full detail page is present in the initial HTML. This eliminates
 * the client-side fetch, loading skeleton flash, and CLS that were dragging
 * down FCP/LCP and Performance.
 *
 * Variants (other seasons of the same tier) and related packages (other tiers)
 * are computed server-side and passed to the component as props.
 */
export async function loader({ params }: Route.LoaderArgs): Promise<{
  pkg: PublicPackageVersion;
  variants: PublicPackageVersion[];
  related: PublicPackageVersion[];
}> {
  const slug = params.slug;
  if (!slug) throw new Response('Package not found', { status: 404 });

  let current: PublicPackageVersion;
  try {
    current = await getPublicPackage(slug);
  } catch {
    throw new Response('Package not found', { status: 404 });
  }

  const all = await listPublicPackages();

  const templateId = current.package_template?.id;

  // Variants = other published versions of the same template (same tier,
  // different seasons/departures). Sorted by departure date ascending.
  const variants = all.data
    .filter(
      (p) => p.package_template?.id === templateId && p.slug !== current.slug,
    )
    .sort((a, b) => {
      const da = a.departure_date
        ? new Date(a.departure_date).getTime()
        : Infinity;
      const db = b.departure_date
        ? new Date(b.departure_date).getTime()
        : Infinity;
      return da - db;
    });

  // Related = one version per *other* tier, picking the next upcoming.
  // This keeps the "Other journeys" section showing the other tiers,
  // not duplicate seasons of the current tier.
  const otherTiers = all.data.filter(
    (p) => p.package_template?.id !== templateId,
  );
  const groups = new Map<string, PublicPackageVersion[]>();
  for (const v of otherTiers) {
    const key = v.package_template?.id ?? v.id;
    const list = groups.get(key);
    if (list) list.push(v);
    else groups.set(key, [v]);
  }
  const now = new Date();
  const showcase: PublicPackageVersion[] = [];
  for (const versions of groups.values()) {
    const withDates = versions
      .filter((v) => v.departure_date)
      .map((v) => ({ v, d: new Date(v.departure_date!) }));
    const upcoming = withDates
      .filter((x) => x.d >= now)
      .sort((a, b) => a.d.getTime() - b.d.getTime());
    if (upcoming.length > 0) showcase.push(upcoming[0]!.v);
    else {
      const past = withDates.sort((a, b) => b.d.getTime() - a.d.getTime());
      if (past.length > 0) showcase.push(past[0]!.v);
      else showcase.push(versions[0]!);
    }
  }

  return { pkg: current, variants, related: showcase.slice(0, 2) };
}

/**
 * Derives a concise display name from the package template name.
 */
function tierName(pkg: PublicPackageVersion): string {
  const template = pkg.package_template?.name ?? pkg.version_name;
  return template.split(' ')[0] ?? pkg.version_name;
}

/**
 * Route metadata — dynamic title, description, canonical, and social tags
 * derived from the package data loaded by the loader.
 */
export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) {
    return [
      { title: 'Package Not Found | Kafi Tours' },
      {
        name: 'description',
        content: 'The requested Umrah package could not be found.',
      },
    ];
  }

  const { pkg } = loaderData;
  const name = tierName(pkg);
  const season = pkg.season?.name ?? String(pkg.year);
  const price = new Intl.NumberFormat('en-US').format(pkg.base_price);
  const currency = pkg.currency?.code ?? '';
  const title = `${name} Umrah ${season} | Kafi Tours`;
  const description = `${name} Umrah package for ${season}. ${currency} ${price} per traveler. Flights, visa, accommodation, and guided Umrah from Addis Ababa.`;
  const url = `https://kafitour.com/packages/${pkg.slug}`;

  return [
    { title },
    { name: 'description', content: description },
    { tagName: 'link', rel: 'canonical', href: url },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:type', content: 'product' },
    { property: 'og:url', content: url },
    { name: 'twitter:card', content: 'summary' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
  ];
}

/**
 * Route-level error boundary — handles 404s (package not found) and other
 * loader errors without rendering the client-side error state.
 */
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <main
        id="main-content"
        className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center px-6 py-24 text-center sm:px-8 lg:px-12"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-accent">
          404
        </p>
        <h1 className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Package not found
        </h1>
        <p className="mt-3 max-w-md text-sm font-light text-muted-foreground">
          The package you're looking for may have been removed or is no longer
          available.
        </p>
        <Link
          to="/packages"
          className="mt-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent transition-colors hover:underline"
        >
          <ArrowLeftIcon weight="bold" className="h-4 w-4" />
          All Packages
        </Link>
      </main>
    );
  }

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center px-6 py-24 text-center sm:px-8 lg:px-12"
    >
      <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
        Something went wrong
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        We couldn't load this package. Please try again later.
      </p>
      <Link
        to="/packages"
        className="mt-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent transition-colors hover:underline"
      >
        <ArrowLeftIcon weight="bold" className="h-4 w-4" />
        All Packages
      </Link>
    </main>
  );
}

export default function PackageDetailRoute({
  loaderData,
}: Route.ComponentProps) {
  return (
    <LivePackageDetail
      pkg={loaderData.pkg}
      variants={loaderData.variants}
      related={loaderData.related}
    />
  );
}
