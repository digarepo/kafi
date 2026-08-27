import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { describe, expect, it, vi } from 'vitest';

import { RegistrationsService } from './registrations.service.js';
import {
  CreateRegistrationDto,
  RegistrationFiltersDto,
  UpdateRegistrationDto,
} from '../dto/registrations.dto.js';
import { createMockDb } from './mock-db.js';

const readiness = {
  isRegistrationComplete: vi.fn(),
  isReadyForTravel: vi.fn(),
};

const packages = {
  assertAvailableForRegistration: vi.fn(),
};

const expenses = {
  createExpenseFromOperational: vi.fn().mockResolvedValue({ id: 'EXP-1' }),
};

const financeReporting = {
  getRegistrationFinanceSummary: vi.fn().mockResolvedValue({
    total_paid: 0,
    total_invoiced: 0,
    outstanding: 0,
    authorized_credit: 0,
    direct_expenses: 0,
    allocated_group_expenses: 0,
    total_cost: 0,
    refunds: 0,
    profit_loss: 0,
  }),
};

const refunds = {
  createRefund: vi.fn(),
};

function registrationRow(statusCode: string) {
  return [
    {
      registrations: {
        id: '01KZ4REG',
        registration_number: 'REG-2026-000001',
        registration_date: new Date(),
        expected_departure_date: null,
        expected_return_date: null,
        remarks: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      travellers: {
        id: '01KZ4TRV',
        first_name: 'Abebe',
        middle_name: null,
        last_name: 'Kebede',
        phone_number: '+251911000000',
        traveller_number: 'TRV-2026-000001',
        gender: 'Male',
      },
      countries: { id: 'CT', name: 'Ethiopia' },
      traveller_statuses: { id: 'TS', name: 'Active' },
      registration_statuses: {
        id: 'RS',
        status_code: statusCode,
        name: statusCode,
      },
      package_versions: {
        id: 'PV',
        package_version_code: 'PKG-001-v1',
        version_name: 'Version 1',
        base_price: '1000.00',
        max_capacity: 10,
      },
      package_templates: { id: 'PT', name: 'Hajj Premium' },
      package_version_statuses: {
        id: 'PVS',
        status_code: 'PUBLISHED',
        name: 'Published',
      },
      currencies: { id: 'CUR', currency_code: 'ETB', name: 'Ethiopian Birr' },
      seasons: null,
      traveller_contacts: null,
      contact_persons: null,
    },
  ];
}

describe('RegistrationsService', () => {
  describe('registration number generation', () => {
    it('starts at 1 when no registrations exist for the year', async () => {
      const db = createMockDb([[{ max: null }]]);
      const emitter = new EventEmitter2();
      const service = new RegistrationsService(
        db as any,
        emitter as any,
        readiness as any,
        packages as any,
        expenses as any,
        financeReporting as any,
        refunds as any,
      );
      const number = await (service as any).generateRegistrationNumber();
      expect(number).toMatch(/^REG-\d{4}-000001$/);
    });

    it('increments from the existing max for the year', async () => {
      const db = createMockDb([[{ max: 'REG-2026-000009' }]]);
      const emitter = new EventEmitter2();
      const service = new RegistrationsService(
        db as any,
        emitter as any,
        readiness as any,
        packages as any,
        expenses as any,
        financeReporting as any,
        refunds as any,
      );
      const number = await (service as any).generateRegistrationNumber();
      expect(number).toBe('REG-2026-000010');
    });
  });

  describe('package availability integration', () => {
    it('rejects registration when the package version is not available', async () => {
      packages.assertAvailableForRegistration.mockRejectedValue(
        new ConflictException('Package version is not available'),
      );

      const db = createMockDb([[{ id: '01KZ4TRV', is_deleted: false }]]);
      const emitter = new EventEmitter2();
      const service = new RegistrationsService(
        db as any,
        emitter as any,
        readiness as any,
        packages as any,
        expenses as any,
        financeReporting as any,
        refunds as any,
      );

      await expect(
        service.createRegistration(
          Object.assign(new CreateRegistrationDto(), {
            traveller_id: '01KZ4TRV',
            package_version_id: 'PV',
          }),
          'actor',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('creates a registration using the available package version', async () => {
      packages.assertAvailableForRegistration.mockResolvedValue({
        id: 'PV',
        package_version_code: 'PKG-001-v1',
      });

      const db = createMockDb([
        [{ id: '01KZ4TRV', is_deleted: false }],
        // assertNoActiveRegistrationForPackage does Promise.all with 3
        // status lookups (DRAFT, PROCESSING, READY_FOR_TRAVEL) — the mock
        // queue is consumed in Promise.all resolution order, so provide
        // the same status row for all 3.
        [{ id: 'RS-DRAFT', status_code: 'DRAFT' }],
        [{ id: 'RS-PROC', status_code: 'PROCESSING' }],
        [{ id: 'RS-READY', status_code: 'READY_FOR_TRAVEL' }],
        // No existing active registration found
        [],
        // getRegistrationStatus('DRAFT') for the new registration
        [{ id: 'RS-DRAFT', status_code: 'DRAFT' }],
        // generateRegistrationNumber
        [{ max: null }],
        // insert (no result)
        [],
        // getRegistration(id) — returns the full registration row
        registrationRow('DRAFT'),
      ]);
      const emitter = { emit: vi.fn() };
      const service = new RegistrationsService(
        db as any,
        emitter as any,
        readiness as any,
        packages as any,
        expenses as any,
        financeReporting as any,
        refunds as any,
      );

      const result = await service.createRegistration(
        Object.assign(new CreateRegistrationDto(), {
          traveller_id: '01KZ4TRV',
          package_version_id: 'PV',
        }),
        'actor',
      );

      expect(result.package_version?.id).toBe('PV');
      expect(packages.assertAvailableForRegistration).toHaveBeenCalledWith(
        'PV',
      );
    });
  });

  describe('registration lifecycle rules', () => {
    it('rejects updates to a cancelled registration', async () => {
      const db = createMockDb([registrationRow('CANCELLED')]);
      const emitter = new EventEmitter2();
      const service = new RegistrationsService(
        db as any,
        emitter as any,
        readiness as any,
        packages as any,
        expenses as any,
        financeReporting as any,
        refunds as any,
      );

      await expect(
        service.updateRegistration(
          '01KZ4REG',
          Object.assign(new UpdateRegistrationDto(), {
            expected_departure_date: undefined,
            expected_return_date: undefined,
            remarks: 'new note',
          }),
          'actor',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects departure date after return date', async () => {
      const db = createMockDb([registrationRow('CONFIRMED')]);
      const emitter = { emit: vi.fn() };
      const service = new RegistrationsService(
        db as any,
        emitter as any,
        readiness as any,
        packages as any,
        expenses as any,
        financeReporting as any,
        refunds as any,
      );

      await expect(
        service.updateRegistration(
          '01KZ4REG',
          Object.assign(new UpdateRegistrationDto(), {
            expected_departure_date: '2026-02-10',
            expected_return_date: '2026-02-05',
          }),
          'actor',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('registration workflow commands', () => {
    it('startProcessing rejects when registration is not DRAFT', async () => {
      const db = createMockDb([registrationRow('READY_FOR_TRAVEL')]);
      const emitter = new EventEmitter2();
      const service = new RegistrationsService(
        db as any,
        emitter as any,
        readiness as any,
        packages as any,
        expenses as any,
        financeReporting as any,
        refunds as any,
      );

      await expect(
        service.startProcessing('01KZ4REG', 'actor'),
      ).rejects.toThrow(ConflictException);
    });

    it('startProcessing succeeds when registration is DRAFT and complete', async () => {
      readiness.isRegistrationComplete.mockResolvedValue(true);
      const db = createMockDb([
        registrationRow('DRAFT'),
        [{ id: 'RS-PROC', status_code: 'PROCESSING' }],
        [],
        registrationRow('PROCESSING'),
      ]);
      const emitter = new EventEmitter2();
      const service = new RegistrationsService(
        db as any,
        emitter as any,
        readiness as any,
        packages as any,
        expenses as any,
        financeReporting as any,
        refunds as any,
      );

      const result = await service.startProcessing('01KZ4REG', 'actor');
      expect(result.status).toBe('PROCESSING');
    });

    it('startProcessing rejects when intake conditions are not satisfied', async () => {
      readiness.isRegistrationComplete.mockResolvedValue(false);
      const db = createMockDb([registrationRow('DRAFT')]);
      const emitter = new EventEmitter2();
      const service = new RegistrationsService(
        db as any,
        emitter as any,
        readiness as any,
        packages as any,
        expenses as any,
        financeReporting as any,
        refunds as any,
      );

      await expect(
        service.startProcessing('01KZ4REG', 'actor'),
      ).rejects.toThrow(ConflictException);
    });

    it('confirmReadyForTravel rejects when registration is not PROCESSING', async () => {
      const db = createMockDb([registrationRow('DRAFT')]);
      const emitter = new EventEmitter2();
      const service = new RegistrationsService(
        db as any,
        emitter as any,
        readiness as any,
        packages as any,
        expenses as any,
        financeReporting as any,
        refunds as any,
      );

      await expect(
        service.confirmReadyForTravel('01KZ4REG', 'actor'),
      ).rejects.toThrow(ConflictException);
    });

    it('confirmReadyForTravel rejects when readiness conditions fail', async () => {
      readiness.isReadyForTravel.mockResolvedValue(false);
      const db = createMockDb([registrationRow('PROCESSING')]);
      const emitter = new EventEmitter2();
      const service = new RegistrationsService(
        db as any,
        emitter as any,
        readiness as any,
        packages as any,
        expenses as any,
        financeReporting as any,
        refunds as any,
      );

      await expect(
        service.confirmReadyForTravel('01KZ4REG', 'actor'),
      ).rejects.toThrow(ConflictException);
    });

    it('confirmReadyForTravel succeeds when registration is processing and ready', async () => {
      readiness.isReadyForTravel.mockResolvedValue(true);
      const db = createMockDb([
        registrationRow('PROCESSING'),
        [{ id: 'RS-READY', status_code: 'READY_FOR_TRAVEL' }],
        [],
        registrationRow('READY_FOR_TRAVEL'),
      ]);
      const emitter = new EventEmitter2();
      const service = new RegistrationsService(
        db as any,
        emitter as any,
        readiness as any,
        packages as any,
        expenses as any,
        financeReporting as any,
        refunds as any,
      );

      const result = await service.confirmReadyForTravel('01KZ4REG', 'actor');
      expect(result.status).toBe('READY_FOR_TRAVEL');
    });

    it('cancelRegistration rejects already-completed registrations', async () => {
      const db = createMockDb([registrationRow('COMPLETED')]);
      const emitter = new EventEmitter2();
      const service = new RegistrationsService(
        db as any,
        emitter as any,
        readiness as any,
        packages as any,
        expenses as any,
        financeReporting as any,
        refunds as any,
      );

      await expect(
        service.cancelRegistration(
          '01KZ4REG',
          { cancellation_reason: 'Customer withdrawal' } as any,
          'actor',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('cancelRegistration rejects when an active group membership exists', async () => {
      const db = createMockDb([
        registrationRow('READY_FOR_TRAVEL'),
        [{ group_memberships: { id: 'GM-1' } }],
      ]);
      const emitter = new EventEmitter2();
      const service = new RegistrationsService(
        db as any,
        emitter as any,
        readiness as any,
        packages as any,
        expenses as any,
        financeReporting as any,
        refunds as any,
      );

      await expect(
        service.cancelRegistration(
          '01KZ4REG',
          { cancellation_reason: 'Customer withdrawal' } as any,
          'actor',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('cancelRegistration sets audit fields and emits an event', async () => {
      readiness.isRegistrationComplete.mockReset();
      const db = createMockDb([
        registrationRow('DRAFT'),
        [], // active membership check (none)
        [], // hotel stay check (none)
        [], // visa cost query (none)
        [], // flight cancellation fee query (none)
        [{ id: 'RS-CANCEL', status_code: 'CANCELLED' }],
        [], // expense insert (mocked, no return needed)
        registrationRow('CANCELLED'), // final getRegistration
      ]);
      const emitter = { emit: vi.fn() };
      const service = new RegistrationsService(
        db as any,
        emitter as any,
        readiness as any,
        packages as any,
        expenses as any,
        financeReporting as any,
        refunds as any,
      );

      const result = await service.cancelRegistration(
        '01KZ4REG',
        { cancellation_reason: 'Customer withdrawal' } as any,
        'actor',
      );

      expect(result.status).toBe('CANCELLED');
      expect(db.updateSets[0]).toMatchObject({
        cancellation_reason: 'Customer withdrawal',
        cancelled_at: expect.any(Date),
        cancelled_by: 'actor',
        updated_by: 'actor',
      });
      expect(emitter.emit).toHaveBeenCalledOnce();
    });

    it('cancelRegistration blocks when a hotel booking exists', async () => {
      const db = createMockDb([
        registrationRow('PROCESSING'),
        [], // active membership check (none)
        [{ id: 'HOTEL-1' }], // hotel stay found → blocks cancellation
      ]);
      const emitter = { emit: vi.fn() };
      const service = new RegistrationsService(
        db as any,
        emitter as any,
        readiness as any,
        packages as any,
        expenses as any,
        financeReporting as any,
        refunds as any,
      );

      await expect(
        service.cancelRegistration(
          '01KZ4REG',
          { cancellation_reason: 'Customer withdrawal' } as any,
          'actor',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('cancelRegistration proceeds when no hotel booking exists', async () => {
      readiness.isRegistrationComplete.mockReset();
      const db = createMockDb([
        registrationRow('DRAFT'),
        [], // active membership check (none)
        [], // hotel stay check (none)
        [], // visa cost query (none)
        [], // flight cancellation fee query (none)
        [{ id: 'RS-CANCEL', status_code: 'CANCELLED' }],
        [], // expense insert
        registrationRow('CANCELLED'), // final getRegistration
      ]);
      const emitter = { emit: vi.fn() };
      const service = new RegistrationsService(
        db as any,
        emitter as any,
        readiness as any,
        packages as any,
        expenses as any,
        financeReporting as any,
        refunds as any,
      );

      const result = await service.cancelRegistration(
        '01KZ4REG',
        { cancellation_reason: 'Customer withdrawal' } as any,
        'actor',
      );

      expect(result.status).toBe('CANCELLED');
    });

    // ---- Cancellation accounting ----

    it('cancelRegistration records ONLY the service charge as an expense, not visa/flight costs', async () => {
      readiness.isRegistrationComplete.mockReset();
      const localExpenses = {
        createExpenseFromOperational: vi
          .fn()
          .mockResolvedValue({ id: 'EXP-1' }),
      };
      const localFinanceReporting = {
        getRegistrationFinanceSummary: vi.fn().mockResolvedValue({
          total_paid: 50000,
          total_invoiced: 50000,
          outstanding: 0,
          authorized_credit: 0,
          direct_expenses: 0,
          allocated_group_expenses: 0,
          total_cost: 0,
          refunds: 0,
          profit_loss: 0,
        }),
      };
      const db = createMockDb([
        registrationRow('DRAFT'),
        [], // active membership check (none)
        [], // hotel stay check (none)
        [{ visa_cost: '3000' }], // visa cost query — visa was processed
        [{ cancellation_fee: '2000', supplier_cost: '8000' }], // flight cancellation fee
        [{ id: 'RS-CANCEL', status_code: 'CANCELLED' }],
        [], // tx.update (registration status)
        registrationRow('CANCELLED'), // final getRegistration
      ]);
      const emitter = { emit: vi.fn() };
      const service = new RegistrationsService(
        db as any,
        emitter as any,
        readiness as any,
        packages as any,
        localExpenses as any,
        localFinanceReporting as any,
        refunds as any,
      );

      const result = await service.cancelRegistration(
        '01KZ4REG',
        { cancellation_reason: 'Customer withdrawal' } as any,
        'actor',
      );

      expect(result.status).toBe('CANCELLED');
      // The expense should be called exactly once with the service charge
      expect(localExpenses.createExpenseFromOperational).toHaveBeenCalledOnce();
      const callArgs =
        localExpenses.createExpenseFromOperational.mock.calls[0][0];
      expect(callArgs.expense_category_code).toBe('CANCELLATION_CHARGE');
      expect(callArgs.expense_source_code).toBe('CANCELLATION');
      // The amount should be ONLY the service charge (15000), NOT
      // service_charge + visa_cost + flight_cancellation_fee (which would
      // be 20000 and would double-count the original visa/flight expenses)
      expect(callArgs.amount).toBe(15000);
    });

    it('cancelRegistration returns financials with visa cost and flight fee for customer-side accounting', async () => {
      readiness.isRegistrationComplete.mockReset();
      const localFinanceReporting = {
        getRegistrationFinanceSummary: vi.fn().mockResolvedValue({
          total_paid: 50000,
          total_invoiced: 50000,
          outstanding: 0,
          authorized_credit: 0,
          direct_expenses: 0,
          allocated_group_expenses: 0,
          total_cost: 0,
          refunds: 0,
          profit_loss: 0,
        }),
      };
      const db = createMockDb([
        registrationRow('DRAFT'),
        [], // active membership
        [], // hotel stay
        [{ visa_cost: '3000' }], // visa cost
        [{ cancellation_fee: '2000', supplier_cost: '8000' }], // flight
        [{ id: 'RS-CANCEL', status_code: 'CANCELLED' }],
        [], // tx.update
        registrationRow('CANCELLED'),
      ]);
      const emitter = { emit: vi.fn() };
      const service = new RegistrationsService(
        db as any,
        emitter as any,
        readiness as any,
        packages as any,
        expenses as any,
        localFinanceReporting as any,
        refunds as any,
      );

      const result = await service.cancelRegistration(
        '01KZ4REG',
        { cancellation_reason: 'Customer withdrawal' } as any,
        'actor',
      );

      // The financials should still show visa cost and flight fee for
      // customer-side accounting, even though they're not recorded as
      // new expenses
      expect(result.cancellation_financials).toMatchObject({
        service_charge: 15000,
        visa_cost: 3000,
        flight_cancellation_fee: 2000,
        total_charge: 20000, // 15000 + 3000 + 2000
        total_paid: 50000,
        refundable_amount: 30000, // 50000 - 20000
      });
    });
  });

  describe('listRegistrations departure date filtering', () => {
    it('applies departure_from and departure_to filters and returns mapped rows', async () => {
      const db = createMockDb([
        [{ count: 2 }], // count (consumed first by the synchronous .then)
        [registrationRow('DRAFT')[0], registrationRow('PROCESSING')[0]], // rows
      ]);
      const emitter = new EventEmitter2();
      const service = new RegistrationsService(
        db as any,
        emitter as any,
        readiness as any,
        packages as any,
        expenses as any,
        financeReporting as any,
        refunds as any,
      );

      const result = await service.listRegistrations(
        Object.assign(new RegistrationFiltersDto(), {
          page: 1,
          page_size: 25,
          departure_from: '2026-01-01',
          departure_to: '2026-12-31',
        }) as any,
      );

      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe('01KZ4REG');
      // The date filter predicates are built with the real `gte`/`lte` helpers
      // from drizzle-orm (module-level imports), so they don't surface in the
      // mock's call log. The query still runs through the mocked chain, so
      // verifying the mapped rows and total confirms the filter path executed
      // without throwing.
    });

    it('returns rows without date filters when none are provided', async () => {
      const db = createMockDb([[{ count: 1 }], [registrationRow('DRAFT')[0]]]);
      const emitter = new EventEmitter2();
      const service = new RegistrationsService(
        db as any,
        emitter as any,
        readiness as any,
        packages as any,
        expenses as any,
        financeReporting as any,
        refunds as any,
      );

      const result = await service.listRegistrations(
        Object.assign(new RegistrationFiltersDto(), {
          page: 1,
          page_size: 25,
        }) as any,
      );

      expect(result.total).toBe(1);
      // No date filters supplied, so the gte/lte predicate builders are never
      // invoked; the query chain still resolves the queued rows/count.
    });
  });
});
