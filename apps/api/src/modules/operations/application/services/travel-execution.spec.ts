import { describe, expect, it, vi } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { TravelGroupsService } from './travel-groups.service.js';
import { createMockDb } from './mock-db.js';

const actorId = 'SYSTEM';

const travelPreparedStatus = {
  id: 'tgs-tp',
  status_code: 'TRAVEL_PREPARED',
  name: 'Travel Prepared',
};
const departedStatus = {
  id: 'tgs-d',
  status_code: 'DEPARTED',
  name: 'Departed',
};
const completedStatus = {
  id: 'tgs-c',
  status_code: 'COMPLETED',
  name: 'Completed',
};
const planningStatus = {
  id: 'tgs-p',
  status_code: 'PLANNING',
  name: 'Planning',
};
const cancelledStatus = {
  id: 'tgs-x',
  status_code: 'CANCELLED',
  name: 'Cancelled',
};
const activeMembershipStatus = {
  id: 'gms-a',
  status_code: 'ACTIVE',
  name: 'Active',
};
const completedMembershipStatus = {
  id: 'gms-c',
  status_code: 'COMPLETED',
  name: 'Completed',
};
const cancelledMembershipStatus = {
  id: 'gms-x',
  status_code: 'CANCELLED',
  name: 'Cancelled',
};
const readyForTravelRegStatus = {
  id: 'rs-rft',
  status_code: 'READY_FOR_TRAVEL',
  name: 'Ready for Travel',
};
const completedRegStatus = {
  id: 'rs-c',
  status_code: 'COMPLETED',
  name: 'Completed',
};

function detailRow(overrides: any = {}) {
  const statusCode = overrides.status_code ?? 'TRAVEL_PREPARED';
  return [
    {
      travel_groups: {
        id: overrides.id ?? 'tg-1',
        name: 'Group A',
        group_number: overrides.group_number ?? 'TGR-001',
        package_version_id: 'pv-1',
        maximum_capacity: 10,
        departure_date: overrides.departure_date ?? '2020-01-01',
        return_date: overrides.return_date ?? '2020-01-10',
        travel_group_status_id: 'tgs-tp',
        remarks: overrides.remarks ?? null,
        is_deleted: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
      travel_group_statuses: {
        id: 'tgs-tp',
        status_code: statusCode,
        name: statusCode,
      },
      package_versions: { id: 'pv-1', version_name: 'V1' },
    },
  ];
}

function membersRow(overrides: any = {}) {
  const memberStatusCode = overrides.member_status_code ?? 'ACTIVE';
  const regStatusCode = overrides.reg_status_code ?? 'READY_FOR_TRAVEL';
  return [
    {
      group_memberships: {
        id: overrides.membership_id ?? 'gm-1',
        travel_group_id: overrides.travel_group_id ?? 'tg-1',
        registration_id: 'reg-1',
        group_membership_status_id:
          memberStatusCode === 'ACTIVE'
            ? activeMembershipStatus.id
            : memberStatusCode === 'COMPLETED'
              ? completedMembershipStatus.id
              : cancelledMembershipStatus.id,
        joined_at: new Date(),
        left_at: null,
        is_deleted: false,
      },
      group_membership_statuses: {
        id:
          memberStatusCode === 'ACTIVE'
            ? activeMembershipStatus.id
            : memberStatusCode === 'COMPLETED'
              ? completedMembershipStatus.id
              : cancelledMembershipStatus.id,
        status_code: memberStatusCode,
        name: memberStatusCode,
      },
      registrations: { id: 'reg-1', registration_number: 'REG-001' },
      registration_statuses: {
        id: 'rs-rft',
        status_code: regStatusCode,
        name: regStatusCode,
      },
      travellers: { id: 'trv-1', first_name: 'Abebe', last_name: 'Kebede' },
    },
  ];
}

function makeService(db: any) {
  const roomAssignmentsMock = {
    releaseAssignmentsForMembership: vi.fn().mockResolvedValue(0),
  };
  return {
    service: new TravelGroupsService(
      db as any,
      { nextTravelGroupNumber: vi.fn().mockResolvedValue('TGR-001') } as any,
      { emit: vi.fn() } as any,
      roomAssignmentsMock as any,
    ),
    roomAssignments: roomAssignmentsMock,
  };
}

// Each getTravelGroup call consumes 2 queue entries: detail row + members
function gtgQueue(overrides: any = {}) {
  return [detailRow(overrides), membersRow(overrides)];
}

// Queue entries for a depart() call:
// getTravelGroup(2) + statusIdFor(1) + update(1) + getTravelGroup(2) = 6
function departQueue(overrides: any = {}) {
  return [
    ...gtgQueue({ ...overrides, status_code: 'TRAVEL_PREPARED' }),
    [departedStatus],
    undefined,
    ...gtgQueue({ ...overrides, status_code: 'DEPARTED' }),
  ];
}

// Queue entries for a complete() call:
// getTravelGroup(2) + statusIdFor(1) + regStatusIdFor(1) + regStatusIdFor(1)
// + membershipStatusIdFor(1) + membershipStatusIdFor(1)
// + transaction[stillReady(1) + update group(1) + update regs(1) + update memberships(1)
//   + releaseAssignmentsForMembership per membership]
// + getTravelGroup(2)
function completeQueue(overrides: any = {}) {
  return [
    ...gtgQueue({ ...overrides, status_code: 'DEPARTED' }),
    [completedStatus],
    [completedRegStatus],
    [readyForTravelRegStatus],
    [completedMembershipStatus],
    [activeMembershipStatus],
    [{ id: 'reg-1' }], // stillReady check
    undefined, // update travel group
    undefined, // update registrations
    undefined, // update memberships
    ...gtgQueue({ ...overrides, status_code: 'COMPLETED' }),
  ];
}

// Queue for updateTravelGroup: getTravelGroup(2) + update(1) + getTravelGroup(2) = 5
function updateQueue(overrides: any = {}) {
  return [
    ...gtgQueue(overrides),
    undefined, // update result
    ...gtgQueue(overrides), // return getTravelGroup
  ];
}

// Queue for cancelTravelGroup:
// getTravelGroup(2) + statusIdFor(1) + membershipStatusIdFor(1) + membershipStatusIdFor(1)
// + transaction[update memberships(1) + releaseAssignments per membership + update group(1)]
// + getTravelGroup(2)
function cancelQueue(overrides: any = {}) {
  return [
    ...gtgQueue(overrides),
    [cancelledStatus],
    [cancelledMembershipStatus],
    [activeMembershipStatus],
    undefined, // update memberships
    undefined, // update group
    ...gtgQueue({ ...overrides, status_code: 'CANCELLED' }),
  ];
}

describe('TravelGroupsService — autoTransitionByDates', () => {
  it('transitions TRAVEL_PREPARED → DEPARTED when departure date has arrived (prerequisites valid)', async () => {
    const db = createMockDb([
      ...gtgQueue({
        status_code: 'TRAVEL_PREPARED',
        departure_date: '2020-01-01',
      }),
      ...departQueue({
        departure_date: '2020-01-01',
        return_date: '2099-12-31',
      }),
      ...gtgQueue({ status_code: 'DEPARTED', return_date: '2099-12-31' }),
    ]);

    const { service } = makeService(db);
    await service.autoTransitionByDates('tg-1');

    expect(db.updateSets.length).toBeGreaterThan(0);
  });

  it('remains TRAVEL_PREPARED + logs warning when prerequisites are invalid', async () => {
    const db = createMockDb([
      ...gtgQueue({
        status_code: 'TRAVEL_PREPARED',
        departure_date: '2020-01-01',
        reg_status_code: 'PROCESSING',
      }),
      // depart() will throw because members aren't READY_FOR_TRAVEL
      ...gtgQueue({
        status_code: 'TRAVEL_PREPARED',
        departure_date: '2020-01-01',
        reg_status_code: 'PROCESSING',
      }),
    ]);

    const { service } = makeService(db);
    // Should NOT throw — error is caught and logged
    await expect(
      service.autoTransitionByDates('tg-1'),
    ).resolves.toBeUndefined();
    // No status update should have been made
    expect(db.updateSets.length).toBe(0);
  });

  it('transitions DEPARTED → COMPLETED when return date has arrived', async () => {
    const db = createMockDb([
      ...gtgQueue({ status_code: 'DEPARTED', return_date: '2020-01-10' }),
      ...gtgQueue({ status_code: 'DEPARTED', return_date: '2020-01-10' }),
      ...completeQueue({ return_date: '2020-01-10' }),
    ]);

    const { service } = makeService(db);
    await service.autoTransitionByDates('tg-1');

    expect(db.updateSets.length).toBeGreaterThan(0);
  });

  it('is idempotent — does nothing when already COMPLETED', async () => {
    const db = createMockDb([...gtgQueue({ status_code: 'COMPLETED' })]);

    const { service } = makeService(db);
    await service.autoTransitionByDates('tg-1');

    expect(db.updateSets.length).toBe(0);
  });
});

describe('TravelGroupsService — processScheduledTransitions (tick)', () => {
  it('processes due departures and completions, returns summary', async () => {
    const db = createMockDb([
      // findGroupsDueForTransition:
      [travelPreparedStatus],
      [departedStatus],
      [{ id: 'tg-1', group_number: 'TGR-001' }],
      [{ id: 'tg-2', group_number: 'TGR-002' }],

      // depart('tg-1')
      ...departQueue({
        id: 'tg-1',
        group_number: 'TGR-001',
        departure_date: '2020-01-01',
        return_date: '2099-12-31',
      }),

      // complete('tg-2')
      ...completeQueue({
        id: 'tg-2',
        group_number: 'TGR-002',
        return_date: '2020-01-10',
      }),
    ]);

    const { service } = makeService(db);
    const result = await service.processScheduledTransitions();

    expect(result.departed).toHaveLength(1);
    expect(result.departed[0].group_number).toBe('TGR-001');
    expect(result.completed).toHaveLength(1);
    expect(result.completed[0].group_number).toBe('TGR-002');
    expect(result.warnings).toHaveLength(0);
  });

  it('records warnings for groups that fail to transition (partial failure isolation)', async () => {
    const db = createMockDb([
      [travelPreparedStatus],
      [departedStatus],
      [{ id: 'tg-1', group_number: 'TGR-001' }],
      [{ id: 'tg-2', group_number: 'TGR-002' }], // due for completion

      // depart('tg-1') — members not ready, throws
      ...gtgQueue({
        id: 'tg-1',
        status_code: 'TRAVEL_PREPARED',
        departure_date: '2020-01-01',
        reg_status_code: 'PROCESSING',
      }),

      // complete('tg-2') — succeeds
      ...completeQueue({
        id: 'tg-2',
        group_number: 'TGR-002',
        return_date: '2020-01-10',
      }),
    ]);

    const { service } = makeService(db);
    const result = await service.processScheduledTransitions();

    // tg-1 failed → warning, tg-2 succeeded → completed
    expect(result.departed).toHaveLength(0);
    expect(result.completed).toHaveLength(1);
    expect(result.completed[0].group_number).toBe('TGR-002');
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].group_number).toBe('TGR-001');
    expect(result.warnings[0].reason).toContain('READY_FOR_TRAVEL');
  });

  it('is idempotent — repeated calls with nothing due return empty', async () => {
    const db = createMockDb([[travelPreparedStatus], [departedStatus], [], []]);

    const { service } = makeService(db);
    const result = await service.processScheduledTransitions();

    expect(result.departed).toHaveLength(0);
    expect(result.completed).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });
});

describe('TravelGroupsService — updateTravelGroup date protection', () => {
  it('allows date edits in PLANNING status', async () => {
    const db = createMockDb(updateQueue({ status_code: 'PLANNING' }));

    const { service } = makeService(db);
    await service.updateTravelGroup(
      'tg-1',
      { departure_date: '2026-03-01', return_date: '2026-03-15' } as any,
      actorId,
    );

    expect(db.updateSets.length).toBe(1);
    expect(db.updateSets[0]).toHaveProperty('departure_date');
  });

  it('rejects date edits after PLANNING (TRAVEL_PREPARED)', async () => {
    const db = createMockDb([...gtgQueue({ status_code: 'TRAVEL_PREPARED' })]);

    const { service } = makeService(db);
    await expect(
      service.updateTravelGroup(
        'tg-1',
        { departure_date: '2026-03-01' } as any,
        actorId,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects date edits when DEPARTED', async () => {
    const db = createMockDb([...gtgQueue({ status_code: 'DEPARTED' })]);

    const { service } = makeService(db);
    await expect(
      service.updateTravelGroup(
        'tg-1',
        { return_date: '2026-03-15' } as any,
        actorId,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('allows non-date edits after PLANNING', async () => {
    const db = createMockDb(updateQueue({ status_code: 'TRAVEL_PREPARED' }));

    const { service } = makeService(db);
    await service.updateTravelGroup(
      'tg-1',
      { name: 'Updated name', remarks: 'Updated remarks' } as any,
      actorId,
    );

    expect(db.updateSets.length).toBe(1);
  });
});

describe('TravelGroupsService — complete() transactional consistency', () => {
  it('completes active memberships in the same transaction', async () => {
    const db = createMockDb([...completeQueue({ return_date: '2020-01-10' })]);

    const { service } = makeService(db);
    await service.complete('tg-1', actorId);

    // The mock's update() clears updateSets each time, so only the last
    // update's set remains. The last update in complete() is memberships.
    expect(db.updateSets.length).toBe(1);
    expect(db.updateSets[0]).toHaveProperty('group_membership_status_id');
    expect(db.updateSets[0]).toHaveProperty('left_at');
  });

  it('releases room assignments for completed memberships', async () => {
    const db = createMockDb([...completeQueue({ return_date: '2020-01-10' })]);

    const { service, roomAssignments } = makeService(db);
    await service.complete('tg-1', actorId);

    // releaseAssignmentsForMembership should have been called
    expect(roomAssignments.releaseAssignmentsForMembership).toHaveBeenCalled();
  });
});

describe('TravelGroupsService — cancelTravelGroup', () => {
  it('cancels a PLANNING group with active memberships', async () => {
    const db = createMockDb([...cancelQueue({ status_code: 'PLANNING' })]);

    const { service, roomAssignments } = makeService(db);
    const result = await service.cancelTravelGroup(
      'tg-1',
      'Visa rejected',
      actorId,
    );

    expect(result).toBeDefined();
    // Room assignments should have been released for active memberships
    expect(roomAssignments.releaseAssignmentsForMembership).toHaveBeenCalled();
  });

  it('cancels a TRAVEL_PREPARED group', async () => {
    const db = createMockDb([
      ...cancelQueue({ status_code: 'TRAVEL_PREPARED' }),
    ]);

    const { service } = makeService(db);
    const result = await service.cancelTravelGroup(
      'tg-1',
      'Cancelled',
      actorId,
    );

    expect(result).toBeDefined();
  });

  it('rejects cancellation of a DEPARTED group', async () => {
    const db = createMockDb([...gtgQueue({ status_code: 'DEPARTED' })]);

    const { service } = makeService(db);
    await expect(
      service.cancelTravelGroup('tg-1', 'reason', actorId),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects cancellation of a COMPLETED group', async () => {
    const db = createMockDb([...gtgQueue({ status_code: 'COMPLETED' })]);

    const { service } = makeService(db);
    await expect(
      service.cancelTravelGroup('tg-1', 'reason', actorId),
    ).rejects.toThrow(ConflictException);
  });

  it('releases room assignments for cancelled memberships', async () => {
    const db = createMockDb([...cancelQueue({ status_code: 'PLANNING' })]);

    const { service, roomAssignments } = makeService(db);
    await service.cancelTravelGroup('tg-1', 'reason', actorId);

    expect(roomAssignments.releaseAssignmentsForMembership).toHaveBeenCalled();
  });
});
