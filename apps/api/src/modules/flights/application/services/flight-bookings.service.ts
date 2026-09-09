import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { MySql2Database } from "drizzle-orm/mysql2";
import { alias } from "drizzle-orm/mysql-core";
import { and, asc, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { ulid } from "ulid";
import { DATABASE } from "../../../../shared/infrastructure/database/database.provider.js";
import { BusinessNumberService } from "../../../../shared/infrastructure/numbering/business-number.service.js";
import * as schema from "@kafi/database";
import { createFlightConfirmedEvent } from "../../domain/events/flight-confirmed.event.js";
import {
  CreateFlightBookingDto,
  UpdateFlightBookingDto,
  CancelFlightBookingDto,
  FlightBookingFiltersDto,
} from "../dto/flight-bookings.dto.js";
import { ExpensesService } from "../../../finance/application/services/expenses.service.js";
import { ExpenseAdjustmentsService } from "../../../finance/application/services/expense-adjustments.service.js";

function toDateOrNull(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

function toTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

const departureAirlines = alias(schema.airlines, "departure_airlines");
const returnAirlines = alias(schema.airlines, "return_airlines");

@Injectable()
export class FlightBookingsService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
    private readonly numbers: BusinessNumberService,
    private readonly eventEmitter: EventEmitter2,
    private readonly expenses: ExpensesService,
    private readonly adjustments: ExpenseAdjustmentsService
  ) {}

  // ---- Lookups ----

  async listStatuses() {
    return this.db
      .select()
      .from(schema.flightBookingStatuses)
      .where(eq(schema.flightBookingStatuses.is_deleted, false))
      .orderBy(asc(schema.flightBookingStatuses.display_order));
  }

  async listAirlines() {
    return this.db
      .select({
        id: schema.airlines.id,
        iata_code: schema.airlines.iata_code,
        icao_code: schema.airlines.icao_code,
        name: schema.airlines.name,
        display_order: schema.airlines.display_order,
      })
      .from(schema.airlines)
      .where(and(eq(schema.airlines.is_active, true), eq(schema.airlines.is_deleted, false)))
      .orderBy(asc(schema.airlines.display_order), asc(schema.airlines.name));
  }

  /**
   * List operationally active registrations with no active flight booking.
   * Flight booking and visa processing are independent workflows, so visa
   * status must not determine whether a registration can be selected here.
   */
  async listEligibleRegistrations(search?: string) {
    const rows = await this.db
      .select({
        id: schema.registrations.id,
        registration_number: schema.registrations.registration_number,
        traveller_id: schema.travellers.id,
        first_name: schema.travellers.first_name,
        last_name: schema.travellers.last_name,
        traveller_number: schema.travellers.traveller_number,
      })
      .from(schema.registrations)
      .innerJoin(
        schema.registrationStatuses,
        eq(schema.registrations.registration_status_id, schema.registrationStatuses.id)
      )
      .innerJoin(schema.travellers, eq(schema.registrations.traveller_id, schema.travellers.id))
      .leftJoin(
        schema.flightBookings,
        and(
          eq(schema.flightBookings.registration_id, schema.registrations.id),
          eq(schema.flightBookings.is_deleted, false)
        )
      )
      .leftJoin(
        schema.flightBookingStatuses,
        eq(schema.flightBookings.flight_booking_status_id, schema.flightBookingStatuses.id)
      )
      .where(
        and(
          eq(schema.registrations.is_deleted, false),
          inArray(schema.registrationStatuses.status_code, ["PROCESSING", "READY_FOR_TRAVEL"]),
          or(
            eq(schema.flightBookingStatuses.status_code, "CANCELLED"),
            sql`${schema.flightBookings.id} IS NULL`
          ),
          search
            ? or(
                like(schema.registrations.registration_number, `%${search}%`),
                like(schema.travellers.traveller_number, `%${search}%`),
                like(schema.travellers.first_name, `%${search}%`),
                like(schema.travellers.last_name, `%${search}%`)
              )
            : undefined
        )
      )
      .groupBy(schema.registrations.id)
      .orderBy(desc(schema.registrations.updated_at))
      .limit(50);

    return rows.map((r) => ({
      id: r.id,
      registration_number: r.registration_number,
      traveller: {
        id: r.traveller_id,
        first_name: r.first_name,
        last_name: r.last_name,
        traveller_number: r.traveller_number,
        full_name: `${r.first_name} ${r.last_name}`,
      },
    }));
  }

  // ---- List / view ----

  async listFlightBookings(filters: FlightBookingFiltersDto) {
    const conditions = [eq(schema.flightBookings.is_deleted, false)];

    if (filters.registration_id) {
      conditions.push(eq(schema.flightBookings.registration_id, filters.registration_id));
    }
    if (filters.status_id) {
      conditions.push(eq(schema.flightBookings.flight_booking_status_id, filters.status_id));
    }
    if (filters.search) {
      const term = `%${filters.search}%`;
      conditions.push(
        or(
          like(schema.flightBookings.booking_number, term),
          like(schema.flightBookings.pnr, term),
          like(schema.flightBookings.departure_flight_number, term),
          like(schema.flightBookings.return_flight_number, term),
          like(schema.registrations.registration_number, term),
          like(schema.travellers.last_name, term)
        )!
      );
    }

    const [rows, count] = await Promise.all([
      this.db
        .select()
        .from(schema.flightBookings)
        .leftJoin(
          schema.flightBookingStatuses,
          eq(schema.flightBookings.flight_booking_status_id, schema.flightBookingStatuses.id)
        )
        .leftJoin(
          schema.registrations,
          eq(schema.flightBookings.registration_id, schema.registrations.id)
        )
        .leftJoin(schema.travellers, eq(schema.registrations.traveller_id, schema.travellers.id))
        .where(and(...conditions)!)
        .orderBy(desc(schema.flightBookings.created_at))
        .limit(filters.page_size)
        .offset((filters.page - 1) * filters.page_size),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.flightBookings)
        .where(eq(schema.flightBookings.is_deleted, false))
        .then((r) => r[0]?.count ?? 0),
    ]);

    return {
      data: rows.map((row) => this.mapListRow(row)),
      total: count,
      page: filters.page,
      page_size: filters.page_size,
    };
  }

  async getFlightBooking(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.flightBookings)
      .leftJoin(
        schema.flightBookingStatuses,
        eq(schema.flightBookings.flight_booking_status_id, schema.flightBookingStatuses.id)
      )
      .leftJoin(
        departureAirlines,
        eq(schema.flightBookings.departure_airline_id, departureAirlines.id)
      )
      .leftJoin(returnAirlines, eq(schema.flightBookings.return_airline_id, returnAirlines.id))
      .leftJoin(
        schema.registrations,
        eq(schema.flightBookings.registration_id, schema.registrations.id)
      )
      .leftJoin(schema.travellers, eq(schema.registrations.traveller_id, schema.travellers.id))
      .where(and(eq(schema.flightBookings.id, id), eq(schema.flightBookings.is_deleted, false)))
      .limit(1);

    if (!row) throw new NotFoundException("Flight booking not found");
    return this.mapDetailRow(row);
  }

  // ---- Mutations ----

  async createFlightBooking(dto: CreateFlightBookingDto, actorId: string) {
    const registration = await this.findRegistration(dto.registration_id);
    if (!registration) throw new NotFoundException("Registration not found");

    if (registration.registration_statuses?.status_code !== "PROCESSING") {
      throw new BadRequestException(
        "Flight bookings can only be created for registrations in PROCESSING"
      );
    }

    await Promise.all([
      this.assertActiveAirline(dto.departure_airline_id),
      dto.return_airline_id ? this.assertActiveAirline(dto.return_airline_id) : Promise.resolve(),
    ]);

    // Enforce one active booking per registration
    await this.assertNoActiveBooking(dto.registration_id);

    // Validate return flight consistency
    if (
      (dto.return_airline_id && !dto.return_flight_number) ||
      (!dto.return_airline_id && dto.return_flight_number) ||
      (dto.return_flight_number && !dto.return_date) ||
      (!dto.return_flight_number && dto.return_date)
    ) {
      throw new BadRequestException(
        "Return airline, flight number, and date must be provided together"
      );
    }

    // Validate date order
    if (dto.return_date && dto.return_date < dto.departure_date) {
      throw new BadRequestException("Return date must be on or after departure date");
    }

    // Flight supplier cost is required — a confirmed booking is a
    // financially complete operational event.
    const supplierCost = Number(dto.supplier_cost ?? 0);
    if (!supplierCost || supplierCost <= 0) {
      throw new BadRequestException(
        "Supplier cost is required to create a confirmed flight booking"
      );
    }

    const confirmedStatus = await this.findStatus("CONFIRMED");
    const bookingNumber = await this.numbers.generateFlightBookingNumber();
    const id = ulid();

    // Use a transaction so the flight booking insert and the Finance
    // expense creation are atomic. If the expense creation fails, the
    // booking insert is rolled back.
    await this.db.transaction(async (tx) => {
      await tx.insert(schema.flightBookings).values({
        id,
        booking_number: bookingNumber,
        registration_id: dto.registration_id,
        flight_booking_status_id: confirmedStatus.id,
        pnr: dto.pnr,
        departure_airline_id: dto.departure_airline_id,
        departure_flight_number: dto.departure_flight_number,
        departure_date: new Date(dto.departure_date),
        return_airline_id: dto.return_airline_id ?? null,
        return_flight_number: dto.return_flight_number ?? null,
        return_date: dto.return_date ? new Date(dto.return_date) : null,
        supplier_cost: dto.supplier_cost !== undefined ? String(dto.supplier_cost) : null,
        notes: dto.notes ?? null,
        created_by: actorId,
        updated_by: actorId,
      });

      // Auto-create a Finance expense for the flight supplier cost, linked
      // to the operational record. The expense inherits the registration →
      // traveler → package dimensions automatically.
      await this.expenses.createExpenseFromOperational(
        {
          expense_category_code: "FLIGHT",
          expense_source_code: "FLIGHT_BOOKING",
          amount: supplierCost,
          expense_date: new Date(dto.departure_date),
          description: `Flight cost for ${bookingNumber}`,
          attribution_scope: "TRAVELER",
          registration_id: dto.registration_id,
          traveller_id: registration.registrations.traveller_id,
          source_flight_booking_id: id,
          actorId,
        },
        tx
      );
    });

    // Emit the event only after the transaction commits successfully.
    this.eventEmitter.emit(
      "flight.confirmed",
      createFlightConfirmedEvent({
        flight_booking_id: id,
        booking_number: bookingNumber,
        registration_id: dto.registration_id,
      })
    );

    return this.getFlightBooking(id);
  }

  async updateFlightBooking(id: string, dto: UpdateFlightBookingDto, actorId: string) {
    const existing = await this.getFlightBooking(id);
    if (existing.is_deleted) throw new NotFoundException("Flight booking not found");

    const set: any = { updated_by: actorId };
    if (dto.pnr !== undefined) set.pnr = dto.pnr;
    if (dto.departure_airline_id !== undefined) {
      await this.assertActiveAirline(dto.departure_airline_id);
      set.departure_airline_id = dto.departure_airline_id;
    }
    if (dto.return_airline_id !== undefined) {
      if (dto.return_airline_id) {
        await this.assertActiveAirline(dto.return_airline_id);
      }
      set.return_airline_id = dto.return_airline_id || null;
    }
    if (dto.departure_flight_number !== undefined)
      set.departure_flight_number = dto.departure_flight_number;
    if (dto.departure_date !== undefined)
      set.departure_date = dto.departure_date ? new Date(dto.departure_date) : null;
    if (dto.return_flight_number !== undefined)
      set.return_flight_number = dto.return_flight_number || null;
    if (dto.return_date !== undefined)
      set.return_date = dto.return_date ? new Date(dto.return_date) : null;
    if (dto.supplier_cost !== undefined)
      set.supplier_cost = dto.supplier_cost !== null ? String(dto.supplier_cost) : null;
    if (dto.cancellation_fee !== undefined)
      set.cancellation_fee = dto.cancellation_fee !== null ? String(dto.cancellation_fee) : null;
    if (dto.notes !== undefined) set.notes = dto.notes ?? null;

    // Validate return flight consistency after merge
    const merged = {
      return_airline_id:
        set.return_airline_id !== undefined ? set.return_airline_id : existing.return_airline?.id,
      return_flight_number:
        set.return_flight_number !== undefined
          ? set.return_flight_number
          : existing.return_flight_number,
      return_date: set.return_date !== undefined ? set.return_date : existing.return_date,
      departure_date:
        set.departure_date !== undefined ? set.departure_date : existing.departure_date,
    };
    if (
      (merged.return_airline_id && !merged.return_flight_number) ||
      (merged.return_airline_id && !merged.return_date) ||
      (merged.return_flight_number && !merged.return_date) ||
      (!merged.return_flight_number && merged.return_date)
    ) {
      throw new BadRequestException(
        "Return flight number and return date must both be provided or both omitted"
      );
    }
    if (
      merged.return_date &&
      merged.departure_date &&
      toDateOrNull(merged.return_date)! < toDateOrNull(merged.departure_date)!
    ) {
      throw new BadRequestException("Return date must be on or after departure date");
    }

    await this.db.update(schema.flightBookings).set(set).where(eq(schema.flightBookings.id, id));

    return this.getFlightBooking(id);
  }

  async cancelFlightBooking(id: string, dto: CancelFlightBookingDto, actorId: string) {
    const existing = await this.getFlightBooking(id);
    if (existing.is_deleted) throw new NotFoundException("Flight booking not found");

    const statusCode = existing.status?.status_code ?? "";
    if (statusCode === "CANCELLED") {
      throw new ConflictException("Flight booking is already cancelled");
    }
    if (statusCode !== "CONFIRMED") {
      throw new BadRequestException(`Cannot cancel a flight booking with status ${statusCode}`);
    }

    const cancelledStatus = await this.findStatus("CANCELLED");
    await this.db
      .update(schema.flightBookings)
      .set({
        flight_booking_status_id: cancelledStatus.id,
        cancellation_date: new Date(),
        cancellation_reason: dto.cancellation_reason,
        updated_by: actorId,
      })
      .where(eq(schema.flightBookings.id, id));

    // Record an explicit expense adjustment for the supplier refund/cancellation
    // fee. The original flight expense is NEVER modified or deleted.
    await this.recordCancellationAdjustment(id, existing, dto.cancellation_reason, actorId);

    return this.getFlightBooking(id);
  }

  async softDelete(id: string, actorId: string) {
    const existing = await this.getFlightBooking(id);
    if (existing.is_deleted) throw new NotFoundException("Flight booking not found");

    const statusCode = existing.status?.status_code ?? "";
    if (statusCode === "CONFIRMED") {
      throw new BadRequestException("Cannot delete a CONFIRMED flight booking. Cancel it first.");
    }

    await this.db
      .update(schema.flightBookings)
      .set({
        is_deleted: true,
        deleted_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.flightBookings.id, id));

    return this.getFlightBooking(id);
  }

  /**
   * Records an explicit expense adjustment when a flight is cancelled.
   *
   * The original flight expense is preserved. The adjustment captures the
   * supplier refund (negative — recovery of cost) and/or cancellation fee
   * (positive — additional cost). If neither supplier_cost nor cancellation_fee
   * is present, no adjustment is created.
   */
  private async recordCancellationAdjustment(
    flightBookingId: string,
    existing: any,
    reason: string | undefined,
    actorId: string
  ) {
    // Find the linked expense via source_flight_booking_id
    const [expense] = await this.db
      .select({ id: schema.expenses.id })
      .from(schema.expenses)
      .where(
        and(
          eq(schema.expenses.source_flight_booking_id, flightBookingId),
          eq(schema.expenses.is_deleted, false)
        )
      )
      .limit(1);
    if (!expense) return; // No linked expense — nothing to adjust

    const supplierCost = Number(existing.supplier_cost ?? 0);
    const cancellationFee = Number(existing.cancellation_fee ?? 0);

    // Net adjustment = cancellation fee (additional cost) - supplier cost (recovery)
    // If supplier refunds the full cost, adjustment = -supplierCost + cancellationFee
    // If no refund, adjustment = +cancellationFee (if any)
    const adjustmentAmount = toTwoDecimals(-supplierCost + cancellationFee);
    if (adjustmentAmount === 0) return; // Nothing to adjust

    const adjustmentType = adjustmentAmount < 0 ? "SUPPLIER_REFUND" : "CANCELLATION_FEE";

    try {
      await this.adjustments.createAdjustment(
        {
          expense_id: expense.id,
          adjustment_type: adjustmentType as any,
          amount: adjustmentAmount,
          adjustment_date: new Date(),
          reason: reason ?? "Flight cancellation",
          source_record_type: "FLIGHT_BOOKING",
          source_record_id: flightBookingId,
          source_record_number: existing.booking_number,
        } as any,
        actorId
      );
    } catch {
      // Adjustment may already exist (unique constraint per type per expense).
      // This is acceptable — the adjustment was already recorded.
    }
  }

  // ---- Private helpers ----

  private async assertActiveAirline(id: string) {
    const [airline] = await this.db
      .select({ id: schema.airlines.id })
      .from(schema.airlines)
      .where(
        and(
          eq(schema.airlines.id, id),
          eq(schema.airlines.is_active, true),
          eq(schema.airlines.is_deleted, false)
        )
      )
      .limit(1);
    if (!airline) throw new BadRequestException("Selected airline is not active");
  }

  private async findRegistration(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.registrations)
      .leftJoin(
        schema.registrationStatuses,
        eq(schema.registrations.registration_status_id, schema.registrationStatuses.id)
      )
      .where(eq(schema.registrations.id, id))
      .limit(1);
    return row;
  }

  private async assertNoActiveBooking(registrationId: string) {
    const existing = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.flightBookings)
      .innerJoin(
        schema.flightBookingStatuses,
        eq(schema.flightBookings.flight_booking_status_id, schema.flightBookingStatuses.id)
      )
      .where(
        and(
          eq(schema.flightBookings.registration_id, registrationId),
          eq(schema.flightBookings.is_deleted, false),
          eq(schema.flightBookingStatuses.status_code, "CONFIRMED")
        )
      );
    if ((existing[0]?.count ?? 0) > 0) {
      throw new ConflictException("An active flight booking already exists for this registration");
    }
  }

  private async findStatus(code: string) {
    const [row] = await this.db
      .select()
      .from(schema.flightBookingStatuses)
      .where(eq(schema.flightBookingStatuses.status_code, code))
      .limit(1);
    if (!row) throw new BadRequestException(`Flight booking status ${code} not found`);
    return row;
  }

  private mapListRow(row: any) {
    const fb = row.flight_bookings;
    return {
      id: fb.id,
      booking_number: fb.booking_number,
      registration_id: fb.registration_id,
      pnr: fb.pnr,
      departure_airline: row.departure_airlines
        ? {
            id: row.departure_airlines.id,
            iata_code: row.departure_airlines.iata_code,
            icao_code: row.departure_airlines.icao_code,
            name: row.departure_airlines.name,
            display_order: row.departure_airlines.display_order,
          }
        : null,
      departure_flight_number: fb.departure_flight_number,
      departure_date: toDateOrNull(fb.departure_date),
      return_airline: row.return_airlines
        ? {
            id: row.return_airlines.id,
            iata_code: row.return_airlines.iata_code,
            icao_code: row.return_airlines.icao_code,
            name: row.return_airlines.name,
            display_order: row.return_airlines.display_order,
          }
        : null,
      return_flight_number: fb.return_flight_number ?? null,
      return_date: toDateOrNull(fb.return_date),
      cancellation_date: toDateOrNull(fb.cancellation_date),
      cancellation_reason: fb.cancellation_reason ?? null,
      registration: row.registrations
        ? {
            id: row.registrations.id,
            registration_number: row.registrations.registration_number,
          }
        : null,
      traveller: row.travellers
        ? {
            id: row.travellers.id,
            first_name: row.travellers.first_name,
            last_name: row.travellers.last_name,
            traveller_number: row.travellers.traveller_number,
          }
        : null,
      status: row.flight_booking_statuses
        ? {
            id: row.flight_booking_statuses.id,
            status_code: row.flight_booking_statuses.status_code,
            name: row.flight_booking_statuses.name,
          }
        : null,
      created_at: fb.created_at,
      updated_at: fb.updated_at,
      is_deleted: fb.is_deleted,
    };
  }

  private mapDetailRow(row: any) {
    const fb = row.flight_bookings;
    return {
      id: fb.id,
      booking_number: fb.booking_number,
      registration_id: fb.registration_id,
      pnr: fb.pnr,
      departure_airline: row.departure_airlines
        ? {
            id: row.departure_airlines.id,
            iata_code: row.departure_airlines.iata_code,
            icao_code: row.departure_airlines.icao_code,
            name: row.departure_airlines.name,
            display_order: row.departure_airlines.display_order,
          }
        : null,
      departure_flight_number: fb.departure_flight_number,
      departure_date: toDateOrNull(fb.departure_date),
      return_airline: row.return_airlines
        ? {
            id: row.return_airlines.id,
            iata_code: row.return_airlines.iata_code,
            icao_code: row.return_airlines.icao_code,
            name: row.return_airlines.name,
            display_order: row.return_airlines.display_order,
          }
        : null,
      return_flight_number: fb.return_flight_number ?? null,
      return_date: toDateOrNull(fb.return_date),
      cancellation_date: toDateOrNull(fb.cancellation_date),
      cancellation_reason: fb.cancellation_reason ?? null,
      notes: fb.notes ?? null,
      registration: row.registrations
        ? {
            id: row.registrations.id,
            registration_number: row.registrations.registration_number,
          }
        : null,
      traveller: row.travellers
        ? {
            id: row.travellers.id,
            first_name: row.travellers.first_name,
            last_name: row.travellers.last_name,
            traveller_number: row.travellers.traveller_number,
          }
        : null,
      status: row.flight_booking_statuses
        ? {
            id: row.flight_booking_statuses.id,
            status_code: row.flight_booking_statuses.status_code,
            name: row.flight_booking_statuses.name,
          }
        : null,
      created_at: fb.created_at,
      updated_at: fb.updated_at,
      is_deleted: fb.is_deleted,
    };
  }
}
