import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { ArrowLeftIcon } from '@phosphor-icons/react';

import { type Route } from './+types/service-detail';
import ServiceDetailPage from '@/features/services/components/serviceDetailPage';
import { services } from '@/features/services/data/services';
import { buildOgMeta } from '@/lib/og';

/**
 * Server-side loader — validates that the slug resolves to a known service.
 * Throws a 404 Response for unknown slugs so the error boundary can render
 * a proper not-found page. The component imports the static services data
 * directly to avoid typegen issues with the Phosphor Icon type.
 */
export async function loader({
  params,
}: Route.LoaderArgs): Promise<{ slug: string }> {
  const slug = params.slug;
  if (!slug) throw new Response('Service not found', { status: 404 });

  const service = services.find((item) => item.slug === slug);
  if (!service) throw new Response('Service not found', { status: 404 });

  return { slug };
}

/**
 * Route metadata — dynamic title, description, canonical, and social tags
 * derived from the service data.
 */
export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) {
    return [
      { title: 'Service Not Found | Kafi Tours' },
      {
        name: 'description',
        content: 'The requested service could not be found.',
      },
    ];
  }

  const service = services.find((item) => item.slug === loaderData.slug);
  if (!service) {
    return [
      { title: 'Service Not Found | Kafi Tours' },
      {
        name: 'description',
        content: 'The requested service could not be found.',
      },
    ];
  }

  const title = `${service.name} | Kafi Tours`;
  const description = `${service.tagline}. ${service.description}`;
  const url = `https://kafitour.com/services/${service.slug}`;

  return [
    { title },
    { name: 'description', content: description },
    { tagName: 'link', rel: 'canonical', href: url },
    ...buildOgMeta({ title, description, url }),
  ];
}

/**
 * Route-level error boundary — handles 404s (service not found).
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
          Service not found
        </h1>
        <p className="mt-3 max-w-md text-sm font-light text-muted-foreground">
          The service you're looking for may have been removed or is no longer
          available.
        </p>
        <Link
          to="/services"
          className="mt-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent transition-colors hover:underline"
        >
          <ArrowLeftIcon weight="bold" className="h-4 w-4" />
          All Services
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
        We couldn't load this service. Please try again later.
      </p>
      <Link
        to="/services"
        className="mt-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent transition-colors hover:underline"
      >
        <ArrowLeftIcon weight="bold" className="h-4 w-4" />
        All Services
      </Link>
    </main>
  );
}

export default function ServiceDetailRoute({
  loaderData,
}: Route.ComponentProps) {
  return <ServiceDetailPage slug={loaderData.slug} />;
}
