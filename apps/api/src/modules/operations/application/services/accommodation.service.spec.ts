import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { GroupHotelStaysService } from './group-hotel-stays.service.js';
import { createMockDb } from './mock-db.js';

const actorId = 'actor-1';

const expenses = {
  createExpenseFromOperational: vi.fn().mockResolvedValue({}),
} as any;

const adjustments = {
  createAdjustment: vi.fn().mockResolvedValue({}),
} as any;

const confirmedStatus = {
  id: 'ghss-1',
  status_code: 'CONFIRMED',
  name: 'Confirmed',
};

const travelGroup = {
  id: 'tg-1',
  departure_date: new Date('2026-09-20'),
  return_date: new Date('2026-10-01'),
  is_deleted: false,
};

const planningStatus = { status_code: 'PLANNING' };

function mappedStayRow(overrides: any = {}) {
  const base = {
    id: 'stay-1',
    stay_number: 'HS-2026-000001',
    travel_group_id: 'tg-1',
    hotel_id: null,
    hotel_name: 'Hilton Makkah',
    booking_reference: null,
    sequence_order: 1,
    city_id: 'city-1',
    check_in_date: new Date('2026-09-20'),
    check_out_date: new Date('2026-09-25'),
    group_hotel_stay_status_id: confirmedStatus.id,
    notes: null,
    is_deleted: false,
    created_at: new Date(),
    updated_at: new Date(),
  };
  return {
    group_hotel_stays: { ...base, ...overrides },
    travel_groups: travelGroup,
    hotels: null,
    cities: { id: 'city-1', name: 'Makkah' },
    group_hotel_stay_statuses: confirmedStatus,
  };
}

describe('GroupHotelStaysService — Accommodation Workflow', () => {
  const numbers = {
    generateStayNumber: vi.fn().mockResolvedValue('HS-2026-000001'),
  };

  describe('createStay', () => {
    it('creates a stay as CONFIRMED by default (no PLANNED state)', async () => {
      const db = createMockDb([
        [travelGroup], // findTravelGroup
        [planningStatus], // assertGroupAllowsAccommodationChange
        [{ max: 0 }], // nextSequenceOrder
        [], // assertChronologicalConsistency (no earlier stays)
        [confirmedStatus], // statusIdFor('CONFIRMED')
        [undefined], // insert
        [mappedStayRow()], // getStay
        [], // roomsForStay
      ]);
      const service = new GroupHotelStaysService(
        db as any,
        numbers as any,
        expenses as any,
        adjustments as any,
      );

      const result = await service.createStay(
        {
          travel_group_id: 'tg-1',
          hotel_name: 'Hilton Makkah',
          city_id: 'city-1',
          check_in_date: '2026-09-20',
          check_out_date: '2026-09-25',
          accommodation_cost: 5000,
        } as any,
        actorId,
      );

      expect(result.status?.status_code).toBe('CONFIRMED');
      expect(result.hotel_name).toBe('Hilton Makkah');
      expect(result.sequence_order).toBe(1);
      expect(expenses.createExpenseFromOperational).toHaveBeenCalledOnce();
    });

    it('rejects check-out before check-in', async () => {
      const db = createMockDb([
        [travelGroup], // findTravelGroup
        [planningStatus], // assertGroupAllowsAccommodationChange
      ]);
      const service = new GroupHotelStaysService(
        db as any,
        numbers as any,
        expenses as any,
        adjustments as any,
      );

      await expect(
        service.createStay(
          {
            travel_group_id: 'tg-1',
            hotel_name: 'Hotel A',
            city_id: 'city-1',
            check_in_date: '2026-09-25',
            check_out_date: '2026-09-20',
          } as any,
          actorId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects stay outside the travel group window', async () => {
      const db = createMockDb([
        [travelGroup], // findTravelGroup
        [planningStatus], // assertGroupAllowsAccommodationChange
      ]);
      const service = new GroupHotelStaysService(
        db as any,
        numbers as any,
        expenses as any,
        adjustments as any,
      );

      await expect(
        service.createStay(
          {
            travel_group_id: 'tg-1',
            hotel_name: 'Hotel A',
            city_id: 'city-1',
            check_in_date: '2026-08-01',
            check_out_date: '2026-08-05',
          } as any,
          actorId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects stay starting before previous stay ends (chronological)', async () => {
      const db = createMockDb([
        [travelGroup],
        [planningStatus], // assertGroupAllowsAccommodationChange
        [{ max: 1 }], // nextSequenceOrder -> 2
        [
          {
            check_out_date: new Date('2026-09-25'),
            sequence_order: 1,
          },
        ], // earlier stay found
      ]);
      const service = new GroupHotelStaysService(
        db as any,
        numbers as any,
        expenses as any,
        adjustments as any,
      );

      await expect(
        service.createStay(
          {
            travel_group_id: 'tg-1',
            hotel_name: 'Hotel B',
            city_id: 'city-2',
            check_in_date: '2026-09-24',
            check_out_date: '2026-09-30',
          } as any,
          actorId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts a valid sequential stay (check-in = previous check-out)', async () => {
      const db = createMockDb([
        [travelGroup],
        [planningStatus], // assertGroupAllowsAccommodationChange
        [{ max: 1 }], // nextSequenceOrder -> 2
        [
          {
            check_out_date: new Date('2026-09-25'),
            sequence_order: 1,
          },
        ], // earlier stay
        [confirmedStatus], // statusIdFor
        [undefined], // insert
        [
          mappedStayRow({
            id: 'stay-2',
            hotel_name: 'Madinah Hotel',
            sequence_order: 2,
            check_in_date: new Date('2026-09-25'),
            check_out_date: new Date('2026-09-30'),
          }),
        ],
        [], // roomsForStay
      ]);
      const service = new GroupHotelStaysService(
        db as any,
        numbers as any,
        expenses as any,
        adjustments as any,
      );

      const result = await service.createStay(
        {
          travel_group_id: 'tg-1',
          hotel_name: 'Madinah Hotel',
          city_id: 'city-2',
          check_in_date: '2026-09-25',
          check_out_date: '2026-09-30',
          accommodation_cost: 3000,
        } as any,
        actorId,
      );

      expect(result.sequence_order).toBe(2);
    });

    it('supports hotel_name without hotel_id (MVP manual entry)', async () => {
      const db = createMockDb([
        [travelGroup],
        [planningStatus], // assertGroupAllowsAccommodationChange
        [{ max: 0 }],
        [],
        [confirmedStatus],
        [undefined],
        [mappedStayRow({ hotel_id: null, hotel_name: 'Manual Hotel' })],
        [],
      ]);
      const service = new GroupHotelStaysService(
        db as any,
        numbers as any,
        expenses as any,
        adjustments as any,
      );

      const result = await service.createStay(
        {
          travel_group_id: 'tg-1',
          hotel_name: 'Manual Hotel',
          city_id: 'city-1',
          check_in_date: '2026-09-20',
          check_out_date: '2026-09-25',
          accommodation_cost: 2500,
        } as any,
        actorId,
      );

      expect(result.hotel_id).toBeNull();
      expect(result.hotel_name).toBe('Manual Hotel');
    });

    it('rejects creation when accommodation_cost is missing', async () => {
      const db = createMockDb([
        [travelGroup],
        [planningStatus],
        [{ max: 0 }],
        [],
      ]);
      const service = new GroupHotelStaysService(
        db as any,
        numbers as any,
        expenses as any,
        adjustments as any,
      );

      await expect(
        service.createStay(
          {
            travel_group_id: 'tg-1',
            hotel_name: 'Hotel A',
            city_id: 'city-1',
            check_in_date: '2026-09-20',
            check_out_date: '2026-09-25',
          } as any,
          actorId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects creation when accommodation_cost is zero', async () => {
      const db = createMockDb([
        [travelGroup],
        [planningStatus],
        [{ max: 0 }],
        [],
      ]);
      const service = new GroupHotelStaysService(
        db as any,
        numbers as any,
        expenses as any,
        adjustments as any,
      );

      await expect(
        service.createStay(
          {
            travel_group_id: 'tg-1',
            hotel_name: 'Hotel A',
            city_id: 'city-1',
            check_in_date: '2026-09-20',
            check_out_date: '2026-09-25',
            accommodation_cost: 0,
          } as any,
          actorId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates linked Finance expense with GROUP attribution and source link', async () => {
      const db = createMockDb([
        [travelGroup],
        [planningStatus],
        [{ max: 0 }],
        [],
        [confirmedStatus],
        [undefined],
        [mappedStayRow()],
        [],
      ]);
      const localExpenses = {
        createExpenseFromOperational: vi
          .fn()
          .mockResolvedValue({ id: 'exp-1' }),
      } as any;
      const service = new GroupHotelStaysService(
        db as any,
        numbers as any,
        localExpenses,
        adjustments as any,
      );

      await service.createStay(
        {
          travel_group_id: 'tg-1',
          hotel_name: 'Hilton Makkah',
          city_id: 'city-1',
          check_in_date: '2026-09-20',
          check_out_date: '2026-09-25',
          accommodation_cost: 5000,
        } as any,
        actorId,
      );

      expect(localExpenses.createExpenseFromOperational).toHaveBeenCalledWith(
        expect.objectContaining({
          expense_category_code: 'ACCOMMODATION',
          expense_source_code: 'GROUP_HOTEL_STAY',
          amount: 5000,
          attribution_scope: 'GROUP',
          travel_group_id: 'tg-1',
          source_group_hotel_stay_id: expect.any(String),
        }),
        expect.anything(),
      );
    });
  });

  describe('deleteStay', () => {
    it('rejects deletion when rooms exist', async () => {
      const db = createMockDb([
        [mappedStayRow()], // getStay lookup
        [], // roomsForStay (getStay calls it)
        [planningStatus], // assertGroupAllowsAccommodationChange
        [{ count: 2 }], // rooms count check
      ]);
      const service = new GroupHotelStaysService(
        db as any,
        numbers as any,
        expenses as any,
        adjustments as any,
      );

      await expect(service.deleteStay('stay-1', actorId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('deletes stay when no rooms exist', async () => {
      const db = createMockDb([
        [mappedStayRow()], // getStay lookup
        [], // roomsForStay
        [planningStatus], // assertGroupAllowsAccommodationChange
        [{ count: 0 }], // rooms count
        [undefined], // soft delete update
      ]);
      const service = new GroupHotelStaysService(
        db as any,
        numbers as any,
        expenses as any,
        adjustments as any,
      );

      await service.deleteStay('stay-1', actorId);
    });

    it('rejects deletion when group is TRAVEL_PREPARED', async () => {
      const db = createMockDb([
        [mappedStayRow()], // getStay lookup
        [], // roomsForStay
        [{ status_code: 'TRAVEL_PREPARED' }], // assertGroupAllowsAccommodationChange
      ]);
      const service = new GroupHotelStaysService(
        db as any,
        numbers as any,
        expenses as any,
        adjustments as any,
      );

      await expect(service.deleteStay('stay-1', actorId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('getAccommodationCoverage', () => {
    it('returns empty coverage when no confirmed stays', async () => {
      const db = createMockDb([
        [], // confirmedStaysForGroup returns empty
      ]);
      const service = new GroupHotelStaysService(
        db as any,
        numbers as any,
        expenses as any,
        adjustments as any,
      );

      const result = await service.getAccommodationCoverage('tg-1');

      expect(result.accommodation_ready).toBe(true);
      expect(result.total_confirmed_stays).toBe(0);
      expect(result.stays).toHaveLength(0);
    });

    it('reports missing members for a stay with incomplete assignments', async () => {
      const stayRow = {
        id: 'stay-1',
        stay_number: 'HS-001',
        hotel_name: 'Hilton',
        check_in_date: new Date('2026-09-20'),
        check_out_date: new Date('2026-09-25'),
        sequence_order: 1,
        city_name: 'Makkah',
        status_code: 'CONFIRMED',
      };
      const db = createMockDb([
        [stayRow], // confirmedStaysForGroup
        [{ id: 'gm-1' }, { id: 'gm-2' }, { id: 'gm-3' }], // 3 active members
        [{ membership_id: 'gm-1' }, { membership_id: 'gm-2' }], // 2 assigned
      ]);
      const service = new GroupHotelStaysService(
        db as any,
        numbers as any,
        expenses as any,
        adjustments as any,
      );

      const result = await service.getAccommodationCoverage('tg-1');

      expect(result.total_confirmed_stays).toBe(1);
      expect(result.stays[0].active_member_count).toBe(3);
      expect(result.stays[0].assigned_count).toBe(2);
      expect(result.stays[0].missing_count).toBe(1);
      expect(result.stays[0].complete).toBe(false);
      expect(result.accommodation_ready).toBe(false);
    });

    it('reports accommodation ready when all members assigned in all stays', async () => {
      const stay1 = {
        id: 'stay-1',
        stay_number: 'HS-001',
        hotel_name: 'Makkah Hotel',
        check_in_date: new Date('2026-09-20'),
        check_out_date: new Date('2026-09-25'),
        sequence_order: 1,
        city_name: 'Makkah',
        status_code: 'CONFIRMED',
      };
      const stay2 = {
        id: 'stay-2',
        stay_number: 'HS-002',
        hotel_name: 'Madinah Hotel',
        check_in_date: new Date('2026-09-25'),
        check_out_date: new Date('2026-09-30'),
        sequence_order: 2,
        city_name: 'Madinah',
        status_code: 'CONFIRMED',
      };
      const db = createMockDb([
        [stay1, stay2],
        [{ id: 'gm-1' }, { id: 'gm-2' }],
        [{ membership_id: 'gm-1' }, { membership_id: 'gm-2' }],
        [{ membership_id: 'gm-1' }, { membership_id: 'gm-2' }],
      ]);
      const service = new GroupHotelStaysService(
        db as any,
        numbers as any,
        expenses as any,
        adjustments as any,
      );

      const result = await service.getAccommodationCoverage('tg-1');

      expect(result.total_confirmed_stays).toBe(2);
      expect(result.stays).toHaveLength(2);
      expect(result.stays[0].complete).toBe(true);
      expect(result.stays[1].complete).toBe(true);
      expect(result.accommodation_ready).toBe(true);
    });

    it('reports not ready when members assigned in one stay but not another', async () => {
      const stay1 = {
        id: 'stay-1',
        stay_number: 'HS-001',
        hotel_name: 'Makkah Hotel',
        check_in_date: new Date('2026-09-20'),
        check_out_date: new Date('2026-09-25'),
        sequence_order: 1,
        city_name: 'Makkah',
        status_code: 'CONFIRMED',
      };
      const stay2 = {
        id: 'stay-2',
        stay_number: 'HS-002',
        hotel_name: 'Madinah Hotel',
        check_in_date: new Date('2026-09-25'),
        check_out_date: new Date('2026-09-30'),
        sequence_order: 2,
        city_name: 'Madinah',
        status_code: 'CONFIRMED',
      };
      const db = createMockDb([
        [stay1, stay2],
        [{ id: 'gm-1' }, { id: 'gm-2' }],
        [{ membership_id: 'gm-1' }, { membership_id: 'gm-2' }],
        [{ membership_id: 'gm-1' }],
      ]);
      const service = new GroupHotelStaysService(
        db as any,
        numbers as any,
        expenses as any,
        adjustments as any,
      );

      const result = await service.getAccommodationCoverage('tg-1');

      expect(result.stays[0].complete).toBe(true);
      expect(result.stays[1].complete).toBe(false);
      expect(result.stays[1].missing_count).toBe(1);
      expect(result.accommodation_ready).toBe(false);
    });
  });
});
