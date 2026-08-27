import { Link } from 'react-router';
import type { Traveller } from '../../../lib/api.js';
import { formatPhone } from '../../../shared/format';

interface TravellerDuplicatesAlertProps {
  matches: Traveller[];
}

export function TravellerDuplicatesAlert({
  matches,
}: TravellerDuplicatesAlertProps) {
  if (matches.length === 0) return null;

  return (
    <div className="rounded-md border border-warning/30 bg-warning/10 p-4 text-sm">
      <p className="font-medium text-warning">
        Possible duplicate traveller{matches.length > 1 ? 's' : ''} found
      </p>
      <p className="mt-1 text-muted-foreground">
        A traveller with this name and phone already exists. Use the existing
        record instead of creating a duplicate.
      </p>
      <ul className="mt-2 space-y-1">
        {matches.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-2">
            <span>
              {t.first_name} {t.last_name} — {formatPhone(t.phone_number)}
              {t.traveller_number && (
                <span className="text-muted-foreground">
                  {' '}
                  ({t.traveller_number})
                </span>
              )}
              {t.is_deleted && (
                <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                  Archived
                </span>
              )}
            </span>
            <Link
              to={`/travellers/${t.id}`}
              className="shrink-0 font-medium text-warning underline-offset-4 hover:underline"
            >
              View record
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
