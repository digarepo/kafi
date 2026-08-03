import { Button } from '@kafi/ui';

import type { PackageTemplate, PackageVersion } from '../../../lib/api.js';
import { displayDate } from '../lib/date';

interface PackageDetailPanelProps {
  template?: PackageTemplate | null;
  version?: PackageVersion | null;
  onClose: () => void;
}

export function PackageDetailPanel({
  template,
  version,
  onClose,
}: PackageDetailPanelProps) {
  if (!template && !version) return null;

  return (
    <div className="space-y-2 rounded border bg-muted/30 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Details</h2>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>

      {template && (
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">Code</dt>
          <dd>{template.package_template_code}</dd>
          <dt className="text-muted-foreground">Name</dt>
          <dd>{template.name}</dd>
          <dt className="text-muted-foreground">Short name</dt>
          <dd>{template.short_name ?? '-'}</dd>
          <dt className="text-muted-foreground">Category</dt>
          <dd>{template.package_category?.name ?? '-'}</dd>
          <dt className="text-muted-foreground">Pilgrimage type</dt>
          <dd>{template.pilgrimage_type?.name ?? '-'}</dd>
          <dt className="text-muted-foreground">Duration</dt>
          <dd>{template.default_duration_days}d</dd>
          <dt className="text-muted-foreground">Description</dt>
          <dd>{template.description ?? '-'}</dd>
        </dl>
      )}

      {version && (
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">Code</dt>
          <dd>{version.package_version_code}</dd>
          <dt className="text-muted-foreground">Name</dt>
          <dd>{version.version_name}</dd>
          <dt className="text-muted-foreground">Template</dt>
          <dd>{version.package_template?.name ?? '-'}</dd>
          <dt className="text-muted-foreground">Slug</dt>
          <dd>{version.slug}</dd>
          <dt className="text-muted-foreground">Status</dt>
          <dd>{version.status_name}</dd>
          <dt className="text-muted-foreground">Year</dt>
          <dd>{version.year}</dd>
          <dt className="text-muted-foreground">Departure</dt>
          <dd>{displayDate(version.departure_date)}</dd>
          <dt className="text-muted-foreground">Return</dt>
          <dd>{displayDate(version.return_date)}</dd>
          <dt className="text-muted-foreground">Sales start</dt>
          <dd>{displayDate(version.sales_start_date)}</dd>
          <dt className="text-muted-foreground">Sales end</dt>
          <dd>{displayDate(version.sales_end_date)}</dd>
          <dt className="text-muted-foreground">Base price</dt>
          <dd>{version.base_price}</dd>
          <dt className="text-muted-foreground">Currency</dt>
          <dd>{version.currency?.code ?? '-'}</dd>
          <dt className="text-muted-foreground">Max capacity</dt>
          <dd>{version.max_capacity ?? '-'}</dd>
          <dt className="text-muted-foreground">Season</dt>
          <dd>{version.season?.name ?? '-'}</dd>
          <dt className="text-muted-foreground">Inclusions</dt>
          <dd>
            {version.inclusions.length ? (
              <ul className="list-disc pl-4">
                {version.inclusions.map((inc) => (
                  <li key={inc.id}>{inc.inclusion_text}</li>
                ))}
              </ul>
            ) : (
              '-'
            )}
          </dd>
        </dl>
      )}
    </div>
  );
}
