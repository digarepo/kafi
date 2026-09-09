import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '@kafi/database';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import { TravelGroupOperationalSummaryService } from '../../../operations/application/services/travel-group-operational-summary.service.js';
import { RegistrationOperationalSummaryService } from '../../../travellers/application/services/registration-operational-summary.service.js';

export interface TravelDocumentWarning {
  code: string;
  message: string;
}

export interface TravelerItineraryDocument {
  generated_at: string;
  registration: {
    id: string;
    number: string;
    status: string;
  };
  traveler: {
    id: string;
    name: string;
    traveler_number: string;
    phone_number: string;
  };
  group: {
    id: string;
    number: string;
    name: string;
    package_name: string | null;
    round_name: string | null;
    round_number: number | null;
    departure_date: string | null;
    return_date: string | null;
  } | null;
  flight: {
    booking_number: string;
    pnr: string;
    departure_flight_number: string;
    departure_date: string | null;
    return_flight_number: string | null;
    return_date: string | null;
  } | null;
  visa: {
    application_number: string;
    visa_number: string | null;
    status: string | null;
    expiry_date: string | null;
  } | null;
  stays: Array<{
    city: string | null;
    hotel: string | null;
    check_in_date: string | null;
    check_out_date: string | null;
    room_number: string | null;
    room_type: string | null;
  }>;
  transport: Array<{
    departure_datetime: string | null;
    arrival_datetime: string | null;
    origin: string;
    destination: string;
    vehicle_type: string | null;
    vehicle_plate_number: string | null;
  }>;
  warnings: TravelDocumentWarning[];
}

export interface GuideManifestDocument {
  generated_at: string;
  group: {
    id: string;
    number: string;
    name: string;
    package_name: string | null;
    round_name: string | null;
    round_number: number | null;
    departure_date: string | null;
    return_date: string | null;
    status: string | null;
  };
  schedule: {
    stays: Array<{
      city: string | null;
      hotel: string | null;
      check_in_date: string | null;
      check_out_date: string | null;
    }>;
    transport: Array<{
      departure_datetime: string | null;
      arrival_datetime: string | null;
      origin: string;
      destination: string;
      vehicle_type: string | null;
      vehicle_plate_number: string | null;
    }>;
  };
  travelers: Array<{
    registration_number: string | null;
    name: string;
    phone_number: string;
    visa_number: string | null;
    rooms: Array<{
      city: string | null;
      room_number: string | null;
    }>;
    emergency_contact: {
      name: string;
      phone_number: string;
    } | null;
  }>;
  warnings: TravelDocumentWarning[];
}

function asDateString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 19);
  return value.toISOString();
}

function fullName(value: {
  first_name: string;
  middle_name?: string | null;
  last_name: string;
}): string {
  return [value.first_name, value.middle_name, value.last_name]
    .filter(Boolean)
    .join(' ');
}

@Injectable()
export class TravelDocumentsService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
    private readonly registrationSummary: RegistrationOperationalSummaryService,
    private readonly groupSummary: TravelGroupOperationalSummaryService,
  ) {}

  async getTravelerItinerary(
    registrationId: string,
  ): Promise<TravelerItineraryDocument> {
    const summary =
      await this.registrationSummary.getOperationalSummary(registrationId);
    const traveler = summary.traveller;
    if (!traveler) throw new NotFoundException('Traveller not found');

    const groupId = summary.group_membership?.travel_group_id ?? null;
    const group = groupId
      ? await this.groupSummary.getOperationalSummary(groupId, false)
      : null;
    const round = group?.package_version?.id
      ? await this.getRoundForPackage(group.package_version.id)
      : null;
    const visa = await this.getLatestVisa(registrationId);
    const flight =
      [...summary.flights]
        .reverse()
        .find((item) => item.status?.code === 'CONFIRMED') ?? null;

    const membershipId = summary.group_membership?.id;
    const stays = (group?.logistics.hotel_stays ?? []).map((stay) => {
      const room = group?.logistics.room_assignments.find(
        (assignment) =>
          assignment.group_membership_id === membershipId &&
          assignment.group_hotel_stay?.id === stay.id &&
          assignment.status?.code === 'ASSIGNED',
      );
      return {
        city: stay.city?.name ?? null,
        hotel: stay.hotel_name ?? stay.hotel?.name ?? null,
        check_in_date: asDateString(stay.check_in_date),
        check_out_date: asDateString(stay.check_out_date),
        room_number: room?.room_number ?? null,
        room_type: room?.room_type?.name ?? null,
      };
    });

    const transport = (group?.logistics.transport_segments ?? []).map(
      (segment) => ({
        departure_datetime: asDateString(segment.departure_datetime),
        arrival_datetime: asDateString(segment.arrival_datetime),
        origin: segment.origin_location,
        destination: segment.destination_location,
        vehicle_type: segment.vehicle_type?.name ?? segment.transport_type,
        vehicle_plate_number: segment.vehicle_plate_number,
      }),
    );

    const warnings = this.buildTravelerWarnings({
      group,
      visa,
      flight,
      stays,
      transport,
    });

    return {
      generated_at: new Date().toISOString(),
      registration: {
        id: summary.id,
        number: summary.registration_number,
        status: summary.status_name,
      },
      traveler: {
        id: traveler.id,
        name: traveler.full_name,
        traveler_number: traveler.traveller_number,
        phone_number: traveler.phone_number,
      },
      group: group
        ? {
            id: group.id,
            number: group.group_number,
            name: group.name,
            package_name: group.package_version?.name ?? null,
            round_name: round?.name ?? null,
            round_number: round?.round_number ?? null,
            departure_date: asDateString(group.departure_date),
            return_date: asDateString(group.return_date),
          }
        : null,
      flight: flight
        ? {
            booking_number: flight.booking_number,
            pnr: flight.pnr,
            departure_flight_number: flight.departure_flight_number,
            departure_date: asDateString(flight.departure_date),
            return_flight_number: flight.return_flight_number,
            return_date: asDateString(flight.return_date),
          }
        : null,
      visa: visa
        ? {
            application_number: visa.application_number,
            visa_number: visa.visa_number,
            status: visa.status,
            expiry_date: asDateString(visa.expiry_date),
          }
        : null,
      stays,
      transport,
      warnings,
    };
  }

  async getGuideManifest(groupId: string): Promise<GuideManifestDocument> {
    const group = await this.groupSummary.getOperationalSummary(groupId, false);
    const activeMembers = group.members.filter(
      (member) => member.status_code === 'ACTIVE' && member.registration_id,
    );
    const registrationIds = activeMembers.map(
      (member) => member.registration_id,
    );
    const travelerIds = activeMembers
      .map((member) => member.traveller?.id)
      .filter((id): id is string => Boolean(id));

    const [visas, emergencyContacts] = await Promise.all([
      this.getLatestVisas(registrationIds),
      this.getEmergencyContacts(travelerIds),
    ]);

    const stays = group.logistics.hotel_stays.map((stay) => ({
      city: stay.city?.name ?? null,
      hotel: stay.hotel_name ?? stay.hotel?.name ?? null,
      check_in_date: asDateString(stay.check_in_date),
      check_out_date: asDateString(stay.check_out_date),
    }));
    const transport = group.logistics.transport_segments.map((segment) => ({
      departure_datetime: asDateString(segment.departure_datetime),
      arrival_datetime: asDateString(segment.arrival_datetime),
      origin: segment.origin_location,
      destination: segment.destination_location,
      vehicle_type: segment.vehicle_type?.name ?? segment.transport_type,
      vehicle_plate_number: segment.vehicle_plate_number,
    }));

    const travelers = activeMembers
      .slice()
      .sort((a, b) =>
        (a.traveller?.full_name ?? '').localeCompare(
          b.traveller?.full_name ?? '',
        ),
      )
      .map((member) => {
        const rooms = group.logistics.room_assignments
          .filter(
            (assignment) =>
              assignment.group_membership_id === member.id &&
              assignment.status?.code === 'ASSIGNED',
          )
          .map((assignment) => {
            const stay = group.logistics.hotel_stays.find(
              (item) => item.id === assignment.group_hotel_stay?.id,
            );
            return {
              city: stay?.city?.name ?? null,
              room_number: assignment.room_number,
            };
          });
        const travelerId = member.traveller?.id;
        return {
          registration_number: member.registration_number,
          name: member.traveller?.full_name ?? 'Unknown traveller',
          phone_number: member.traveller?.phone_number ?? '',
          visa_number: member.registration_id
            ? (visas.get(member.registration_id)?.visa_number ?? null)
            : null,
          rooms,
          emergency_contact: travelerId
            ? (emergencyContacts.get(travelerId) ?? null)
            : null,
        };
      });

    const round = group.package_version?.id
      ? await this.getRoundForPackage(group.package_version.id)
      : null;
    const warnings = this.buildGuideWarnings({
      group,
      travelers,
      stays,
      transport,
    });

    return {
      generated_at: new Date().toISOString(),
      group: {
        id: group.id,
        number: group.group_number,
        name: group.name,
        package_name: group.package_version?.name ?? null,
        round_name: round?.name ?? null,
        round_number: round?.round_number ?? null,
        departure_date: asDateString(group.departure_date),
        return_date: asDateString(group.return_date),
        status: group.status?.name ?? null,
      },
      schedule: { stays, transport },
      travelers,
      warnings,
    };
  }

  async getGroupItinerary(
    groupId: string,
  ): Promise<TravelerItineraryDocument[]> {
    const group = await this.groupSummary.getOperationalSummary(groupId, false);
    const activeMembers = group.members.filter(
      (member) => member.status_code === 'ACTIVE' && member.registration_id,
    );

    if (activeMembers.length === 0) return [];

    // Sort by traveller name for consistent ordering
    const sorted = activeMembers
      .slice()
      .sort((a, b) =>
        (a.traveller?.full_name ?? '').localeCompare(
          b.traveller?.full_name ?? '',
        ),
      );

    const itineraries = await Promise.all(
      sorted.map((member) =>
        this.getTravelerItinerary(member.registration_id!),
      ),
    );

    return itineraries;
  }

  private async getRoundForPackage(packageVersionId: string) {
    const [round] = await this.db
      .select({
        name: schema.travelRounds.name,
        round_number: schema.travelRounds.round_number,
      })
      .from(schema.travelRounds)
      .where(eq(schema.travelRounds.package_version_id, packageVersionId))
      .limit(1);
    return round ?? null;
  }

  private async getLatestVisa(registrationId: string) {
    const result = await this.getLatestVisas([registrationId]);
    return result.get(registrationId) ?? null;
  }

  private async getLatestVisas(registrationIds: string[]) {
    const result = new Map<
      string,
      {
        application_number: string;
        visa_number: string | null;
        status: string | null;
        expiry_date: Date | string | null;
      }
    >();
    if (registrationIds.length === 0) return result;

    const rows = await this.db
      .select()
      .from(schema.visaApplications)
      .leftJoin(
        schema.visaApplicationStatuses,
        eq(
          schema.visaApplications.visa_application_status_id,
          schema.visaApplicationStatuses.id,
        ),
      )
      .where(
        and(
          inArray(schema.visaApplications.registration_id, registrationIds),
          eq(schema.visaApplications.is_deleted, false),
        ),
      )
      .orderBy(asc(schema.visaApplications.created_at));

    for (const row of rows) {
      result.set(row.visa_applications.registration_id, {
        application_number: row.visa_applications.application_number,
        visa_number: row.visa_applications.visa_number,
        status: row.visa_application_statuses?.name ?? null,
        expiry_date: row.visa_applications.expiry_date,
      });
    }
    return result;
  }

  private async getEmergencyContacts(travelerIds: string[]) {
    const result = new Map<string, { name: string; phone_number: string }>();
    if (travelerIds.length === 0) return result;

    const rows = await this.db
      .select()
      .from(schema.travellerContacts)
      .innerJoin(
        schema.contactPersons,
        eq(
          schema.travellerContacts.contact_person_id,
          schema.contactPersons.id,
        ),
      )
      .where(
        and(
          inArray(schema.travellerContacts.traveller_id, travelerIds),
          eq(schema.travellerContacts.is_emergency_contact, true),
          eq(schema.travellerContacts.is_deleted, false),
          eq(schema.contactPersons.is_deleted, false),
        ),
      )
      .orderBy(asc(schema.travellerContacts.priority));

    for (const row of rows) {
      if (!result.has(row.traveller_contacts.traveller_id)) {
        result.set(row.traveller_contacts.traveller_id, {
          name: fullName(row.contact_persons),
          phone_number: row.contact_persons.phone_number,
        });
      }
    }
    return result;
  }

  private buildTravelerWarnings(input: {
    group: Awaited<
      ReturnType<TravelGroupOperationalSummaryService['getOperationalSummary']>
    > | null;
    visa: Awaited<ReturnType<TravelDocumentsService['getLatestVisa']>>;
    flight: unknown;
    stays: TravelerItineraryDocument['stays'];
    transport: TravelerItineraryDocument['transport'];
  }): TravelDocumentWarning[] {
    const warnings: TravelDocumentWarning[] = [];
    if (!input.group)
      warnings.push({ code: 'NO_GROUP', message: 'No travel group assigned.' });
    if (!input.flight)
      warnings.push({
        code: 'NO_FLIGHT',
        message: 'No confirmed flight booking.',
      });
    if (!input.visa?.visa_number)
      warnings.push({
        code: 'NO_VISA',
        message: 'Visa number is not available.',
      });
    if (input.stays.length === 0)
      warnings.push({ code: 'NO_HOTEL', message: 'No hotel stays recorded.' });
    if (input.stays.some((stay) => !stay.room_number))
      warnings.push({
        code: 'MISSING_ROOM',
        message: 'One or more room assignments are missing.',
      });
    if (input.transport.length === 0)
      warnings.push({
        code: 'NO_TRANSPORT',
        message: 'No ground transport recorded.',
      });
    return warnings;
  }

  private buildGuideWarnings(input: {
    group: Awaited<
      ReturnType<TravelGroupOperationalSummaryService['getOperationalSummary']>
    >;
    travelers: GuideManifestDocument['travelers'];
    stays: GuideManifestDocument['schedule']['stays'];
    transport: GuideManifestDocument['schedule']['transport'];
  }): TravelDocumentWarning[] {
    const warnings: TravelDocumentWarning[] = [];
    if (!input.group.departure_date || !input.group.return_date)
      warnings.push({
        code: 'MISSING_DATES',
        message: 'Group travel dates are incomplete.',
      });
    if (input.stays.length === 0)
      warnings.push({ code: 'NO_HOTEL', message: 'No hotel stays recorded.' });
    if (input.transport.length === 0)
      warnings.push({
        code: 'NO_TRANSPORT',
        message: 'No ground transport recorded.',
      });
    if (input.travelers.some((traveler) => traveler.rooms.length === 0))
      warnings.push({
        code: 'MISSING_ROOMS',
        message: 'One or more travelers have no room assignment.',
      });
    if (input.travelers.some((traveler) => !traveler.visa_number))
      warnings.push({
        code: 'MISSING_VISAS',
        message: 'One or more travelers have no visa number.',
      });
    return warnings;
  }
}
