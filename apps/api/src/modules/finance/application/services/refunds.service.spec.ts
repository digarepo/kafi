import { describe, expect, it } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { RefundsService } from './refunds.service.js';
import { PaymentsService } from './payments.service.js';
import { createMockDb } from './mock-db.js';

describe('RefundsService', () => {
  describe('refund number generation', () => {
    it('starts at 1 when no refunds exist for the year', async () => {
      const db = createMockDb([[{ max: null }]]);
      const service = new RefundsService(db as any, {} as PaymentsService);
      const number = await (service as any).generateRefundNumber();
      expect(number).toMatch(/^RFD-\d{4}-000001$/);
    });

    it('increments from the existing max for the year', async () => {
      const db = createMockDb([[{ max: 'RFD-2026-000005' }]]);
      const service = new RefundsService(db as any, {} as PaymentsService);
      const number = await (service as any).generateRefundNumber();
      expect(number).toBe('RFD-2026-000006');
    });
  });

  describe('refund lookup', () => {
    it('throws NotFoundException when the refund does not exist', async () => {
      const db = createMockDb([[]]);
      const service = new RefundsService(db as any, {} as PaymentsService);
      await expect(
        (service as any).getRefundOrThrow('missing-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('payment lookup', () => {
    it('throws NotFoundException when the payment does not exist', async () => {
      const db = createMockDb([[]]);
      const service = new RefundsService(db as any, {} as PaymentsService);
      await expect(
        (service as any).getPaymentOrThrow('missing-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('refund status lookup by code', () => {
    it('throws NotFoundException when the status code does not exist', async () => {
      const db = createMockDb([[]]);
      const service = new RefundsService(db as any, {} as PaymentsService);
      await expect(
        (service as any).getRefundStatusByCode('UNKNOWN'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---- Round 7: Refund safeguards ----

  describe('createRefund — Round 7 cancelled-payment guard', () => {
    it('rejects refunds against CANCELLED payments', async () => {
      const payment = {
        id: 'pay-1',
        payer_id: 'payer-1',
        payment_status_id: 'ps-cancelled',
        amount: '5000',
        is_deleted: false,
      };
      const db = createMockDb([
        [payment], // getPaymentOrThrow
        [{ status_code: 'CANCELLED' }], // payment status lookup
      ]);
      const service = new RefundsService(db as any, {} as PaymentsService);

      await expect(
        service.createRefund(
          {
            payment_id: 'pay-1',
            amount: 1000,
            reason: 'Test refund',
            refund_date: new Date('2026-10-01'),
          } as any,
          'actor-1',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });
});
