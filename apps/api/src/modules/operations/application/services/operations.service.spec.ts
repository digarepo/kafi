import { describe, expect, it, vi } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { GroupMembershipsService } from './group-memberships.service.js';
import { GuaranteesService } from './guarantees.service.js';
import { createMockDb } from './mock-db.js';

const actorId = 'actor-1';
const statusActive = { id: 'st-active', status_code: 'ACTIVE', name: 'Active' };
const statusTransferred = {
  id: 'st-transferred',
  status_code: 'TRANSFERRED',
  name: 'Transferred',
};
const statusCancelled = {
  id: 'st-cancelled',
  status_code: 'CANCELLED',
  name: 'Cancelled',
};

function membershipRow(overrides: any = {}) {
  const id = overrides.id ?? 'm-1';
  const registrationStatusCode =
    overrides.registration_status_code ?? 'READY_FOR_TRAVEL';
  const registrationStatusName = registrationStatusCode;
  return [
    {
      group_memberships: {
        id,
        travel_group_id: overrides.travel_group_id ?? 'tg-1',
        registration_id: 'reg-1',
        group_membership_status_id: statusActive.id,
        joined_at: new Date(),
        left_at: null,
        transferred_from_group_membership_id:
          overrides.transferred_from_group_membership_id ?? null,
        guarantee_required:
          overrides.guarantee_required !== undefined
            ? overrides.guarantee_required
            : false,
        guarantee_waived:
          overrides.guarantee_waived !== undefined
            ? overrides.guarantee_waived
            : false,
        guarantee_waived_by: null,
        guarantee_waived_at: null,
        remarks: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      group_membership_statuses: {
        id: statusActive.id,
        status_code: 'ACTIVE',
        name: 'Active',
      },
      registrations: { id: 'reg-1', registration_number: 'REG-001' },
      registration_statuses: {
        id: 'rs-ready',
        status_code: registrationStatusCode,
        name: registrationStatusName,
      },
      travellers: { id: 'trv-1', first_name: 'Abebe', last_name: 'Kebede' },
      travel_groups: { id: 'tg-1', name: 'Group A', group_number: 'TGR-1' },
    },
  ];
}

function groupRow(overrides: any = {}) {
  return [
    {
      travel_groups: {
        id: overrides.id ?? 'tg-1',
        name: 'Group A',
        group_number: 'TGR-1',
        package_version_id: overrides.package_version_id ?? 'pv-1',
        maximum_capacity: overrides.maximum_capacity ?? 10,
        departure_date: '2026-01-01',
        return_date: '2026-01-10',
        is_deleted: false,
      },
      travel_group_statuses: {
        id: 'tgs-1',
        status_code: overrides.status_code ?? 'PLANNING',
        name: 'Planning',
      },
      package_versions: { id: 'pv-1', version_name: 'V1' },
    },
  ];
}

function registrationRow(
  statusCode = 'READY_FOR_TRAVEL',
  packageVersionId = 'pv-1',
) {
  // findRegistration uses a select mapping that returns a flat shape:
  // { id, status_code, package_version_id }
  return [
    {
      id: 'reg-1',
      status_code: statusCode,
      package_version_id: packageVersionId,
    },
  ];
}

function guaranteeRow(overrides: any = {}) {
  const id = overrides.id ?? 'g-1';
  return [
    {
      guarantees: {
        id,
        guarantee_number: 'GUA-2026-000001',
        group_membership_id: 'm-1',
        registration_id: 'reg-1',
        guarantee_type: 'PERSON',
        guarantee_status: overrides.guarantee_status ?? 'ACTIVE',
        contact_person_id: 'cp-1',
        instrument_reference: null,
        amount: '100.00',
        currency_id: 'cur-1',
        effective_date: new Date('2026-01-01'),
        expiry_date: new Date('2026-12-31'),
        issuer: null,
        previous_guarantee_id: overrides.previous_guarantee_id ?? null,
        replaced_by_id: overrides.replaced_by_id ?? null,
        notes: null,
      },
      contact_persons: { id: 'cp-1', first_name: 'Abebe', last_name: 'Kebede' },
      currencies: { id: 'cur-1', code: 'ETB', name: 'Birr' },
      group_memberships: { id: 'm-1' },
    },
  ];
}

function membershipWithGroupRow(statusCode = 'PLANNING') {
  return [
    {
      group_memberships: {
        id: 'm-1',
        travel_group_id: 'tg-1',
      },
      travel_groups: {
        id: 'tg-1',
      },
      travel_group_statuses: {
        id: 'tgs-1',
        status_code: statusCode,
        name: statusCode,
      },
    },
  ];
}

describe('GroupMembershipsService', () => {
  it('prevents duplicate active memberships for a registration', async () => {
    const db = createMockDb([
      groupRow(),
      registrationRow(),
      [statusActive],
      [{ group_memberships: { id: 'existing' } }],
    ]);
    const service = new GroupMembershipsService(
      db as any,
      {
        releaseAssignmentsForMembership: vi.fn().mockResolvedValue(0),
      } as any,
    );

    await expect(
      service.createMembership(
        {
          travel_group_id: 'tg-1',
          registration_id: 'reg-1',
        } as any,
        actorId,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('enforces maximum capacity when creating a membership', async () => {
    const db = createMockDb([
      groupRow({ maximum_capacity: 1 }),
      registrationRow(),
      [statusActive],
      [],
      [statusActive],
      [{ count: 1 }],
    ]);
    const service = new GroupMembershipsService(
      db as any,
      {
        releaseAssignmentsForMembership: vi.fn().mockResolvedValue(0),
      } as any,
    );

    await expect(
      service.createMembership(
        {
          travel_group_id: 'tg-1',
          registration_id: 'reg-1',
        } as any,
        actorId,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects create when registration package version does not match group', async () => {
    const db = createMockDb([
      groupRow({ package_version_id: 'pv-1' }),
      registrationRow('READY_FOR_TRAVEL', 'pv-2'),
    ]);
    const service = new GroupMembershipsService(
      db as any,
      {
        releaseAssignmentsForMembership: vi.fn().mockResolvedValue(0),
      } as any,
    );

    await expect(
      service.createMembership(
        {
          travel_group_id: 'tg-1',
          registration_id: 'reg-1',
        } as any,
        actorId,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('allows create when registration package version matches group', async () => {
    const db = createMockDb([
      groupRow({ package_version_id: 'pv-1' }),
      registrationRow('READY_FOR_TRAVEL', 'pv-1'),
      [statusActive],
      [],
      [statusActive],
      [{ count: 0 }],
      [statusActive],
      [], // insert result
      membershipRow(), // final getMembership
    ]);
    const service = new GroupMembershipsService(
      db as any,
      {
        releaseAssignmentsForMembership: vi.fn().mockResolvedValue(0),
      } as any,
    );

    const result = await service.createMembership(
      {
        travel_group_id: 'tg-1',
        registration_id: 'reg-1',
      } as any,
      actorId,
    );

    expect(result.id).toBe('m-1');
    expect(db.insertValues.length).toBe(1);
    const insert = db.insertValues[0] as any;
    expect(insert.guarantee_required).toBe(false);
    expect(insert.guarantee_waived).toBe(false);
  });

  it('rejects create when registration is not READY_FOR_TRAVEL', async () => {
    const db = createMockDb([groupRow(), registrationRow('PROCESSING')]);
    const service = new GroupMembershipsService(
      db as any,
      {
        releaseAssignmentsForMembership: vi.fn().mockResolvedValue(0),
      } as any,
    );

    await expect(
      service.createMembership(
        {
          travel_group_id: 'tg-1',
          registration_id: 'reg-1',
        } as any,
        actorId,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('does not require guarantee information at membership creation', async () => {
    // Guarantee is owned by registration intake. A READY_FOR_TRAVEL
    // registration has already satisfied its guarantee gate, so membership
    // creation must succeed without any guarantee check.
    const db = createMockDb([
      groupRow(),
      registrationRow(),
      [statusActive],
      [],
      [statusActive],
      [{ count: 0 }],
      [statusActive],
      [], // insert result
      membershipRow(), // final getMembership
    ]);
    const service = new GroupMembershipsService(
      db as any,
      {
        releaseAssignmentsForMembership: vi.fn().mockResolvedValue(0),
      } as any,
    );

    const result = await service.createMembership(
      {
        travel_group_id: 'tg-1',
        registration_id: 'reg-1',
      } as any,
      actorId,
    );

    expect(result.id).toBe('m-1');
  });

  it('records transferred_from_group_membership_id on transfer', async () => {
    const oldId = 'm-old';
    const db = createMockDb([
      membershipRow({ id: oldId }),
      groupRow({ id: 'tg-2', package_version_id: 'pv-1' }),
      registrationRow('READY_FOR_TRAVEL', 'pv-1'),
      [statusActive],
      [{ count: 0 }],
      [statusTransferred],
      [statusActive],
      [],
      [],
      membershipRow({
        id: 'm-new',
        transferred_from_group_membership_id: oldId,
      }),
    ]);
    const service = new GroupMembershipsService(
      db as any,
      {
        releaseAssignmentsForMembership: vi.fn().mockResolvedValue(0),
      } as any,
    );

    const result = await service.transferMembership(
      oldId,
      { target_travel_group_id: 'tg-2' } as any,
      actorId,
    );

    expect(result.transferred_from_group_membership_id).toBe(oldId);
    expect(db.insertValues.length).toBe(1);
    const insert = db.insertValues[0] as any;
    expect(insert.transferred_from_group_membership_id).toBe(oldId);
  });

  it('rejects transfer when registration package version does not match target group', async () => {
    const oldId = 'm-old';
    const db = createMockDb([
      membershipRow({ id: oldId }),
      groupRow({ id: 'tg-2', package_version_id: 'pv-2' }),
      registrationRow('READY_FOR_TRAVEL', 'pv-1'),
    ]);
    const service = new GroupMembershipsService(
      db as any,
      {
        releaseAssignmentsForMembership: vi.fn().mockResolvedValue(0),
      } as any,
    );

    await expect(
      service.transferMembership(
        oldId,
        { target_travel_group_id: 'tg-2' } as any,
        actorId,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects transfer when registration is not READY_FOR_TRAVEL', async () => {
    const oldId = 'm-old';
    const db = createMockDb([
      membershipRow({
        id: oldId,
        registration_status_code: 'PROCESSING',
      }),
    ]);
    const service = new GroupMembershipsService(
      db as any,
      {
        releaseAssignmentsForMembership: vi.fn().mockResolvedValue(0),
      } as any,
    );

    await expect(
      service.transferMembership(
        oldId,
        { target_travel_group_id: 'tg-2' } as any,
        actorId,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('blocks membership deletion when group is TRAVEL_PREPARED', async () => {
    const db = createMockDb([
      membershipRow({ id: 'm-1' }),
      [{ status_code: 'TRAVEL_PREPARED' }],
      [statusCancelled],
    ]);
    const service = new GroupMembershipsService(
      db as any,
      {
        releaseAssignmentsForMembership: vi.fn().mockResolvedValue(0),
      } as any,
    );

    await expect(service.deleteMembership('m-1', actorId)).rejects.toThrow(
      ConflictException,
    );
  });

  it('blocks membership deletion when group is DEPARTED', async () => {
    const db = createMockDb([
      membershipRow({ id: 'm-1' }),
      [{ status_code: 'DEPARTED' }],
      [statusCancelled],
    ]);
    const service = new GroupMembershipsService(
      db as any,
      {
        releaseAssignmentsForMembership: vi.fn().mockResolvedValue(0),
      } as any,
    );

    await expect(service.deleteMembership('m-1', actorId)).rejects.toThrow(
      ConflictException,
    );
  });

  it('blocks membership deletion when group is COMPLETED', async () => {
    const db = createMockDb([
      membershipRow({ id: 'm-1' }),
      [{ status_code: 'COMPLETED' }],
      [statusCancelled],
    ]);
    const service = new GroupMembershipsService(
      db as any,
      {
        releaseAssignmentsForMembership: vi.fn().mockResolvedValue(0),
      } as any,
    );

    await expect(service.deleteMembership('m-1', actorId)).rejects.toThrow(
      ConflictException,
    );
  });

  it('allows membership deletion when group is PLANNING', async () => {
    const db = createMockDb([
      membershipRow({ id: 'm-1' }),
      [{ status_code: 'PLANNING' }],
      [statusCancelled],
    ]);
    const service = new GroupMembershipsService(
      db as any,
      {
        releaseAssignmentsForMembership: vi.fn().mockResolvedValue(0),
      } as any,
    );

    await service.deleteMembership('m-1', actorId);
    expect(db.updateSets.length).toBe(1);
    const update = db.updateSets[0] as any;
    expect(update.is_deleted).toBe(true);
  });
});

describe('GuaranteesService', () => {
  it('replaces a guarantee and stores the link to the original', async () => {
    const oldId = 'g-old';
    const db = createMockDb([
      guaranteeRow({ id: oldId, guarantee_status: 'ACTIVE' }),
      membershipWithGroupRow('PLANNING'),
      [],
      [],
      [],
      guaranteeRow({
        id: 'g-new',
        previous_guarantee_id: oldId,
        guarantee_status: 'ACTIVE',
      }),
    ]);
    const numbers = {
      generateGuaranteeNumber: vi.fn().mockResolvedValue('GUA-2026-000002'),
    };
    const service = new GuaranteesService(db as any, numbers as any);

    const result = await service.replaceGuarantee(
      oldId,
      {
        guarantee_type: 'PERSON',
        contact_person_id: 'cp-1',
        effective_date: '2026-01-01',
        expiry_date: '2026-12-31',
      } as any,
      actorId,
    );

    expect(result.previous_guarantee_id).toBe(oldId);
    expect(db.insertValues.length).toBe(1);
    const insert = db.insertValues[0] as any;
    expect(insert.previous_guarantee_id).toBe(oldId);
    expect(db.updateSets.length).toBe(1);
    const update = db.updateSets[0] as any;
    expect(update.guarantee_status).toBe('REPLACED');
    expect(update.replaced_by_id).toBe(insert.id);
  });
});
