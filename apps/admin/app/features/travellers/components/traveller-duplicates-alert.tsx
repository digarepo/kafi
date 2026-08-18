import type { Traveller } from '../../../lib/api.js';

interface TravellerDuplicatesAlertProps {
  matches: Traveller[];
}

export function TravellerDuplicatesAlert({
  matches,
}: TravellerDuplicatesAlertProps) {
  if (matches.length === 0) return null;

  return (
    <div className="rounded-md border border-warning/20 bg-warning/10 p-3 text-sm text-warning">
      <p className="font-medium">Possible duplicate travellers found:</p>
      <ul className="mt-1 list-disc pl-4">
        {matches.map((t) => (
          <li key={t.id}>
            {t.first_name} {t.last_name} — {t.phone_number}
          </li>
        ))}
      </ul>
    </div>
  );
}
