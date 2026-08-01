import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeftIcon, CheckIcon } from '@phosphor-icons/react';
import { getPublicPackage, type PublicPackageVersion } from '../../../lib/public-api';

export function LivePackageDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [pkg, setPkg] = useState<PublicPackageVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getPublicPackage(slug)
      .then(setPkg)
      .catch((err) => setError(err instanceof Error ? err.message : 'Package not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-24 text-center text-muted-foreground">
        Loading package…
      </div>
    );
  }

  if (error || !pkg) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-24 text-center text-muted-foreground">
        <p>{error ?? 'Package not found'}</p>
        <Link to="/packages" className="text-accent hover:underline">
          Back to packages
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground">
      <section className="border-b border-border/20 bg-linear-to-b from-accent/5 to-background">
        <div className="mx-auto max-w-7xl px-6 pb-12 pt-28 sm:px-8 lg:px-12">
          <Link
            to="/packages"
            className="mb-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-accent"
          >
            <ArrowLeftIcon weight="bold" className="h-4 w-4" />
            All Packages
          </Link>

          <div className="max-w-4xl space-y-5">
            <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              {pkg.version_name}
            </h1>
            <p className="text-sm font-light text-muted-foreground sm:text-base">
              {pkg.package_template?.name} • {pkg.package_category?.name} • {pkg.pilgrimage_type?.name} • {pkg.year}
            </p>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            {pkg.hero_image_url && (
              <img
                src={pkg.hero_image_url}
                alt={pkg.version_name}
                className="h-64 w-full rounded-lg object-cover"
              />
            )}

            <section className="space-y-4">
              <h2 className="font-heading text-2xl font-bold">Overview</h2>
              <div className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-2">
                <p>
                  <span className="font-medium text-foreground">Duration:</span>{' '}
                  {pkg.departure_date && pkg.return_date
                    ? `${pkg.departure_date} to ${pkg.return_date}`
                    : 'TBD'}
                </p>
                <p>
                  <span className="font-medium text-foreground">Capacity:</span>{' '}
                  {pkg.max_capacity ?? 'TBD'}
                </p>
                <p>
                  <span className="font-medium text-foreground">Sales window:</span>{' '}
                  {pkg.sales_start_date && pkg.sales_end_date
                    ? `${pkg.sales_start_date} to ${pkg.sales_end_date}`
                    : 'TBD'}
                </p>
                <p>
                  <span className="font-medium text-foreground">Price:</span>{' '}
                  {pkg.base_price} {pkg.currency?.code}
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="font-heading text-2xl font-bold">Included</h2>
              {pkg.inclusions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No inclusions listed.</p>
              ) : (
                <div className="grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2">
                  {pkg.inclusions
                    .sort((a, b) => a.display_order - b.display_order)
                    .map((inc) => (
                      <div key={inc.id} className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <CheckIcon weight="bold" className="h-3 w-3 text-primary" />
                        </span>
                        <span
                          className={`text-sm font-light leading-relaxed ${
                            inc.is_highlighted ? 'font-medium text-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          {inc.inclusion_text}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6 rounded-lg border border-border/40 bg-card p-6">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">From</p>
              <p className="text-2xl font-bold text-foreground">
                {pkg.base_price} {pkg.currency?.code}
              </p>
            </div>
            <Link to={`/booking?package=${pkg.slug}`}>
              <span className="btn-primary inline-flex h-11 w-full items-center justify-center rounded-xl text-sm">
                Book Now
              </span>
            </Link>
          </aside>
        </div>
      </main>
    </div>
  );
}
