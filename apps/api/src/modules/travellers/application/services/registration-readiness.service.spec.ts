import { describe, expect, it, vi } from 'vitest';
import { RegistrationReadinessService } from './registration-readiness.service.js';
import { createMockDb } from '../../../finance/application/services/mock-db.js';

describe('RegistrationReadinessService', () => {
  describe('getReadinessDetailsForRegistrations — batch credit exception support', () => {
    it('includes authorized credit in batch readiness checks', async () => {
      const db = createMockDb([
        // Registrations
        [
          {
            id: 'reg-1',
            status: 'DRAFT',
            traveller_id: 'trav-1',
            package_version_id: 'pkg-1',
          },
        ],
        // Package status
        [{ id: 'pkg-1', status: 'PUBLISHED' }],
        // Primary contact
        [{ traveller_id: 'trav-1' }],
        // Documents (PASSPORT, PHOTO)
        [
          { traveller_id: 'trav-1', type_code: 'PASSPORT' },
          { traveller_id: 'trav-1', type_code: 'PHOTO' },
        ],
        // Visa
        [{ registration_id: 'reg-1' }],
        // Flight
        [{ registration_id: 'reg-1' }],
        // Guarantee
        [{ registration_id: 'reg-1' }],
        // Finance summary (outstanding balance of 10,000)
        [{ total_invoiced: 150000, total_paid: 140000, outstanding_balance: 10000 }],
        // Credit exceptions (authorized for 10,000)
        [{ registration_id: 'reg-1', authorized_amount: '10000' }],
      ]);

      const mockInvoices = {
        getRegistrationFinanceSummaries: vi.fn().mockResolvedValue(
          new Map([
            [
              'reg-1',
              {
                total_invoiced: 150000,
                total_paid: 140000,
                outstanding_balance: 10000,
              },
            ],
          ]),
        ),
      };

      const mockFinanceExceptions = {
        getActiveExceptionsForRegistrations: vi.fn().mockResolvedValue([
          { registration_id: 'reg-1', authorized_amount: 10000 },
        ]),
      };

      const service = new RegistrationReadinessService(
        db as any,
        mockInvoices as any,
        mockFinanceExceptions as any,
      );

      const result = await service.getReadinessDetailsForRegistrations(['reg-1']);
      const details = result.get('reg-1');

      expect(details).toBeDefined();
      expect(details?.has_authorized_credit).toBe(true);
      expect(details?.authorized_credit_amount).toBe(10000);
      expect(details?.intake_payment_satisfied).toBe(true);
      expect(details?.payment_satisfied).toBe(true);
    });

    it('blocks progression when credit is insufficient', async () => {
      const db = createMockDb([
        [
          {
            id: 'reg-1',
            status: 'DRAFT',
            traveller_id: 'trav-1',
            package_version_id: 'pkg-1',
          },
        ],
        [{ id: 'pkg-1', status: 'PUBLISHED' }],
        [{ traveller_id: 'trav-1' }],
        [
          { traveller_id: 'trav-1', type_code: 'PASSPORT' },
          { traveller_id: 'trav-1', type_code: 'PHOTO' },
        ],
        [{ registration_id: 'reg-1' }],
        [{ registration_id: 'reg-1' }],
        [{ registration_id: 'reg-1' }],
        [{ total_invoiced: 150000, total_paid: 130000, outstanding_balance: 20000 }],
        [{ registration_id: 'reg-1', authorized_amount: '10000' }],
      ]);

      const mockInvoices = {
        getRegistrationFinanceSummaries: vi.fn().mockResolvedValue(
          new Map([
            [
              'reg-1',
              {
                total_invoiced: 150000,
                total_paid: 130000,
                outstanding_balance: 20000,
              },
            ],
          ]),
        ),
      };

      const mockFinanceExceptions = {
        getActiveExceptionsForRegistrations: vi.fn().mockResolvedValue([
          { registration_id: 'reg-1', authorized_amount: 10000 },
        ]),
      };

      const service = new RegistrationReadinessService(
        db as any,
        mockInvoices as any,
        mockFinanceExceptions as any,
      );

      const result = await service.getReadinessDetailsForRegistrations(['reg-1']);
      const details = result.get('reg-1');

      expect(details).toBeDefined();
      expect(details?.has_authorized_credit).toBe(true);
      expect(details?.authorized_credit_amount).toBe(10000);
      expect(details?.intake_payment_satisfied).toBe(false);
      expect(details?.payment_satisfied).toBe(false);
      expect(details?.blockers).toContain('UNPAID_OR_MISSING_INVOICE');
    });

    it('handles registrations with no credit exception', async () => {
      const db = createMockDb([
        [
          {
            id: 'reg-1',
            status: 'DRAFT',
            traveller_id: 'trav-1',
            package_version_id: 'pkg-1',
          },
        ],
        [{ id: 'pkg-1', status: 'PUBLISHED' }],
        [{ traveller_id: 'trav-1' }],
        [
          { traveller_id: 'trav-1', type_code: 'PASSPORT' },
          { traveller_id: 'trav-1', type_code: 'PHOTO' },
        ],
        [{ registration_id: 'reg-1' }],
        [{ registration_id: 'reg-1' }],
        [{ registration_id: 'reg-1' }],
        [{ total_invoiced: 150000, total_paid: 150000, outstanding_balance: 0 }],
        [], // No credit exceptions
      ]);

      const mockInvoices = {
        getRegistrationFinanceSummaries: vi.fn().mockResolvedValue(
          new Map([
            [
              'reg-1',
              {
                total_invoiced: 150000,
                total_paid: 150000,
                outstanding_balance: 0,
              },
            ],
          ]),
        ),
      };

      const mockFinanceExceptions = {
        getActiveExceptionsForRegistrations: vi.fn().mockResolvedValue([]),
      };

      const service = new RegistrationReadinessService(
        db as any,
        mockInvoices as any,
        mockFinanceExceptions as any,
      );

      const result = await service.getReadinessDetailsForRegistrations(['reg-1']);
      const details = result.get('reg-1');

      expect(details).toBeDefined();
      expect(details?.has_authorized_credit).toBe(false);
      expect(details?.authorized_credit_amount).toBe(0);
      expect(details?.intake_payment_satisfied).toBe(true);
      expect(details?.payment_satisfied).toBe(true);
    });
  });
});
