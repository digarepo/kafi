import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { RoomAssignmentsService } from './room-assignments.service.js';
import { TransportSegmentsService } from './transport-segments.service.js';
import { HotelsService } from './hotels.service.js';
import { VendorsService } from './vendors.service.js';
import { RoomsService } from './rooms.service.js';
import { createMockDb } from './mock-db.js';

const actorId = 'actor-1';

const availableRoomStatus = {
  id: 'rs-1',
  status_code: 'AVAILABLE',
  name: 'Available',
};
const activeMembershipStatus = {
  id: 'gms-1',
  status_code: 'ACTIVE',
  name: 'Active',
};
const assignedStatus = {
  id: 'ras-1',
  status_code: 'ASSIGNED',
  name: 'Assigned',
};

function room(overrides: any = {}) {
  return {
    id: 'room-1',
    room_number: '101',
    capacity: 2,
    gender_restriction: null,
    room_type_id: null,
    room_status_id: availableRoomStatus.id,
    group_hotel_stay_id: 'stay-1',
    notes: null,
    is_deleted: false,
    ...overrides,
  };
}

function stay(overrides: any = {}) {
  return { id: 'stay-1', travel_group_id: 'tg-1', ...overrides };
}

function membership(overrides: any = {}) {
  return {
    id: 'gm-1',
    travel_group_id: 'tg-1',
    registration_id: 'reg-1',
    group_membership_status_id: activeMembershipStatus.id,
    is_deleted: false,
    ...overrides,
  };
}

function traveller(overrides: any = {}) {
  return {
    id: 'trav-1',
    first_name: 'A',
    last_name: 'B',
    gender: 'Male',
    ...overrides,
  };
}

function roomWithStayRow(opts: any = {}) {
  return {
    rooms: room(opts.room),
    room_types: null,
    room_statuses: opts.roomStatus ?? availableRoomStatus,
    group_hotel_stays: stay(opts.stay),
  };
}

function membershipRow(opts: any = {}) {
  return {
    group_memberships: membership(opts.membership),
    group_membership_statuses: opts.membershipStatus ?? activeMembershipStatus,
    registrations: null,
    travellers: traveller(opts.traveller),
  };
}

describe('RoomAssignmentsService', () => {
  it('rejects assignment when membership is not active', async () => {
    const db = createMockDb([
      [{ id: 'room-1', capacity: 2, updated_at: new Date() }],
      [undefined],
      [roomWithStayRow()],
      [
        membershipRow({
          membershipStatus: { status_code: 'CANCELLED' },
        }),
      ],
    ]);
    const service = new RoomAssignmentsService(db as any);
    await expect(
      service.createAssignment(
        {
          room_id: 'room-1',
          group_hotel_stay_id: 'stay-1',
          group_membership_id: 'gm-1',
        } as any,
        actorId,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects assignment when travel group does not match', async () => {
    const db = createMockDb([
      [{ id: 'room-1', capacity: 2, updated_at: new Date() }],
      [undefined],
      [roomWithStayRow()],
      [membershipRow({ membership: { travel_group_id: 'tg-2' } })],
    ]);
    const service = new RoomAssignmentsService(db as any);
    await expect(
      service.createAssignment(
        {
          room_id: 'room-1',
          group_hotel_stay_id: 'stay-1',
          group_membership_id: 'gm-1',
        } as any,
        actorId,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects assignment when gender does not match', async () => {
    const db = createMockDb([
      [{ id: 'room-1', capacity: 2, updated_at: new Date() }],
      [undefined],
      [
        roomWithStayRow({
          room: { gender_restriction: 'Female' },
        }),
      ],
      [membershipRow({ traveller: { gender: 'Male' } })],
    ]);
    const service = new RoomAssignmentsService(db as any);
    await expect(
      service.createAssignment(
        {
          room_id: 'room-1',
          group_hotel_stay_id: 'stay-1',
          group_membership_id: 'gm-1',
        } as any,
        actorId,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects assignment when room is at capacity', async () => {
    const db = createMockDb([
      [{ id: 'room-1', capacity: 2, updated_at: new Date() }],
      [undefined],
      [roomWithStayRow()],
      [membershipRow()],
      [{ count: 2 }],
    ]);
    const service = new RoomAssignmentsService(db as any);
    await expect(
      service.createAssignment(
        {
          room_id: 'room-1',
          group_hotel_stay_id: 'stay-1',
          group_membership_id: 'gm-1',
        } as any,
        actorId,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects duplicate active assignment for membership', async () => {
    const db = createMockDb([
      [{ id: 'room-1', capacity: 2, updated_at: new Date() }],
      [undefined],
      [roomWithStayRow()],
      [membershipRow()],
      [{ count: 1 }],
      [{ id: 'existing-assignment' }],
    ]);
    const service = new RoomAssignmentsService(db as any);
    await expect(
      service.createAssignment(
        {
          room_id: 'room-1',
          group_hotel_stay_id: 'stay-1',
          group_membership_id: 'gm-1',
        } as any,
        actorId,
      ),
    ).rejects.toThrow(ConflictException);
  });
});

describe('TransportSegmentsService', () => {
  const numbers = {
    generateTransportSegmentNumber: vi
      .fn()
      .mockResolvedValue('TRS-2026-000001'),
  };

  it('rejects departure before travel group departure window', async () => {
    const db = createMockDb([
      [{ id: 'tg-1', departure_date: '2026-01-01', return_date: '2026-01-10' }],
      [{ id: 'v-1', is_deleted: false }],
    ]);
    const service = new TransportSegmentsService(db as any, numbers as any);
    await expect(
      service.createSegment(
        {
          travel_group_id: 'tg-1',
          vendor_id: 'v-1',
          transport_type: 'BUS',
          segment_order: 1,
          origin_location: 'JED',
          destination_location: 'MED',
          departure_datetime: '2025-12-31T00:00:00Z',
          arrival_datetime: '2026-01-02T00:00:00Z',
        } as any,
        actorId,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects arrival before departure', async () => {
    const db = createMockDb([
      [{ id: 'tg-1', departure_date: '2026-01-01', return_date: '2026-01-10' }],
      [{ id: 'v-1', is_deleted: false }],
    ]);
    const service = new TransportSegmentsService(db as any, numbers as any);
    await expect(
      service.createSegment(
        {
          travel_group_id: 'tg-1',
          vendor_id: 'v-1',
          transport_type: 'BUS',
          segment_order: 1,
          origin_location: 'JED',
          destination_location: 'MED',
          departure_datetime: '2026-01-05T10:00:00Z',
          arrival_datetime: '2026-01-05T09:00:00Z',
        } as any,
        actorId,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('Soft-delete protection rules', () => {
  it('rejects deleting a hotel referenced by a stay', async () => {
    const db = createMockDb([
      [{ hotels: { id: 'h-1' }, hotel_types: null, hotel_statuses: null }],
      [{ count: 1 }],
    ]);
    const service = new HotelsService(db as any);
    await expect(service.deleteHotel('h-1', actorId)).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejects deleting a vendor referenced by a transport segment', async () => {
    const db = createMockDb([
      [
        {
          vendors: { id: 'v-1' },
          vendor_types: null,
          vendor_statuses: null,
        },
      ],
      [{ count: 1 }],
    ]);
    const service = new VendorsService(
      db as any,
      { generateVendorNumber: vi.fn() } as any,
    );
    await expect(service.deleteVendor('v-1', actorId)).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejects deleting a room with active assignments', async () => {
    const db = createMockDb([
      [{ rooms: { id: 'r-1' }, room_types: null, room_statuses: null }],
      [{ count: 1 }],
    ]);
    const service = new RoomsService(db as any);
    await expect(service.deleteRoom('r-1', actorId)).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejects lowering room capacity below active assignments', async () => {
    const db = createMockDb([
      [
        {
          rooms: { id: 'r-1', capacity: 3 },
          room_types: null,
          room_statuses: null,
        },
      ],
      [{ count: 2 }],
    ]);
    const service = new RoomsService(db as any);
    await expect(
      service.updateRoom('r-1', { capacity: 1 } as any, actorId),
    ).rejects.toThrow(ConflictException);
  });
});
