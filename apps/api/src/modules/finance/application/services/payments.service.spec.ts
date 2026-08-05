import { describe, expect, it } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentsService } from './payments.service.js';
import { ReferenceDataService } from './reference-data.service.js';
import { createMockDb } from './mock-db.js';

describe('PaymentsService', () => {
  describe('payment number generation', () => {
    it('starts at 1 when no payments exist for the year', async () => {
      const db = createMockDb([[{ max: null }]]);
      const emitter = new EventEmitter2();
      const service = new PaymentsService(
        db as any,
        {} as ReferenceDataService,
        emitter as any,
      );
      const number = await (service as any).generatePaymentNumber();
      expect(number).toMatch(/^PAY-\d{4}-000001$/);
    });

    it('increments from the existing max for the year', async () => {
      const db = createMockDb([[{ max: 'PAY-2026-000012' }]]);
      const emitter = new EventEmitter2();
      const service = new PaymentsService(
        db as any,
        {} as ReferenceDataService,
        emitter as any,
      );
      const number = await (service as any).generatePaymentNumber();
      expect(number).toBe('PAY-2026-000013');
    });
  });

  describe('unallocated balance calculation', () => {
    it('subtracts allocated amounts from the payment ETB amount', async () => {
      const db = createMockDb([[{ allocated: 400 }]]);
      const emitter = new EventEmitter2();
      const service = new PaymentsService(
        db as any,
        {} as ReferenceDataService,
        emitter as any,
      );
      const balance = await (service as any).computeUnallocatedBalance(
        'payment-id',
        '1000.00',
      );
      expect(balance).toBe(600);
    });
  });

  describe('payment lookup', () => {
    it('throws NotFoundException when the payment does not exist', async () => {
      const db = createMockDb([[]]);
      const emitter = new EventEmitter2();
      const service = new PaymentsService(
        db as any,
        {} as ReferenceDataService,
        emitter as any,
      );
      await expect(
        (service as any).getPaymentOrThrow('missing-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('archival guard', () => {
    it('refuses to archive a payment with active allocations', async () => {
      const db = createMockDb([
        [{ id: 'payment-id', amount: '1000.00' }],
        [{ id: 'allocation-id' }],
      ]);
      const emitter = new EventEmitter2();
      const service = new PaymentsService(
        db as any,
        {} as ReferenceDataService,
        emitter as any,
      );
      await expect(
        service.archivePayment('payment-id', 'actor'),
      ).rejects.toThrow(ConflictException);
    });
  });
});
