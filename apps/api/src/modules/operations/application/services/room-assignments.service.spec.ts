import { describe, expect, it, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { RoomAssignmentsService } from './room-assignments.service.js';
import { createMockDb } from './mock-db.js';

const actorId = 'actor-1';

const assignedStatus = {
  id: 'ras-assigned',
  status_code: 'ASSIGNED',
  name: 'Assigned',
};

const releasedStatus = {
  id: 'ras-released',
  status_code: 'RELEASED',
  name: 'Released',
};

const availableRoomStatus = {
  id: 'rs-available',
  status_code: 'AVAILABLE',
  name: 'Available',
};

const planningGroupStatus = { status_code: 'PLANNING' };
const travelPreparedGroupStatus = { status_code: 'TRAVEL_PREPARED' };

function roomRow(overrides: any = {}) {
  return {
    id: 'room-1',
    group_hotel_stay_id: 'stay-1',
    room_number: '101',
    capacity: 2,
    gender_restriction: null,
    room_type_id: null,
    room_status_id: availableRoomStatus.id,
    is_deleted: false,
    updated_at: new Date(),
    ...overrides,
  };
}

function stayRow(overrides: any = {}) {
  return {
    id: 'stay-1',
    travel_group_id: 'tg-1',
    hotel_name: 'Hilton',
    check_in_date: new Date('2026-09-20'),
    check_out_date: new Date('2026-09-25'),
    is_deleted: false,
    ...overrides,
  };
}

function membershipRow(overrides: any = {}) {
  return {
    id: 'gm-1',
    travel_group_id: 'tg-1',
    registration_id: 'reg-1',
    is_deleted: false,
    ...overrides,
  };
}

function travellerRow(overrides: any = {}) {
  return {
    id: 'tv-1',
    first_name: 'Ahmed',
    last_name: 'Ali',
    gender: 'Male',
    ...overrides,
  };
}

function activeMembershipRow(overrides: any = {}) {
  return {
    id: 'gm-1',
    status_code: 'ACTIVE',
    ...overrides,
  };
}

describe('RoomAssignmentsService — Round 4B-2 Hardening', () => {
  describe('createAssignment', () => {
    it('rejects when group is TRAVEL_PREPARED', async () => {
      const db = createMockDb([
        [roomRow()], // room lock select
        [undefined], // room lock update
        [
          {
            rooms: roomRow(),
            room_types: null,
            room_statuses: availableRoomStatus,
            group_hotel_stays: stayRow(),
          },
        ], // roomWithStay
        [
          {
            group_memberships: membershipRow(),
            group_membership_statuses: { status_code: 'ACTIVE' },
            travellers: travellerRow(),
          },
        ], // membershipWithTraveller
        [travelPreparedGroupStatus], // assertGroupAllowsAccommodationChange
      ]);
      const service = new RoomAssignmentsService(db as any);

      await expect(
        service.createAssignment(
          {
            room_id: 'room-1',
            group_hotel_stay_id: 'stay-1',
            group_membership_id: 'gm-1',
          },
          actorId,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects when room is not AVAILABLE', async () => {
      const db = createMockDb([
        [roomRow()], // room lock select
        [undefined], // room lock update
        [
          {
            rooms: roomRow(),
            room_types: null,
            room_statuses: { status_code: 'UNAVAILABLE' },
            group_hotel_stays: stayRow(),
          },
        ], // roomWithStay
        [
          {
            group_memberships: membershipRow(),
            group_membership_statuses: { status_code: 'ACTIVE' },
            travellers: travellerRow(),
          },
        ], // membershipWithTraveller
        [planningGroupStatus], // assertGroupAllowsAccommodationChange
      ]);
      const service = new RoomAssignmentsService(db as any);

      await expect(
        service.createAssignment(
          {
            room_id: 'room-1',
            group_hotel_stay_id: 'stay-1',
            group_membership_id: 'gm-1',
          },
          actorId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when membership is not ACTIVE', async () => {
      const db = createMockDb([
        [roomRow()], // room lock select
        [undefined], // room lock update
        [
          {
            rooms: roomRow(),
            room_types: null,
            room_statuses: availableRoomStatus,
            group_hotel_stays: stayRow(),
          },
        ], // roomWithStay
        [
          {
            group_memberships: membershipRow(),
            group_membership_statuses: { status_code: 'CANCELLED' },
            travellers: travellerRow(),
          },
        ], // membershipWithTraveller
        [planningGroupStatus], // assertGroupAllowsAccommodationChange
      ]);
      const service = new RoomAssignmentsService(db as any);

      await expect(
        service.createAssignment(
          {
            room_id: 'room-1',
            group_hotel_stay_id: 'stay-1',
            group_membership_id: 'gm-1',
          },
          actorId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when gender does not match restriction', async () => {
      const db = createMockDb([
        [roomRow({ gender_restriction: 'Female' })], // room lock select
        [undefined], // room lock update
        [
          {
            rooms: roomRow({ gender_restriction: 'Female' }),
            room_types: null,
            room_statuses: availableRoomStatus,
            group_hotel_stays: stayRow(),
          },
        ], // roomWithStay
        [
          {
            group_memberships: membershipRow(),
            group_membership_statuses: { status_code: 'ACTIVE' },
            travellers: travellerRow({ gender: 'Male' }),
          },
        ], // membershipWithTraveller
        [planningGroupStatus], // assertGroupAllowsAccommodationChange
      ]);
      const service = new RoomAssignmentsService(db as any);

      await expect(
        service.createAssignment(
          {
            room_id: 'room-1',
            group_hotel_stay_id: 'stay-1',
            group_membership_id: 'gm-1',
          },
          actorId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when room is at capacity', async () => {
      const db = createMockDb([
        [roomRow({ capacity: 2 })], // room lock select
        [undefined], // room lock update
        [
          {
            rooms: roomRow({ capacity: 2 }),
            room_types: null,
            room_statuses: availableRoomStatus,
            group_hotel_stays: stayRow(),
          },
        ], // roomWithStay
        [
          {
            group_memberships: membershipRow(),
            group_membership_statuses: { status_code: 'ACTIVE' },
            travellers: travellerRow(),
          },
        ], // membershipWithTraveller
        [planningGroupStatus], // assertGroupAllowsAccommodationChange
        [{ count: 2 }], // activeAssignmentsInRoom (at capacity)
      ]);
      const service = new RoomAssignmentsService(db as any);

      await expect(
        service.createAssignment(
          {
            room_id: 'room-1',
            group_hotel_stay_id: 'stay-1',
            group_membership_id: 'gm-1',
          },
          actorId,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects duplicate active assignment for same member+stay', async () => {
      const db = createMockDb([
        [roomRow({ capacity: 2 })], // room lock select
        [undefined], // room lock update
        [
          {
            rooms: roomRow({ capacity: 2 }),
            room_types: null,
            room_statuses: availableRoomStatus,
            group_hotel_stays: stayRow(),
          },
        ], // roomWithStay
        [
          {
            group_memberships: membershipRow(),
            group_membership_statuses: { status_code: 'ACTIVE' },
            travellers: travellerRow(),
          },
        ], // membershipWithTraveller
        [planningGroupStatus], // assertGroupAllowsAccommodationChange
        [{ count: 0 }], // activeAssignmentsInRoom
        [{ id: 'existing-assignment' }], // activeAssignmentForMembership (already assigned)
      ]);
      const service = new RoomAssignmentsService(db as any);

      await expect(
        service.createAssignment(
          {
            room_id: 'room-1',
            group_hotel_stay_id: 'stay-1',
            group_membership_id: 'gm-1',
          },
          actorId,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('reassignAssignment', () => {
    it('rejects reassignment to the same room', async () => {
      const existingAssignment = {
        id: 'ra-1',
        room_id: 'room-1',
        group_hotel_stay_id: 'stay-1',
        group_membership_id: 'gm-1',
        is_active_assignment: true,
        is_deleted: false,
      };

      const db = createMockDb([
        [existingAssignment], // existing assignment select
        [stayRow()], // resolveTravelGroupIdForStay
        [planningGroupStatus], // assertGroupAllowsAccommodationChange
        [roomRow()], // room lock select
        [undefined], // room lock update
        [
          {
            rooms: roomRow(),
            room_types: null,
            room_statuses: availableRoomStatus,
            group_hotel_stays: stayRow(),
          },
        ], // roomWithStay
        [
          {
            group_memberships: membershipRow(),
            group_membership_statuses: { status_code: 'ACTIVE' },
            travellers: travellerRow(),
          },
        ], // membershipWithTraveller
        [{ count: 0 }], // activeAssignmentsInRoomExcluding
      ]);
      const service = new RoomAssignmentsService(db as any);

      await expect(
        service.reassignAssignment('ra-1', 'room-1', actorId),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects reassignment when group is TRAVEL_PREPARED', async () => {
      const existingAssignment = {
        id: 'ra-1',
        room_id: 'room-1',
        group_hotel_stay_id: 'stay-1',
        group_membership_id: 'gm-1',
        is_active_assignment: true,
        is_deleted: false,
      };

      const db = createMockDb([
        [existingAssignment], // existing assignment select
        [stayRow()], // resolveTravelGroupIdForStay
        [travelPreparedGroupStatus], // assertGroupAllowsAccommodationChange
      ]);
      const service = new RoomAssignmentsService(db as any);

      await expect(
        service.reassignAssignment('ra-1', 'room-2', actorId),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects reassignment of a released assignment', async () => {
      const existingAssignment = {
        id: 'ra-1',
        room_id: 'room-1',
        group_hotel_stay_id: 'stay-1',
        group_membership_id: 'gm-1',
        is_active_assignment: false,
        is_deleted: false,
      };

      const db = createMockDb([
        [existingAssignment], // existing assignment select
      ]);
      const service = new RoomAssignmentsService(db as any);

      await expect(
        service.reassignAssignment('ra-1', 'room-2', actorId),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('releaseAssignmentsForMembership', () => {
    it('releases all active assignments for a membership', async () => {
      const db = createMockDb([
        [releasedStatus], // statusIdFor('RELEASED')
        [{ id: 'ra-1' }, { id: 'ra-2' }], // active assignments select
        [undefined], // update
      ]);
      const service = new RoomAssignmentsService(db as any);

      const count = await service.releaseAssignmentsForMembership(
        'gm-1',
        actorId,
      );

      expect(count).toBe(2);
    });

    it('returns 0 when no active assignments exist', async () => {
      const db = createMockDb([
        [releasedStatus], // statusIdFor('RELEASED')
        [], // no active assignments
      ]);
      const service = new RoomAssignmentsService(db as any);

      const count = await service.releaseAssignmentsForMembership(
        'gm-1',
        actorId,
      );

      expect(count).toBe(0);
    });
  });

  describe('autoAssignForStay', () => {
    it('rejects auto-assign when group is TRAVEL_PREPARED', async () => {
      const db = createMockDb([
        [stayRow()], // findStay
        [travelPreparedGroupStatus], // assertGroupAllowsAccommodationChange
      ]);
      const service = new RoomAssignmentsService(db as any);

      await expect(
        service.autoAssignForStay('stay-1', actorId),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects auto-assign when stay not found', async () => {
      const db = createMockDb([
        [], // findStay returns empty
      ]);
      const service = new RoomAssignmentsService(db as any);

      await expect(
        service.autoAssignForStay('nonexistent', actorId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
