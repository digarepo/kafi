import { describe, expect, it, vi } from 'vitest';
import { RegistrationQueuesService } from './registration-queues.service.js';
import { createMockDb } from './mock-db.js';

describe('RegistrationQueuesService', () => {
  it('returns blocked-from-ready registrations with blocker details', async () => {
    const processingStatusId = 'processing-status-id';
    const registrationId = 'reg-1';
    const db = createMockDb([
      [{ id: processingStatusId }],
      [
        {
          registrations: {
            id: registrationId,
            registration_number: 'REG-001',
            registration_date: new Date(),
            expected_departure_date: null,
            expected_return_date: null,
          },
          registration_statuses: {
            id: processingStatusId,
            status_code: 'PROCESSING',
            name: 'Processing',
          },
          travellers: {
            id: 'traveller-1',
            first_name: 'Abebe',
            last_name: 'Kebede',
            phone_number: '0911000000',
            traveller_number: 'TRV-001',
          },
          package_versions: {
            id: 'pv-1',
            version_name: 'Jan 2026',
          },
        },
      ],
    ]);

    const readiness = {
      getReadinessDetailsForRegistrations: vi.fn().mockResolvedValue(
        new Map([
          [
            registrationId,
            {
              can_confirm_ready: false,
              blockers: ['OUTSTANDING_BALANCE'],
            },
          ],
        ]),
      ),
    };

    const invoices = { getRegistrationFinanceSummaries: vi.fn() } as any;

    const service = new RegistrationQueuesService(
      db as any,
      invoices,
      readiness as any,
    );

    const result = await service.getBlockedFromReadyQueue();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(registrationId);
    expect(result[0].blockers).toEqual(['OUTSTANDING_BALANCE']);
  });

  it('returns an empty array when no processing status is seeded', async () => {
    const db = createMockDb([[]]);
    const invoices = { getRegistrationFinanceSummaries: vi.fn() } as any;
    const readiness = {
      getReadinessDetailsForRegistrations: vi.fn(),
    };

    const service = new RegistrationQueuesService(
      db as any,
      invoices,
      readiness as any,
    );

    const result = await service.getBlockedFromReadyQueue();

    expect(result).toEqual([]);
    expect(readiness.getReadinessDetailsForRegistrations).not.toHaveBeenCalled();
  });
});
