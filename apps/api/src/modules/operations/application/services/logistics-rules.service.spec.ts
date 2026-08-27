import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { RoomAssignmentsService } from './room-assignments.service.js';
import { TransportSegmentsService } from './transport-segments.service.js';
import { HotelsService } from './hotels.service.js';
import { VendorsService } from './vendors.service.js';
import { RoomsService } from './rooms.service.js';
import { createMockDb } from './mock-db.js';

const actorId = 'actor-1';

const expenses = {
  createExpenseFromOperational: vi.fn().mockResolvedValue({}),
} as any;

const adjustments = {
  createAdjustment: vi.fn().mockResolvedValue({}),
} as any;

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
      [{ status_code: 'PLANNING' }], // assertGroupAllowsAccommodationChange
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
      [{ status_code: 'PLANNING' }], // assertGroupAllowsAccommodationChange
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
      [{ status_code: 'PLANNING' }], // assertGroupAllowsAccommodationChange
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
      [{ status_code: 'PLANNING' }], // assertGroupAllowsAccommodationChange
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
      [{ status_code: 'PLANNING' }], // assertGroupAllowsAccommodationChange
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

  const planningStatus = { status_code: 'PLANNING' };
  const confirmedStatus = {
    id: 'tss-confirmed',
    status_code: 'CONFIRMED',
    name: 'Confirmed',
  };
  const travelGroup = {
    id: 'tg-1',
    departure_date: '2026-01-01',
    return_date: '2026-01-10',
  };

  it('creates a segment as CONFIRMED with only origin and destination', async () => {
    const db = createMockDb([
      [travelGroup], // findTravelGroup
      [planningStatus], // assertGroupAllowsAccommodationChange
      [confirmedStatus], // statusIdFor('CONFIRMED')
      [], // nextSegmentOrder query (empty → returns 1)
      undefined, // insert
      [
        {
          transport_segments: {
            id: 'seg-1',
            transport_segment_number: 'TRS-2026-000001',
            travel_group_id: 'tg-1',
            vendor_id: null,
            transport_type: null,
            segment_order: 1,
            origin_location: 'JED',
            destination_location: 'MED',
            origin_type: null,
            destination_type: null,
            departure_datetime: null,
            arrival_datetime: null,
            vehicle_identifier: null,
            driver_name: null,
            driver_phone_number: null,
            transport_segment_status_id: 'tss-confirmed',
            notes: null,
            created_at: new Date(),
            updated_at: new Date(),
            is_deleted: false,
          },
          travel_groups: null,
          vendors: null,
          transport_segment_statuses: confirmedStatus,
        },
      ],
    ]);
    const service = new TransportSegmentsService(
      db as any,
      numbers as any,
      expenses as any,
      adjustments as any,
    );
    const result = await service.createSegment(
      {
        travel_group_id: 'tg-1',
        origin_location: 'JED',
        destination_location: 'MED',
        transport_cost: 2000,
      } as any,
      actorId,
    );
    expect(result.id).toBe('seg-1');
    expect(db.insertValues[0]).toMatchObject({
      origin_location: 'JED',
      destination_location: 'MED',
      vendor_id: null,
      transport_type: null,
      transport_segment_status_id: 'tss-confirmed',
    });
  });

  it('creates a segment with optional vendor', async () => {
    const db = createMockDb([
      [travelGroup], // findTravelGroup
      [planningStatus], // assertGroupAllowsAccommodationChange
      [{ id: 'v-1', is_deleted: false }], // assertVendorExists
      [confirmedStatus], // statusIdFor('CONFIRMED')
      [], // nextSegmentOrder
      undefined, // insert
      [
        {
          transport_segments: {
            id: 'seg-2',
            transport_segment_number: 'TRS-2026-000002',
            travel_group_id: 'tg-1',
            vendor_id: 'v-1',
            transport_type: null,
            segment_order: 1,
            origin_location: 'Makkah',
            destination_location: 'Madinah',
            origin_type: null,
            destination_type: null,
            departure_datetime: null,
            arrival_datetime: null,
            vehicle_identifier: null,
            driver_name: null,
            driver_phone_number: null,
            transport_segment_status_id: 'tss-confirmed',
            notes: null,
            created_at: new Date(),
            updated_at: new Date(),
            is_deleted: false,
          },
          travel_groups: null,
          vendors: { id: 'v-1', name: 'Bus Co' },
          transport_segment_statuses: confirmedStatus,
        },
      ],
    ]);
    const service = new TransportSegmentsService(
      db as any,
      numbers as any,
      expenses as any,
      adjustments as any,
    );
    const result = await service.createSegment(
      {
        travel_group_id: 'tg-1',
        vendor_id: 'v-1',
        origin_location: 'Makkah',
        destination_location: 'Madinah',
        transport_cost: 1500,
      } as any,
      actorId,
    );
    expect(result.id).toBe('seg-2');
    expect(db.insertValues[0]).toMatchObject({
      vendor_id: 'v-1',
      origin_location: 'Makkah',
      destination_location: 'Madinah',
    });
  });

  it('rejects creation when group is TRAVEL_PREPARED', async () => {
    const db = createMockDb([
      [travelGroup], // findTravelGroup
      [{ status_code: 'TRAVEL_PREPARED' }], // assertGroupAllowsAccommodationChange
    ]);
    const service = new TransportSegmentsService(
      db as any,
      numbers as any,
      expenses as any,
      adjustments as any,
    );
    await expect(
      service.createSegment(
        {
          travel_group_id: 'tg-1',
          origin_location: 'JED',
          destination_location: 'MED',
        } as any,
        actorId,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects update when group is DEPARTED', async () => {
    const db = createMockDb([
      [
        {
          transport_segments: {
            id: 'seg-1',
            travel_group_id: 'tg-1',
            transport_segment_status_id: 'tss-confirmed',
            origin_location: 'JED',
            destination_location: 'MED',
            segment_order: 1,
            vendor_id: null,
            transport_type: null,
            origin_type: null,
            destination_type: null,
            departure_datetime: null,
            arrival_datetime: null,
            vehicle_identifier: null,
            driver_name: null,
            driver_phone_number: null,
            notes: null,
            is_deleted: false,
            created_at: new Date(),
            updated_at: new Date(),
          },
          travel_groups: null,
          vendors: null,
          transport_segment_statuses: confirmedStatus,
        },
      ],
      [{ status_code: 'DEPARTED' }], // assertGroupAllowsAccommodationChange
    ]);
    const service = new TransportSegmentsService(
      db as any,
      numbers as any,
      expenses as any,
      adjustments as any,
    );
    await expect(
      service.updateSegment('seg-1', { notes: 'updated' } as any, actorId),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects deletion when group is COMPLETED', async () => {
    const db = createMockDb([
      [
        {
          transport_segments: {
            id: 'seg-1',
            travel_group_id: 'tg-1',
            transport_segment_status_id: 'tss-confirmed',
            origin_location: 'JED',
            destination_location: 'MED',
            segment_order: 1,
            vendor_id: null,
            transport_type: null,
            origin_type: null,
            destination_type: null,
            departure_datetime: null,
            arrival_datetime: null,
            vehicle_identifier: null,
            driver_name: null,
            driver_phone_number: null,
            notes: null,
            is_deleted: false,
            created_at: new Date(),
            updated_at: new Date(),
          },
          travel_groups: null,
          vendors: null,
          transport_segment_statuses: confirmedStatus,
        },
      ],
      [{ status_code: 'COMPLETED' }], // assertGroupAllowsAccommodationChange
    ]);
    const service = new TransportSegmentsService(
      db as any,
      numbers as any,
      expenses as any,
      adjustments as any,
    );
    await expect(service.deleteSegment('seg-1', actorId)).rejects.toThrow(
      ConflictException,
    );
  });

  it('uses hard delete (not soft delete) to allow segment_order reuse', async () => {
    const db = createMockDb([
      [
        {
          transport_segments: {
            id: 'seg-1',
            travel_group_id: 'tg-1',
            transport_segment_status_id: 'tss-confirmed',
            origin_location: 'JED',
            destination_location: 'MED',
            segment_order: 1,
            vendor_id: null,
            transport_type: null,
            origin_type: null,
            destination_type: null,
            departure_datetime: null,
            arrival_datetime: null,
            vehicle_identifier: null,
            driver_name: null,
            driver_phone_number: null,
            notes: null,
            is_deleted: false,
            created_at: new Date(),
            updated_at: new Date(),
          },
          travel_groups: null,
          vendors: null,
          transport_segment_statuses: confirmedStatus,
        },
      ],
      [planningStatus], // assertGroupAllowsAccommodationChange
    ]);
    const service = new TransportSegmentsService(
      db as any,
      numbers as any,
      expenses as any,
      adjustments as any,
    );
    await service.deleteSegment('seg-1', actorId);
    // Verify delete was called (not update with is_deleted: true)
    expect(db.calls).toContain('delete');
    expect(db.updateSets.length).toBe(0);
  });

  it('auto-assigns segment_order when not provided', async () => {
    const db = createMockDb([
      [travelGroup], // findTravelGroup
      [planningStatus], // assertGroupAllowsAccommodationChange
      [confirmedStatus], // statusIdFor('CONFIRMED')
      [{ segment_order: 1 }, { segment_order: 2 }], // nextSegmentOrder query
      undefined, // insert
      [
        {
          transport_segments: {
            id: 'seg-3',
            transport_segment_number: 'TRS-2026-000003',
            travel_group_id: 'tg-1',
            vendor_id: null,
            transport_type: null,
            segment_order: 3,
            origin_location: 'Makkah',
            destination_location: 'Jeddah',
            origin_type: null,
            destination_type: null,
            departure_datetime: null,
            arrival_datetime: null,
            vehicle_identifier: null,
            driver_name: null,
            driver_phone_number: null,
            transport_segment_status_id: 'tss-confirmed',
            notes: null,
            created_at: new Date(),
            updated_at: new Date(),
            is_deleted: false,
          },
          travel_groups: null,
          vendors: null,
          transport_segment_statuses: confirmedStatus,
        },
      ],
    ]);
    const service = new TransportSegmentsService(
      db as any,
      numbers as any,
      expenses as any,
      adjustments as any,
    );
    await service.createSegment(
      {
        travel_group_id: 'tg-1',
        origin_location: 'Makkah',
        destination_location: 'Jeddah',
        transport_cost: 800,
      } as any,
      actorId,
    );
    expect(db.insertValues[0]).toMatchObject({ segment_order: 3 });
  });

  it('rejects creation when transport_cost is missing', async () => {
    const db = createMockDb([[travelGroup], [planningStatus]]);
    const service = new TransportSegmentsService(
      db as any,
      numbers as any,
      expenses as any,
      adjustments as any,
    );

    await expect(
      service.createSegment(
        {
          travel_group_id: 'tg-1',
          origin_location: 'JED',
          destination_location: 'MED',
        } as any,
        actorId,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects creation when transport_cost is zero', async () => {
    const db = createMockDb([[travelGroup], [planningStatus]]);
    const service = new TransportSegmentsService(
      db as any,
      numbers as any,
      expenses as any,
      adjustments as any,
    );

    await expect(
      service.createSegment(
        {
          travel_group_id: 'tg-1',
          origin_location: 'JED',
          destination_location: 'MED',
          transport_cost: 0,
        } as any,
        actorId,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates linked Finance expense with GROUP attribution and source link', async () => {
    const db = createMockDb([
      [travelGroup],
      [planningStatus],
      [confirmedStatus],
      [],
      undefined,
      [
        {
          transport_segments: {
            id: 'seg-x',
            transport_segment_number: 'TRS-2026-00000X',
            travel_group_id: 'tg-1',
            vendor_id: null,
            transport_type: null,
            segment_order: 1,
            origin_location: 'JED',
            destination_location: 'MED',
            origin_type: null,
            destination_type: null,
            departure_datetime: null,
            arrival_datetime: null,
            vehicle_identifier: null,
            driver_name: null,
            driver_phone_number: null,
            transport_segment_status_id: 'tss-confirmed',
            notes: null,
            created_at: new Date(),
            updated_at: new Date(),
            is_deleted: false,
          },
          travel_groups: null,
          vendors: null,
          transport_segment_statuses: confirmedStatus,
        },
      ],
    ]);
    const localExpenses = {
      createExpenseFromOperational: vi.fn().mockResolvedValue({ id: 'exp-1' }),
    } as any;
    const service = new TransportSegmentsService(
      db as any,
      numbers as any,
      localExpenses,
      adjustments as any,
    );

    await service.createSegment(
      {
        travel_group_id: 'tg-1',
        origin_location: 'JED',
        destination_location: 'MED',
        transport_cost: 2000,
      } as any,
      actorId,
    );

    expect(localExpenses.createExpenseFromOperational).toHaveBeenCalledWith(
      expect.objectContaining({
        expense_category_code: 'TRANSPORT',
        expense_source_code: 'TRANSPORT_SEGMENT',
        amount: 2000,
        attribution_scope: 'GROUP',
        travel_group_id: 'tg-1',
        source_transport_segment_id: expect.any(String),
      }),
      expect.anything(),
    );
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
      [{ travel_group_id: 'tg-1' }], // resolveTravelGroupIdForRoom
      [{ status_code: 'PLANNING' }], // assertGroupAllowsAccommodationChange
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
      [{ travel_group_id: 'tg-1' }], // resolveTravelGroupIdForRoom
      [{ status_code: 'PLANNING' }], // assertGroupAllowsAccommodationChange
      [{ count: 2 }],
    ]);
    const service = new RoomsService(db as any);
    await expect(
      service.updateRoom('r-1', { capacity: 1 } as any, actorId),
    ).rejects.toThrow(ConflictException);
  });
});
