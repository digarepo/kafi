import { Card, CardContent, CardHeader, CardTitle } from '@kafi/ui';
import type { GuideManifestDocument } from '../../../lib/api.js';
import {
  displayValue,
  DocumentField,
  DocumentSection,
  DocumentWarnings,
  formatDocumentDate,
  formatDocumentDateTime,
} from './document-shell';

function roomLabel(rooms: GuideManifestDocument['travelers'][number]['rooms']) {
  if (rooms.length === 0) return 'Not assigned';
  return rooms
    .map(
      (room) => `${displayValue(room.city)}: ${displayValue(room.room_number)}`,
    )
    .join(' · ');
}

export function GuideManifestDocumentView({
  document,
}: {
  document: GuideManifestDocument;
}) {
  return (
    <div className="mt-3 space-y-3">
      <DocumentWarnings warnings={document.warnings} />

      <DocumentSection title="Travel group">
        <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-6">
          <DocumentField label="Group name" value={document.group.name} />
          <DocumentField label="Group number" value={document.group.number} />
          <DocumentField
            label="Round"
            value={document.group.round_name ?? document.group.round_number}
          />
          <DocumentField label="Package" value={document.group.package_name} />
          <DocumentField
            label="Departure"
            value={formatDocumentDate(document.group.departure_date)}
          />
          <DocumentField
            label="Return"
            value={formatDocumentDate(document.group.return_date)}
          />
        </dl>
      </DocumentSection>

      <DocumentSection title="Group schedule">
        <div className="grid gap-3 lg:grid-cols-2">
          <Card className="print-schedule-card shadow-none drop-shadow-none">
            <CardHeader className="pb-1">
              <CardTitle className="text-[12.5pt]">Accommodation</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {document.schedule.stays.length === 0 ? (
                <p className="text-[11pt] text-muted-foreground">
                  No hotel stays recorded.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {document.schedule.stays.map((stay, index) => (
                    <div
                      key={`${stay.city ?? 'stay'}-${index}`}
                      className="border-b pb-1.5 last:border-0 last:pb-0"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-[11pt] font-medium">
                          {displayValue(stay.city)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDocumentDate(stay.check_in_date)} →{' '}
                          {formatDocumentDate(stay.check_out_date)}
                        </p>
                      </div>
                      <p className="mt-0.5 text-[11pt] text-muted-foreground">
                        {displayValue(stay.hotel)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="print-schedule-card shadow-none drop-shadow-none">
            <CardHeader className="pb-1">
              <CardTitle className="text-[12.5pt]">Ground transport</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {document.schedule.transport.length === 0 ? (
                <p className="text-[11pt] text-muted-foreground">
                  No ground transport recorded.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {document.schedule.transport.map((segment, index) => (
                    <div
                      key={`${segment.origin}-${segment.destination}-${index}`}
                      className="border-b pb-1.5 last:border-0 last:pb-0"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-[11pt] font-medium">
                          {segment.origin} → {segment.destination}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDocumentDateTime(segment.departure_datetime)}
                        </p>
                      </div>
                      <p className="mt-0.5 text-[11pt] text-muted-foreground">
                        {displayValue(segment.vehicle_type)} ·{' '}
                        {displayValue(segment.vehicle_plate_number)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DocumentSection>

      <DocumentSection
        title={`Traveler manifest · ${document.travelers.length}`}
        className="document-manifest-section"
      >
        <div className="document-table-wrap w-full overflow-hidden rounded-lg border">
          <table className="document-manifest-table w-full table-fixed text-left text-[11pt]">
            <colgroup>
              <col style={{ width: '5%' }} />
              <col style={{ width: '27%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '20%' }} />
            </colgroup>
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-2 py-1 font-medium">#</th>
                <th className="px-2 py-1 font-medium">Traveler</th>
                <th className="px-2 py-1 font-medium">Phone</th>
                <th className="px-2 py-1 font-medium">Visa number</th>
                <th className="px-2 py-1 font-medium">Rooms</th>
                <th className="document-emergency-cell px-2 py-1 font-medium">
                  Emergency contact
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {document.travelers.map((traveler, index) => (
                <tr
                  key={`${traveler.registration_number ?? traveler.name}-${index}`}
                >
                  <td className="px-2 py-1.5 align-top break-words text-muted-foreground">
                    {index + 1}
                  </td>
                  <td className="px-2 py-1.5 align-top break-words font-medium">
                    {traveler.name}
                  </td>
                  <td className="px-2 py-1.5 align-top break-words">
                    {displayValue(traveler.phone_number)}
                  </td>
                  <td className="px-2 py-1.5 align-top break-words">
                    {displayValue(traveler.visa_number)}
                  </td>
                  <td className="px-2 py-1.5 align-top break-words">
                    {roomLabel(traveler.rooms)}
                  </td>
                  <td className="document-emergency-cell px-2 py-1.5 align-top break-words">
                    {traveler.emergency_contact ? (
                      <>
                        <p className="break-words">
                          {traveler.emergency_contact.name}
                        </p>
                        <p className="break-words text-xs text-muted-foreground">
                          {traveler.emergency_contact.phone_number}
                        </p>
                      </>
                    ) : (
                      'Not recorded'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DocumentSection>
    </div>
  );
}
