import { describe, expect, it, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { FinanceExceptionsService } from './finance-exceptions.service.js';
import { createMockDb } from './mock-db.js';

describe('FinanceExceptionsService', () => {
  describe('exception number generation', () => {
    it('starts at 1 when no exceptions exist for the year', async () => {
      const db = createMockDb([[{ max: null }]]);
      const service = new FinanceExceptionsService(db as any);
      const number = await (service as any).generateExceptionNumber();
      expect(number).toMatch(/^EXC-\d{4}-000001$/);
    });

    it('increments from the existing max for the year', async () => {
      const db = createMockDb([[{ max: 'EXC-2026-000003' }]]);
      const service = new FinanceExceptionsService(db as any);
      const number = await (service as any).generateExceptionNumber();
      expect(number).toBe('EXC-2026-000004');
    });
  });

  describe('exception lookup', () => {
    it('throws NotFoundException when the exception does not exist', async () => {
      const db = createMockDb([[]]);
      const service = new FinanceExceptionsService(db as any);
      await expect(
        (service as any).getExceptionOrThrow('missing-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('status lookup by code', () => {
    it('throws NotFoundException when the status code does not exist', async () => {
      const db = createMockDb([[]]);
      const service = new FinanceExceptionsService(db as any);
      await expect((service as any).getStatusByCode('UNKNOWN')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ---- Round 7: Concurrency protection via active_lock ----

  describe('createException — Round 7 active_lock concurrency', () => {
    it('sets active_lock to the exception id when creating ACTIVE exception', async () => {
      const db = createMockDb([
        [{ id: 'reg-1' }], // registration lookup
        [{ id: 'fes-active', status_code: 'ACTIVE' }], // statusByCode ACTIVE
        [{ max: null }], // generateExceptionNumber
        undefined, // insert
        [{ id: 'exc-1', exception_number: 'EXC-2026-000001' }], // getException
      ]);
      const service = new FinanceExceptionsService(db as any);
      await service.createException(
        {
          registration_id: 'reg-1',
          authorized_amount: 5000,
          reason: 'Test exception',
        } as any,
        'actor-1',
      );
      const insert = db.insertValues[0] as any;
      expect(insert.active_lock).toBeDefined();
      expect(insert.active_lock).toBe(insert.id);
    });

    it('converts duplicate entry DB error to ConflictException', async () => {
      const db = createMockDb([
        [{ id: 'reg-1' }],
        [{ id: 'fes-active', status_code: 'ACTIVE' }],
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
      const service = new FinanceExceptionsService(db as any);
      await expect(
        service.createException(
          {
            registration_id: 'reg-1',
            authorized_amount: 5000,
            reason: 'Test exception',
          } as any,
          'actor-1',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('revokeException — Round 7 clears active_lock', () => {
    it('clears active_lock when revoking', async () => {
      const db = createMockDb([
        [{ id: 'exc-1' }], // getExceptionOrThrow
        [{ id: 'fes-revoked', status_code: 'REVOKED' }], // statusByCode REVOKED
        undefined, // update
        [{ id: 'exc-1' }], // getException
      ]);
      const service = new FinanceExceptionsService(db as any);
      await service.revokeException('exc-1', 'actor-1');
      const set = db.updateSets[0] as any;
      expect(set.active_lock).toBeNull();
    });
  });
});
