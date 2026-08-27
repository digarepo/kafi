import { describe, expect, it } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ExpensesService } from './expenses.service.js';
import { ReferenceDataService } from './reference-data.service.js';
import { createMockDb } from './mock-db.js';

describe('ExpensesService', () => {
  describe('expense number generation', () => {
    it('starts at 1 when no expenses exist for the year', async () => {
      const db = createMockDb([[{ max: null }]]);
      const service = new ExpensesService(
        db as any,
        {} as ReferenceDataService,
      );
      const number = await (service as any).generateExpenseNumber();
      expect(number).toMatch(/^EXP-\d{4}-000001$/);
    });

    it('increments from the existing max for the year', async () => {
      const db = createMockDb([[{ max: 'EXP-2026-000007' }]]);
      const service = new ExpensesService(
        db as any,
        {} as ReferenceDataService,
      );
      const number = await (service as any).generateExpenseNumber();
      expect(number).toBe('EXP-2026-000008');
    });
  });

  describe('expense lookup', () => {
    it('throws NotFoundException when the expense does not exist', async () => {
      const db = createMockDb([[]]);
      const service = new ExpensesService(
        db as any,
        {} as ReferenceDataService,
      );
      await expect(
        (service as any).getExpenseOrThrow('missing-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('status lookup by code', () => {
    it('throws NotFoundException when the status code does not exist', async () => {
      const db = createMockDb([[]]);
      const service = new ExpensesService(
        db as any,
        {} as ReferenceDataService,
      );
      await expect(
        (service as any).getExpenseStatusByCode('UNKNOWN'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('category lookup by code', () => {
    it('throws NotFoundException when the category code does not exist', async () => {
      const db = createMockDb([[]]);
      const service = new ExpensesService(
        db as any,
        {} as ReferenceDataService,
      );
      await expect(
        (service as any).getExpenseCategoryByCode('UNKNOWN'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('source lookup by code', () => {
    it('throws NotFoundException when the source code does not exist', async () => {
      const db = createMockDb([[]]);
      const service = new ExpensesService(
        db as any,
        {} as ReferenceDataService,
      );
      await expect(
        (service as any).getExpenseSourceByCode('UNKNOWN'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('operational expense deduplication', () => {
    it('findExpenseBySource returns existing expense for visa source', async () => {
      const db = createMockDb([
        [{ id: 'exp-existing' }], // findExpenseBySource finds existing
      ]);
      const service = new ExpensesService(
        db as any,
        {} as ReferenceDataService,
      );
      const result = await (service as any).findExpenseBySource({
        source_visa_application_id: 'visa-1',
      });
      expect(result).toEqual({ id: 'exp-existing' });
    });

    it('findExpenseBySource returns null when no source reference is provided', async () => {
      const db = createMockDb([]);
      const service = new ExpensesService(
        db as any,
        {} as ReferenceDataService,
      );
      const result = await (service as any).findExpenseBySource({});
      expect(result).toBeNull();
    });

    it('findExpenseBySource returns null when no existing expense is found', async () => {
      const db = createMockDb([[]]); // empty result
      const service = new ExpensesService(
        db as any,
        {} as ReferenceDataService,
      );
      const result = await (service as any).findExpenseBySource({
        source_flight_booking_id: 'flight-1',
      });
      expect(result).toBeNull();
    });
  });
});
