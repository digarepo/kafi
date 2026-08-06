import { Button } from '@kafi/ui';
import { displayDate } from '../lib/date';
import type { TravelGroupDetailCardProps } from '../types/operations.types';

export function TravelGroupDetailCard({
  group,
  onEdit,
  onDelete,
}: TravelGroupDetailCardProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{group.name}</h1>
          <p className="text-muted-foreground">
            {group.group_number} · {group.status?.name ?? 'No status'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onEdit && (
            <Button variant="outline" onClick={() => onEdit()}>
              Edit
            </Button>
          )}
          {onDelete && (
            <Button variant="destructive" onClick={() => onDelete()}>
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border p-3">
          <p className="text-sm text-muted-foreground">Package version</p>
          <p className="font-medium">{group.package_version?.name ?? '-'}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-sm text-muted-foreground">Departure</p>
          <p className="font-medium">{displayDate(group.departure_date)}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-sm text-muted-foreground">Return</p>
          <p className="font-medium">{displayDate(group.return_date)}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-sm text-muted-foreground">Capacity</p>
          <p className="font-medium">
            {group.current_capacity} / {group.maximum_capacity}
          </p>
        </div>
      </div>

      {group.remarks && (
        <div className="rounded-md border p-3">
          <p className="text-sm text-muted-foreground">Remarks</p>
          <p className="text-sm">{group.remarks}</p>
        </div>
      )}
    </div>
  );
}
