import { describe, expect, it } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  calculateDiscountAmount,
  InvoicesService,
} from './invoices.service.js';
import { ReferenceDataService } from './reference-data.service.js';
import { createMockDb } from './mock-db.js';

describe('InvoicesService', () => {
  describe('discount calculation', () => {
    it('calculates a fixed-amount discount', () => {
      expect(calculateDiscountAmount(100_000, 'FIXED', 5_000)).toBe(5_000);
    });

    it('calculates a percentage discount', () => {
      expect(calculateDiscountAmount(100_000, 'PERCENT', 10)).toBe(10_000);
    });

    it('rounds percentage discounts to two decimal places', () => {
      expect(calculateDiscountAmount(999.99, 'PERCENT', 12.5)).toBe(125);
    });

    it('allows a 100% discount', () => {
      expect(calculateDiscountAmount(1_000, 'PERCENT', 100)).toBe(1_000);
    });

    it('allows a zero discount', () => {
      expect(calculateDiscountAmount(1_000, 'FIXED', 0)).toBe(0);
    });

    it('rejects a percentage greater than 100%', () => {
      expect(() => calculateDiscountAmount(1_000, 'PERCENT', 101)).toThrow(
        BadRequestException,
      );
    });

    it('rejects a fixed discount greater than the subtotal', () => {
      expect(() => calculateDiscountAmount(1_000, 'FIXED', 1_001)).toThrow(
        BadRequestException,
      );
    });

    it('rejects a negative discount', () => {
      expect(() => calculateDiscountAmount(1_000, 'FIXED', -1)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('invoice number generation', () => {
    it('starts at 1 when no invoices exist for the year', async () => {
      const db = createMockDb([[{ max: null }]]);
      const service = new InvoicesService(
        db as any,
        {} as ReferenceDataService,
      );
      const number = await (service as any).generateInvoiceNumber();
      expect(number).toMatch(/^INV-\d{4}-000001$/);
    });

    it('increments from the existing max for the year', async () => {
      const db = createMockDb([[{ max: 'INV-2026-000004' }]]);
      const service = new InvoicesService(
        db as any,
        {} as ReferenceDataService,
      );
      const number = await (service as any).generateInvoiceNumber();
      expect(number).toBe('INV-2026-000005');
    });
  });

  describe('registration validation', () => {
    it('throws NotFoundException when the registration does not exist', async () => {
      const db = createMockDb([[]]);
      const service = new InvoicesService(
        db as any,
        {} as ReferenceDataService,
      );
      await expect(
        (service as any).getActiveRegistration('missing-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('outstanding balance calculation', () => {
    it('subtracts allocated amounts from the invoice total', async () => {
      const db = createMockDb([[{ allocated: 300 }]]);
      const service = new InvoicesService(
        db as any,
        {} as ReferenceDataService,
      );
      const balance = await (service as any).computeOutstandingBalance(
        'invoice-id',
        '1000.00',
      );
      expect(balance).toBe(700);
    });

    it('treats no allocations as a zero-allocated balance', async () => {
      const db = createMockDb([[{ allocated: 0 }]]);
      const service = new InvoicesService(
        db as any,
        {} as ReferenceDataService,
      );
      const balance = await (service as any).computeOutstandingBalance(
        'invoice-id',
        '500.00',
      );
      expect(balance).toBe(500);
    });
  });

  describe('registration finance summary', () => {
    it('returns all-zero totals when the registration has no invoices', async () => {
      const db = createMockDb([[]]);
      const service = new InvoicesService(
        db as any,
        {} as ReferenceDataService,
      );
      const summary = await service.getRegistrationFinanceSummary('reg-id');
      expect(summary).toEqual({
        registration_id: 'reg-id',
        total_invoiced: 0,
        total_paid: 0,
        total_unallocated: 0,
        outstanding_balance: 0,
      });
    });

    it('returns a map for the bulk registration finance summaries', async () => {
      const db = createMockDb([
        [{ id: 'inv-1', registration_id: 'reg-1', total_amount: '1000.00' }],
        [],
      ]);
      const service = new InvoicesService(
        db as any,
        {} as ReferenceDataService,
      );
      const map = await service.getRegistrationFinanceSummaries([
        'reg-1',
        'reg-2',
      ]);

      expect(map.size).toBe(2);
      expect(map.get('reg-1')).toEqual({
        total_invoiced: 1000,
        total_paid: 0,
        total_unallocated: 0,
        outstanding_balance: 1000,
      });
      expect(map.get('reg-2')).toEqual({
        total_invoiced: 0,
        total_paid: 0,
        total_unallocated: 0,
        outstanding_balance: 0,
      });
    });
  });
});
