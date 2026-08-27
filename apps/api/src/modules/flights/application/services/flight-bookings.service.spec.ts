import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createMockDb } from './mock-db.js';
import { FlightBookingsService } from './flight-bookings.service.js';
import { BusinessNumberService } from '../../../../shared/infrastructure/numbering/business-number.service.js';
import {
  CreateFlightBookingDto,
  UpdateFlightBookingDto,
  CancelFlightBookingDto,
} from '../dto/flight-bookings.dto.js';

const actor = 'ULID123USER';

function buildService(db: any, overrides?: { adjustments?: any }) {
  const numbers = {
    generateFlightBookingNumber: vi.fn().mockResolvedValue('FLT-2026-000001'),
  } as unknown as BusinessNumberService;
  const eventEmitter = { emit: vi.fn() } as unknown as EventEmitter2;
  const expenses = {
    createExpenseFromOperational: vi.fn().mockResolvedValue({}),
  } as any;
  const adjustments =
    overrides?.adjustments ??
    ({ createAdjustment: vi.fn().mockResolvedValue({}) } as any);
  return new FlightBookingsService(
    db,
    numbers,
    eventEmitter,
    expenses,
    adjustments,
  );
}

function registrationRow(regId: string, statusCode = 'PROCESSING') {
  return {
    registrations: {
      id: regId,
      registration_number: 'R-1',
      traveller_id: 'T',
    },
    registration_statuses: {
      id: `RS_${statusCode}`,
      status_code: statusCode,
      name: statusCode,
    },
  };
}

function approvedVisaRow(regId: string) {
  return [{ id: 'VISA1', registration_id: regId }];
}

function noActiveBookingCount() {
  return [{ count: 0 }];
}

function activeBookingCount() {
  return [{ count: 1 }];
}

function confirmedStatusRow() {
  return { id: 'FBS_CONFIRMED', status_code: 'CONFIRMED', name: 'Confirmed' };
}

function cancelledStatusRow() {
  return { id: 'FBS_CANCELLED', status_code: 'CANCELLED', name: 'Cancelled' };
}

function flightRow(
  id: string,
  statusCode: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    flight_bookings: {
      id,
      booking_number: 'FLT-2026-000001',
      registration_id: 'REG',
      flight_booking_status_id: `FBS_${statusCode}`,
      pnr: 'ABC123',
      departure_flight_number: 'ET700',
      departure_date: '2026-09-01',
      return_flight_number: 'ET701',
      return_date: '2026-09-15',
      cancellation_date: null,
      cancellation_reason: null,
      notes: null,
      is_deleted: false,
      ...overrides,
    },
    flight_booking_statuses: {
      id: `FBS_${statusCode}`,
      status_code: statusCode,
      name: statusCode,
    },
    registrations: {
      id: 'REG',
      registration_number: 'R-1',
    },
    travellers: null,
  };
}

function makeCreateDto(
  overrides: Record<string, unknown> = {},
): CreateFlightBookingDto {
  const dto = new CreateFlightBookingDto();
  Object.assign(dto, {
    registration_id: 'REG',
    pnr: 'ABC123',
    departure_flight_number: 'ET700',
    departure_date: '2026-09-01',
    return_flight_number: 'ET701',
    return_date: '2026-09-15',
    supplier_cost: 5000,
    ...overrides,
  });
  return dto;
}

describe('FlightBookingsService', () => {
  it('rejects creation when supplier_cost is missing', async () => {
    const db = createMockDb([
      registrationRow('REG'),
      approvedVisaRow('REG'),
      noActiveBookingCount(),
    ]);
    const service = buildService(db);
    const dto = makeCreateDto({ supplier_cost: undefined });

    await expect(service.createFlightBooking(dto, actor)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects creation when registration has no approved visa', async () => {
    const db = createMockDb([
      registrationRow('REG'), // findRegistration
      [], // hasApprovedVisa -> empty
    ]);
    const service = buildService(db);
    const dto = makeCreateDto();

    await expect(service.createFlightBooking(dto, actor)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('creates flight booking directly as CONFIRMED', async () => {
    const db = createMockDb([
      registrationRow('REG'), // findRegistration
      approvedVisaRow('REG'), // hasApprovedVisa
      noActiveBookingCount(), // assertNoActiveBooking
      confirmedStatusRow(), // findStatus CONFIRMED
      null, // insert
      flightRow('NEW', 'CONFIRMED'), // getFlightBooking after insert
    ]);
    const service = buildService(db);
    const dto = makeCreateDto();

    const result = await service.createFlightBooking(dto, actor);
    expect(result.status?.status_code).toBe('CONFIRMED');
    expect((db.insertValues[0] as any).flight_booking_status_id).toBe(
      'FBS_CONFIRMED',
    );
  });

  it('emits flight.confirmed event on creation', async () => {
    const db = createMockDb([
      registrationRow('REG'),
      approvedVisaRow('REG'),
      noActiveBookingCount(),
      confirmedStatusRow(),
      null,
      flightRow('NEW', 'CONFIRMED'),
    ]);
    const service = buildService(db);
    const dto = makeCreateDto();

    await service.createFlightBooking(dto, actor);
    expect(service['eventEmitter'].emit).toHaveBeenCalledWith(
      'flight.confirmed',
      expect.objectContaining({ type: 'flight.confirmed' }),
    );
  });

  it('rejects creation when an active booking already exists', async () => {
    const db = createMockDb([
      registrationRow('REG'),
      approvedVisaRow('REG'),
      activeBookingCount(), // assertNoActiveBooking -> conflict
    ]);
    const service = buildService(db);
    const dto = makeCreateDto();

    await expect(service.createFlightBooking(dto, actor)).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejects return flight number without return date', async () => {
    const db = createMockDb([
      registrationRow('REG'),
      approvedVisaRow('REG'),
      noActiveBookingCount(),
    ]);
    const service = buildService(db);
    const dto = makeCreateDto({
      return_flight_number: 'ET701',
      return_date: undefined,
    });

    await expect(service.createFlightBooking(dto, actor)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects return date before departure date', async () => {
    const db = createMockDb([
      registrationRow('REG'),
      approvedVisaRow('REG'),
      noActiveBookingCount(),
    ]);
    const service = buildService(db);
    const dto = makeCreateDto({
      departure_date: '2026-09-15',
      return_date: '2026-09-01',
    });

    await expect(service.createFlightBooking(dto, actor)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('cancels a CONFIRMED booking', async () => {
    const db = createMockDb([
      flightRow('FB1', 'CONFIRMED'), // getFlightBooking
      cancelledStatusRow(), // findStatus CANCELLED
      null, // update
      [], // recordCancellationAdjustment — no linked expense found
      flightRow('FB1', 'CANCELLED', {
        cancellation_date: '2026-08-01',
        cancellation_reason: 'Customer request',
      }), // getFlightBooking after update
    ]);
    const service = buildService(db);
    const dto = new CancelFlightBookingDto();
    Object.assign(dto, { cancellation_reason: 'Customer request' });

    const result = await service.cancelFlightBooking('FB1', dto, actor);
    expect(result.status?.status_code).toBe('CANCELLED');
    expect((db.updateSets[0] as any).flight_booking_status_id).toBe(
      'FBS_CANCELLED',
    );
  });

  it('rejects cancelling an already CANCELLED booking', async () => {
    const db = createMockDb([flightRow('FB1', 'CANCELLED')]);
    const service = buildService(db);
    const dto = new CancelFlightBookingDto();
    Object.assign(dto, { cancellation_reason: 'Test' });

    await expect(
      service.cancelFlightBooking('FB1', dto, actor),
    ).rejects.toThrow(ConflictException);
  });

  it('updates editable fields on a confirmed booking', async () => {
    const db = createMockDb([
      flightRow('FB1', 'CONFIRMED'), // getFlightBooking existing
      null, // update
      flightRow('FB1', 'CONFIRMED', { pnr: 'XYZ789' }), // getFlightBooking after update
    ]);
    const service = buildService(db);
    const dto = new UpdateFlightBookingDto();
    Object.assign(dto, { pnr: 'XYZ789' });

    const result = await service.updateFlightBooking('FB1', dto, actor);
    expect(result.pnr).toBe('XYZ789');
  });
});
