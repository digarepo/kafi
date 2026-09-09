import { Card, CardContent, CardHeader, CardTitle } from '@kafi/ui';
import type { TravelerItineraryDocument } from '../../../lib/api.js';
import {
  displayValue,
  DocumentField,
  DocumentSection,
  DocumentStatus,
  DocumentWarnings,
  formatDocumentDate,
  formatDocumentDateTime,
} from './document-shell';

export function TravelerItineraryDocumentView({
  document,
}: {
  document: TravelerItineraryDocument;
}) {
  return (
    <div className="traveler-itinerary-document mt-3 space-y-2.5">
      <DocumentWarnings warnings={document.warnings} />

      <DocumentSection title="Traveler">
        <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-3">
          <DocumentField label="Name" value={document.traveler.name} />
          <DocumentField
            label="Registration"
            value={document.registration.number}
          />
          <DocumentField
            label="Traveler number"
            value={document.traveler.traveler_number}
          />
          <DocumentField label="Phone" value={document.traveler.phone_number} />
          <DocumentField
            label="Status"
            value={<DocumentStatus value={document.registration.status} />}
          />
        </dl>
      </DocumentSection>

      <DocumentSection title="Flight and ticket">
        {document.flight ? (
          <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-3">
            <DocumentField label="PNR" value={document.flight.pnr} />
            <DocumentField
              label="Booking number"
              value={document.flight.booking_number}
            />
            <DocumentField
              label="Outbound flight"
              value={document.flight.departure_flight_number}
            />
            <DocumentField
              label="Outbound date"
              value={formatDocumentDate(document.flight.departure_date)}
            />
            <DocumentField
              label="Return flight"
              value={document.flight.return_flight_number}
            />
            <DocumentField
              label="Return date"
              value={formatDocumentDate(document.flight.return_date)}
            />
          </dl>
        ) : (
          <p className="text-[11pt] text-muted-foreground">
            No confirmed flight booking.
          </p>
        )}
      </DocumentSection>

      <DocumentSection title="Visa">
        {document.visa ? (
          <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-3">
            <DocumentField
              label="Visa number"
              value={document.visa.visa_number}
            />
            <DocumentField
              label="Application number"
              value={document.visa.application_number}
            />
            <DocumentField label="Status" value={document.visa.status} />
            <DocumentField
              label="Expiry date"
              value={formatDocumentDate(document.visa.expiry_date)}
            />
          </dl>
        ) : (
          <p className="text-[11pt] text-muted-foreground">
            No visa application recorded.
          </p>
        )}
      </DocumentSection>

      <DocumentSection title="Accommodation">
        {document.stays.length === 0 ? (
          <p className="text-[11pt] text-muted-foreground">
            No hotel stays recorded.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {document.stays.map((stay, index) => (
              <Card
                key={`${stay.city ?? 'stay'}-${index}`}
                className="shadow-none"
              >
                <CardHeader className="pb-1">
                  <CardTitle className="text-[12.5pt]">
                    {displayValue(stay.city)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                    <DocumentField label="Hotel" value={stay.hotel} />
                    <DocumentField label="Room" value={stay.room_number} />
                    <DocumentField
                      label="Check-in"
                      value={formatDocumentDate(stay.check_in_date)}
                    />
                    <DocumentField
                      label="Check-out"
                      value={formatDocumentDate(stay.check_out_date)}
                    />
                  </dl>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DocumentSection>

      <DocumentSection title="Ground transport">
        {document.transport.length === 0 ? (
          <p className="text-[11pt] text-muted-foreground">
            No ground transport recorded.
          </p>
        ) : (
          <div className="space-y-1.5">
            {document.transport.map((segment, index) => (
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
      </DocumentSection>
    </div>
  );
}
