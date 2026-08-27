import { describe, expect, it, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CreditExceptionRequestsService } from './credit-exception-requests.service.js';
import { createMockDb } from './mock-db.js';

/**
 * Minimal mock for FinanceExceptionsService — only the methods used by
 * CreditExceptionRequestsService.
 */
function createMockExceptionsService(
  overrides: Partial<{
    getActiveExceptionForRegistration: ReturnType<typeof vi.fn>;
    createException: ReturnType<typeof vi.fn>;
  }> = {},
) {
  return {
    getActiveExceptionForRegistration:
      overrides.getActiveExceptionForRegistration ??
      vi.fn().mockResolvedValue(null),
    createException:
      overrides.createException ?? vi.fn().mockResolvedValue({ id: 'exc-1' }),
  };
}

/**
 * Minimal mock for InvoicesService.
 */
function createMockInvoicesService(balance: number = 5000) {
  return {
    getOutstandingBalanceForRegistration: vi.fn().mockResolvedValue(balance),
  };
}

describe('CreditExceptionRequestsService', () => {
  describe('request number generation', () => {
    it('starts at 1 when no requests exist for the year', async () => {
      const db = createMockDb([[{ max: null }]]);
      const service = new CreditExceptionRequestsService(
        db as any,
        createMockExceptionsService() as any,
        createMockInvoicesService() as any,
      );
      const number = await (service as any).generateRequestNumber();
      expect(number).toMatch(/^CER-\d{4}-000001$/);
    });

    it('increments from the existing max for the year', async () => {
      const db = createMockDb([[{ max: 'CER-2026-000003' }]]);
      const service = new CreditExceptionRequestsService(
        db as any,
        createMockExceptionsService() as any,
        createMockInvoicesService() as any,
      );
      const number = await (service as any).generateRequestNumber();
      expect(number).toBe('CER-2026-000004');
    });
  });

  describe('request lookup', () => {
    it('throws NotFoundException when the request does not exist', async () => {
      const db = createMockDb([[]]);
      const service = new CreditExceptionRequestsService(
        db as any,
        createMockExceptionsService() as any,
        createMockInvoicesService() as any,
      );
      await expect(
        (service as any).getRequestOrThrow('missing-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('status lookup by code', () => {
    it('throws NotFoundException when the status code does not exist', async () => {
      const db = createMockDb([[]]);
      const service = new CreditExceptionRequestsService(
        db as any,
        createMockExceptionsService() as any,
        createMockInvoicesService() as any,
      );
      await expect((service as any).getStatusByCode('UNKNOWN')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createRequest — validation', () => {
    it('throws NotFoundException when registration does not exist', async () => {
      const db = createMockDb([[]]); // registration lookup returns empty
      const service = new CreditExceptionRequestsService(
        db as any,
        createMockExceptionsService() as any,
        createMockInvoicesService() as any,
      );
      await expect(
        service.createRequest(
          {
            registration_id: 'missing-reg',
            requested_amount: 1000,
            reason: 'Test',
          } as any,
          'actor-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when outstanding balance is 0', async () => {
      const db = createMockDb([[{ id: 'reg-1' }]]); // registration exists
      const service = new CreditExceptionRequestsService(
        db as any,
        createMockExceptionsService() as any,
        createMockInvoicesService(0) as any, // zero balance
      );
      await expect(
        service.createRequest(
          {
            registration_id: 'reg-1',
            requested_amount: 1000,
            reason: 'Test',
          } as any,
          'actor-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when requested amount exceeds outstanding balance', async () => {
      const db = createMockDb([[{ id: 'reg-1' }]]);
      const service = new CreditExceptionRequestsService(
        db as any,
        createMockExceptionsService() as any,
        createMockInvoicesService(500) as any, // balance 500
      );
      await expect(
        service.createRequest(
          {
            registration_id: 'reg-1',
            requested_amount: 1000,
            reason: 'Test',
          } as any,
          'actor-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when an active finance exception already exists', async () => {
      const db = createMockDb([[{ id: 'reg-1' }]]);
      const service = new CreditExceptionRequestsService(
        db as any,
        createMockExceptionsService({
          getActiveExceptionForRegistration: vi
            .fn()
            .mockResolvedValue({ authorized_amount: 5000 }),
        }) as any,
        createMockInvoicesService(5000) as any,
      );
      await expect(
        service.createRequest(
          {
            registration_id: 'reg-1',
            requested_amount: 1000,
            reason: 'Test',
          } as any,
          'actor-1',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('createRequest — active_request_lock concurrency', () => {
    it('sets active_request_lock to the request id when creating PENDING request', async () => {
      const db = createMockDb([
        [{ id: 'reg-1' }], // registration lookup
        [{ id: 'cer-pending', status_code: 'PENDING' }], // statusByCode PENDING
        [{ max: null }], // generateRequestNumber
        undefined, // insert
        [{ id: 'req-1', request_number: 'CER-2026-000001' }], // getRequest
      ]);
      const service = new CreditExceptionRequestsService(
        db as any,
        createMockExceptionsService() as any,
        createMockInvoicesService(5000) as any,
      );
      await service.createRequest(
        {
          registration_id: 'reg-1',
          requested_amount: 1000,
          reason: 'Test',
        } as any,
        'actor-1',
      );
      const insert = db.insertValues[0] as any;
      expect(insert.active_request_lock).toBeDefined();
      expect(insert.active_request_lock).toBe(insert.id);
    });

    it('converts duplicate entry DB error to ConflictException', async () => {
      const db = createMockDb([
        [{ id: 'reg-1' }],
        [{ id: 'cer-pending', status_code: 'PENDING' }],
        [{ max: null }],
      ]);
      (db as any).insert = vi.fn().mockReturnValue({
        values: vi.fn().mockImplementation(() => {
          const err: any = new Error('Duplicate entry');
          err.code = 'ER_DUP_ENTRY';
          err.errno = 1062;
          throw err;
        }),
      });
      const service = new CreditExceptionRequestsService(
        db as any,
        createMockExceptionsService() as any,
        createMockInvoicesService(5000) as any,
      );
      await expect(
        service.createRequest(
          {
            registration_id: 'reg-1',
            requested_amount: 1000,
            reason: 'Test',
          } as any,
          'actor-1',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('approveRequest', () => {
    it('throws ConflictException when request is not PENDING', async () => {
      const db = createMockDb([
        [{ id: 'req-1', credit_exception_request_status_id: 'st-approved' }],
        [{ id: 'cer-pending', status_code: 'PENDING' }],
      ]);
      const service = new CreditExceptionRequestsService(
        db as any,
        createMockExceptionsService() as any,
        createMockInvoicesService() as any,
      );
      await expect(service.approveRequest('req-1', 'admin-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('creates a finance exception and marks request as APPROVED', async () => {
      const mockExceptions = createMockExceptionsService({
        createException: vi.fn().mockResolvedValue({ id: 'exc-new' }),
      });
      const db = createMockDb([
        [
          {
            id: 'req-1',
            credit_exception_request_status_id: 'cer-pending-id',
            registration_id: 'reg-1',
            requested_amount: '1000',
            reason: 'Test',
            notes: null,
            requested_due_date: null,
          },
        ], // getRequestOrThrow
        [{ id: 'cer-pending-id', status_code: 'PENDING' }], // statusByCode PENDING (approve check)
        // createException is mocked — does NOT consume db queue
        [{ id: 'cer-approved', status_code: 'APPROVED' }], // statusByCode APPROVED
        undefined, // update
        [{ id: 'req-1', request_number: 'CER-2026-000001' }], // getRequest
      ]);
      const service = new CreditExceptionRequestsService(
        db as any,
        mockExceptions as any,
        createMockInvoicesService() as any,
      );
      await service.approveRequest('req-1', 'admin-1');
      expect(mockExceptions.createException).toHaveBeenCalledWith(
        expect.objectContaining({
          registration_id: 'reg-1',
          authorized_amount: 1000,
        }),
        'admin-1',
      );
      const set = db.updateSets[0] as any;
      expect(set.active_request_lock).toBeNull();
      expect(set.finance_exception_id).toBe('exc-new');
    });
  });

  describe('rejectRequest', () => {
    it('throws ConflictException when request is not PENDING', async () => {
      const db = createMockDb([
        [{ id: 'req-1', credit_exception_request_status_id: 'st-rejected' }],
        [{ id: 'cer-pending', status_code: 'PENDING' }],
      ]);
      const service = new CreditExceptionRequestsService(
        db as any,
        createMockExceptionsService() as any,
        createMockInvoicesService() as any,
      );
      await expect(
        service.rejectRequest(
          'req-1',
          { rejection_reason: 'Denied' } as any,
          'admin-1',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('clears active_request_lock and sets rejection_reason', async () => {
      const db = createMockDb([
        [{ id: 'req-1', credit_exception_request_status_id: 'cer-pending-id' }],
        [{ id: 'cer-pending-id', status_code: 'PENDING' }],
        [{ id: 'cer-rejected', status_code: 'REJECTED' }],
        undefined, // update
        [{ id: 'req-1', request_number: 'CER-2026-000001' }], // getRequest
      ]);
      const service = new CreditExceptionRequestsService(
        db as any,
        createMockExceptionsService() as any,
        createMockInvoicesService() as any,
      );
      await service.rejectRequest(
        'req-1',
        { rejection_reason: 'Insufficient documentation' } as any,
        'admin-1',
      );
      const set = db.updateSets[0] as any;
      expect(set.active_request_lock).toBeNull();
      expect(set.rejection_reason).toBe('Insufficient documentation');
    });
  });
});
