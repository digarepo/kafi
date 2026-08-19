import { describe, expect, it, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentsService } from './payments.service.js';
import { ReferenceDataService } from './reference-data.service.js';
import { createMockDb } from './mock-db.js';

describe('PaymentsService', () => {
  describe('payment list allocation aggregation', () => {
    it('uses one grouped allocation query for the page and preserves list shape', async () => {
      const db = createMockDb([
        [{ count: 1 }],
        [
          {
            payments: {
              id: 'payment-id',
              payment_number: 'PAY-2026-000001',
              payment_date: new Date('2026-01-01'),
              amount: '1000.00',
              created_at: new Date('2026-01-01'),
              updated_at: new Date('2026-01-01'),
            },
            payers: null,
            payment_methods: null,
            payment_statuses: null,
          },
        ],
        [{ paymentId: 'payment-id', allocated: 250 }],
      ]);
      const service = new PaymentsService(
        db as any,
        {} as ReferenceDataService,
        new EventEmitter2(),
      );

      const result = await service.listPayments({
        page: 1,
        page_size: 25,
      } as any);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: 'payment-id',
        unallocated_amount: 750,
        payer: null,
        payment_method: null,
        status: null,
      });
      expect(db.calls.filter((call) => call === 'select')).toHaveLength(3);
      expect(db.calls.filter((call) => call === 'groupBy')).toHaveLength(1);
    });

    it('returns the full amount when a payment has no allocations', async () => {
      const db = createMockDb([
        [{ count: 1 }],
        [
          {
            payments: {
              id: 'unallocated-payment',
              payment_number: 'PAY-2026-000002',
              payment_date: new Date('2026-01-01'),
              amount: '500.00',
              created_at: new Date('2026-01-01'),
              updated_at: new Date('2026-01-01'),
            },
            payers: null,
            payment_methods: null,
            payment_statuses: null,
          },
        ],
        [],
      ]);
      const service = new PaymentsService(
        db as any,
        {} as ReferenceDataService,
        new EventEmitter2(),
      );

      const result = await service.listPayments({
        page: 1,
        page_size: 25,
      } as any);

      expect(result.data[0]?.unallocated_amount).toBe(500);
    });
  });

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

  describe('allocation reversal', () => {
    it('throws NotFoundException when the allocation does not exist', async () => {
      const db = createMockDb([
        [{ id: 'payment-id', amount: '1000.00' }], // getPaymentOrThrow
        [], // allocation lookup (none)
        [{ id: 'payment-id', amount: '1000.00' }], // getPayment (return)
        [], // allocations list
      ]);
      const emitter = new EventEmitter2();
      const service = new PaymentsService(
        db as any,
        {} as ReferenceDataService,
        emitter as any,
      );
      await expect(
        service.reverseAllocation('payment-id', 'missing-alloc', 'actor'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the allocation is already reversed', async () => {
      const db = createMockDb([
        [{ id: 'payment-id', amount: '1000.00' }], // getPaymentOrThrow
        [{ id: 'alloc-id', is_deleted: true }], // allocation lookup (deleted)
      ]);
      const emitter = new EventEmitter2();
      const service = new PaymentsService(
        db as any,
        {} as ReferenceDataService,
        emitter as any,
      );
      await expect(
        service.reverseAllocation('payment-id', 'alloc-id', 'actor'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('payment cancellation', () => {
    it('throws ConflictException when the payment is already cancelled', async () => {
      const refData = {
        getPaymentStatusByCode: vi.fn().mockResolvedValue({ id: 'PS-CANCEL' }),
      };
      const db = createMockDb([
        [
          {
            id: 'payment-id',
            amount: '1000.00',
            payment_status_id: 'PS-CANCEL',
          },
        ],
        [{ status_code: 'CANCELLED' }], // current status lookup
      ]);
      const emitter = new EventEmitter2();
      const service = new PaymentsService(
        db as any,
        refData as any,
        emitter as any,
      );
      await expect(
        service.cancelPayment('payment-id', 'actor'),
      ).rejects.toThrow(ConflictException);
    });
  });
});
