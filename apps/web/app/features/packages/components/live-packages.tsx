import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Card, Button } from '@kafi/ui';
import { listPublicPackages, type PublicPackageVersion, type PublicPackageFilters } from '../../../lib/public-api';

export function LivePackages() {
  const [packages, setPackages] = useState<PublicPackageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<PublicPackageFilters>({});

  useEffect(() => {
    setLoading(true);
    listPublicPackages(filters)
      .then((res) => setPackages(res.data))
      .finally(() => setLoading(false));
  }, [filters]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search"
          className="h-9 rounded border px-3 text-sm"
          value={filters.search ?? ''}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <input
          type="text"
          placeholder="Category"
          className="h-9 rounded border px-3 text-sm"
          value={filters.category ?? ''}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        />
        <input
          type="text"
          placeholder="Pilgrimage type"
          className="h-9 rounded border px-3 text-sm"
          value={filters.pilgrimageType ?? ''}
          onChange={(e) => setFilters({ ...filters, pilgrimageType: e.target.value })}
        />
        <input
          type="text"
          placeholder="Year"
          className="h-9 rounded border px-3 text-sm"
          value={filters.year ?? ''}
          onChange={(e) => setFilters({ ...filters, year: e.target.value })}
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading packages…</p>
      ) : packages.length === 0 ? (
        <p className="text-sm text-muted-foreground">No packages available.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <Card key={pkg.id} className="flex flex-col overflow-hidden border border-border/40 p-0">
              {pkg.hero_image_url ? (
                <img
                  src={pkg.hero_image_url}
                  alt={pkg.version_name}
                  className="h-40 w-full object-cover"
                />
              ) : (
                <div className="h-40 w-full bg-muted" />
              )}
              <div className="space-y-3 p-5">
                <div>
                  <h3 className="font-heading text-lg font-bold">{pkg.version_name}</h3>
                  <p className="text-xs text-muted-foreground">{pkg.package_template?.name}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {pkg.package_category?.name} • {pkg.pilgrimage_type?.name} • {pkg.year}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold">
                    {pkg.base_price} {pkg.currency?.code}
                  </span>
                </div>
                {pkg.inclusions.length > 0 && (
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {pkg.inclusions
                      .filter((inc) => inc.is_highlighted)
                      .slice(0, 4)
                      .map((inc) => (
                        <li key={inc.id} className="flex gap-2">
                          <span>•</span>
                          <span>{inc.inclusion_text}</span>
                        </li>
                      ))}
                  </ul>
                )}
                <Link to={`/packages/${pkg.slug}`} className="mt-auto block">
                  <Button variant="outline" className="w-full">
                    View details
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
