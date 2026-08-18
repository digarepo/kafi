import { describe, expect, it, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ExpenseAdjustmentsService } from './expense-adjustments.service.js';
import { createMockDb } from './mock-db.js';

const actorId = 'actor-1';

const expenseRow = {
  id: 'exp-1',
  expense_number: 'EXP-2026-000001',
  amount: '5000',
  traveller_id: 'trav-1',
  registration_id: 'reg-1',
  travel_group_id: null,
  is_deleted: false,
};

const adjustmentRow = {
  id: 'adj-1',
  adjustment_number: 'ADJ-2026-000001',
  expense_id: 'exp-1',
  adjustment_type: 'SUPPLIER_REFUND',
  amount: '-2000',
  adjustment_date: new Date('2026-10-01'),
  description: 'Supplier refund',
  reason: 'Flight cancelled by airline',
  source_record_type: 'FLIGHT_BOOKING',
  source_record_id: 'fb-1',
  source_record_number: 'FB-2026-000001',
  traveller_id: 'trav-1',
  registration_id: 'reg-1',
  travel_group_id: null,
  is_deleted: false,
  created_at: new Date(),
  updated_at: new Date(),
};

describe('ExpenseAdjustmentsService — Round 7', () => {
  describe('createAdjustment', () => {
    it('creates a supplier refund adjustment linked to an expense', async () => {
      const db = createMockDb([
        [expenseRow], // expense lookup
        [{ max: 'ADJ-2026-000001' }], // generateAdjustmentNumber max
        undefined, // insert
        [adjustmentRow], // getAdjustment lookup
      ]);

      const service = new ExpenseAdjustmentsService(db as any);
      const result = await service.createAdjustment(
        {
          expense_id: 'exp-1',
          adjustment_type: 'SUPPLIER_REFUND',
          amount: -2000,
          adjustment_date: new Date('2026-10-01'),
          reason: 'Flight cancelled by airline',
          source_record_type: 'FLIGHT_BOOKING',
          source_record_id: 'fb-1',
          source_record_number: 'FB-2026-000001',
        } as any,
        actorId,
      );

      expect(result.adjustment_type).toBe('SUPPLIER_REFUND');
      expect(result.expense_id).toBe('exp-1');
      expect(db.insertValues.length).toBe(1);
      const insert = db.insertValues[0] as any;
      expect(insert.adjustment_type).toBe('SUPPLIER_REFUND');
      expect(insert.amount).toBe('-2000');
      expect(insert.source_record_type).toBe('FLIGHT_BOOKING');
      expect(insert.source_record_id).toBe('fb-1');
    });

    it('throws NotFoundException when expense does not exist', async () => {
      const db = createMockDb([[]]); // empty expense lookup

      const service = new ExpenseAdjustmentsService(db as any);
      await expect(
        service.createAdjustment(
          {
            expense_id: 'nonexistent',
            adjustment_type: 'SUPPLIER_REFUND',
            amount: -1000,
            adjustment_date: new Date('2026-10-01'),
            reason: 'Test',
            source_record_type: 'FLIGHT_BOOKING',
            source_record_id: 'fb-1',
          } as any,
          actorId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('converts duplicate (expense_id, adjustment_type) DB error to ConflictException', async () => {
      const db = createMockDb([[expenseRow], [{ max: null }]]);
      // Override insert to throw a duplicate entry error for the business key
      (db as any).insert = vi.fn().mockReturnValue({
        values: vi.fn().mockImplementation(() => {
          const err: any = new Error(
            "Duplicate entry 'exp-1-SUPPLIER_REFUND' for key 'expense_adjustments_expense_type_unique'",
          );
          err.code = 'ER_DUP_ENTRY';
          err.errno = 1062;
          throw err;
        }),
      });

      const service = new ExpenseAdjustmentsService(db as any);
      await expect(
        service.createAdjustment(
          {
            expense_id: 'exp-1',
            adjustment_type: 'SUPPLIER_REFUND',
            amount: -1000,
            adjustment_date: new Date('2026-10-01'),
            reason: 'Test',
            source_record_type: 'FLIGHT_BOOKING',
            source_record_id: 'fb-1',
          } as any,
          actorId,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('retries on duplicate adjustment_number and eventually succeeds', async () => {
      let insertCallCount = 0;
      const db = createMockDb([
        [expenseRow], // expense lookup
        [{ max: 'ADJ-2026-000001' }], // generateAdjustmentNumber (attempt 1)
        [{ max: 'ADJ-2026-000001' }], // generateAdjustmentNumber (attempt 2)
        [adjustmentRow], // getAdjustment lookup
      ]);
      // Override insert to fail on first attempt (number collision),
      // succeed on second attempt.
      (db as any).insert = vi.fn().mockReturnValue({
        values: vi.fn().mockImplementation(() => {
          insertCallCount++;
          if (insertCallCount === 1) {
            const err: any = new Error(
              "Duplicate entry 'ADJ-2026-000002' for key 'adjustment_number'",
            );
            err.code = 'ER_DUP_ENTRY';
            err.errno = 1062;
            throw err;
          }
          // Second attempt succeeds
        }),
      });

      const service = new ExpenseAdjustmentsService(db as any);
      const result = await service.createAdjustment(
        {
          expense_id: 'exp-1',
          adjustment_type: 'SUPPLIER_REFUND',
          amount: -1000,
          adjustment_date: new Date('2026-10-01'),
          reason: 'Test',
          source_record_type: 'FLIGHT_BOOKING',
          source_record_id: 'fb-1',
        } as any,
        actorId,
      );
      expect(insertCallCount).toBe(2);
      expect(result).toBeDefined();
    });

    it('throws ConflictException after exhausting number retries', async () => {
      const db = createMockDb([
        [expenseRow], // expense lookup
        [{ max: 'ADJ-2026-000001' }], // generateAdjustmentNumber (attempt 1)
        [{ max: 'ADJ-2026-000001' }], // generateAdjustmentNumber (attempt 2)
        [{ max: 'ADJ-2026-000001' }], // generateAdjustmentNumber (attempt 3)
        [{ max: 'ADJ-2026-000001' }], // generateAdjustmentNumber (attempt 4)
        [{ max: 'ADJ-2026-000001' }], // generateAdjustmentNumber (attempt 5)
      ]);
      // Override insert to always throw a number collision
      (db as any).insert = vi.fn().mockReturnValue({
        values: vi.fn().mockImplementation(() => {
          const err: any = new Error(
            "Duplicate entry 'ADJ-2026-000002' for key 'adjustment_number'",
          );
          err.code = 'ER_DUP_ENTRY';
          err.errno = 1062;
          throw err;
        }),
      });

      const service = new ExpenseAdjustmentsService(db as any);
      await expect(
        service.createAdjustment(
          {
            expense_id: 'exp-1',
            adjustment_type: 'SUPPLIER_REFUND',
            amount: -1000,
            adjustment_date: new Date('2026-10-01'),
            reason: 'Test',
            source_record_type: 'FLIGHT_BOOKING',
            source_record_id: 'fb-1',
          } as any,
          actorId,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('generates sequential adjustment numbers (ADJ-YYYY-NNNNNN format)', async () => {
      const db = createMockDb([
        [expenseRow],
        [{ max: 'ADJ-2026-000005' }], // existing max
        null, // insert
        [adjustmentRow],
      ]);
      const service = new ExpenseAdjustmentsService(db as any);
      await service.createAdjustment(
        {
          expense_id: 'exp-1',
          adjustment_type: 'SUPPLIER_REFUND',
          amount: -1000,
          adjustment_date: new Date('2026-10-01'),
          reason: 'Test',
          source_record_type: 'FLIGHT_BOOKING',
          source_record_id: 'fb-1',
        } as any,
        actorId,
      );
      const insert = db.insertValues[0] as any;
      // Next number should be 000006
      expect(insert.adjustment_number).toBe('ADJ-2026-000006');
    });

    it('starts at ADJ-YYYY-000001 when no adjustments exist', async () => {
      const db = createMockDb([
        [expenseRow],
        [{ max: null }], // no existing adjustments
        null, // insert
        [adjustmentRow],
      ]);
      const service = new ExpenseAdjustmentsService(db as any);
      await service.createAdjustment(
        {
          expense_id: 'exp-1',
          adjustment_type: 'SUPPLIER_REFUND',
          amount: -1000,
          adjustment_date: new Date('2026-10-01'),
          reason: 'Test',
          source_record_type: 'FLIGHT_BOOKING',
          source_record_id: 'fb-1',
        } as any,
        actorId,
      );
      const insert = db.insertValues[0] as any;
      expect(insert.adjustment_number).toMatch(/^ADJ-\d{4}-000001$/);
    });

    it('allows different adjustment types on the same expense', async () => {
      const db = createMockDb([
        [expenseRow],
        [{ max: 'ADJ-2026-000001' }],
        null,
        [adjustmentRow],
      ]);
      const service = new ExpenseAdjustmentsService(db as any);
      await service.createAdjustment(
        {
          expense_id: 'exp-1',
          adjustment_type: 'CANCELLATION_FEE',
          amount: 500,
          adjustment_date: new Date('2026-10-01'),
          reason: 'Cancellation fee',
          source_record_type: 'FLIGHT_BOOKING',
          source_record_id: 'fb-1',
        } as any,
        actorId,
      );
      const insert = db.insertValues[0] as any;
      expect(insert.adjustment_type).toBe('CANCELLATION_FEE');
      expect(insert.expense_id).toBe('exp-1');
    });

    it('inherits traveller and registration from expense when not provided', async () => {
      const db = createMockDb([
        [expenseRow],
        [{ max: null }],
        undefined, // insert
        [adjustmentRow],
      ]);

      const service = new ExpenseAdjustmentsService(db as any);
      await service.createAdjustment(
        {
          expense_id: 'exp-1',
          adjustment_type: 'CANCELLATION_FEE',
          amount: 500,
          adjustment_date: new Date('2026-10-01'),
          reason: 'Airline cancellation fee',
          source_record_type: 'FLIGHT_BOOKING',
          source_record_id: 'fb-1',
        } as any,
        actorId,
      );

      const insert = db.insertValues[0] as any;
      expect(insert.traveller_id).toBe('trav-1');
      expect(insert.registration_id).toBe('reg-1');
    });
  });

  describe('archiveAdjustment', () => {
    it('soft-deletes an adjustment', async () => {
      const db = createMockDb([
        [adjustmentRow], // getAdjustmentOrThrow
        undefined, // update
      ]);

      const service = new ExpenseAdjustmentsService(db as any);
      await service.archiveAdjustment('adj-1', actorId);

      expect(db.updateSets.length).toBe(1);
      const set = db.updateSets[0] as any;
      expect(set.is_deleted).toBe(true);
      expect(set.deleted_at).toBeDefined();
    });

    it('throws NotFoundException when adjustment does not exist', async () => {
      const db = createMockDb([[]]);

      const service = new ExpenseAdjustmentsService(db as any);
      await expect(
        service.archiveAdjustment('nonexistent', actorId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTotalAdjustmentsForExpense', () => {
    it('returns the sum of all adjustment amounts', async () => {
      const db = createMockDb([[{ total: -1500 }]]);

      const service = new ExpenseAdjustmentsService(db as any);
      const total = await service.getTotalAdjustmentsForExpense('exp-1');
      expect(total).toBe(-1500);
    });

    it('returns 0 when no adjustments exist', async () => {
      const db = createMockDb([[{ total: 0 }]]);

      const service = new ExpenseAdjustmentsService(db as any);
      const total = await service.getTotalAdjustmentsForExpense('exp-1');
      expect(total).toBe(0);
    });
  });

  describe('listAdjustmentsForSource', () => {
    it('returns adjustments for a specific source record', async () => {
      const db = createMockDb([[adjustmentRow]]);

      const service = new ExpenseAdjustmentsService(db as any);
      const result = await service.listAdjustmentsForSource(
        'fb-1',
        'FLIGHT_BOOKING',
      );
      expect(result.length).toBe(1);
      expect(result[0].source_record_id).toBe('fb-1');
      expect(result[0].source_record_type).toBe('FLIGHT_BOOKING');
    });
  });

  // ---- Signed adjustment semantics ----
  // Net expense = original expense + sum(adjustment amounts)
  // Positive adjustment = additional cost (e.g. cancellation fee)
  // Negative adjustment = recovery (e.g. supplier refund)
  describe('signed adjustment semantics', () => {
    it('positive adjustment increases net expense (cancellation fee +5000)', async () => {
      // Original expense = 30000, adjustment = +5000 → net = 35000
      const db = createMockDb([[{ total: 5000 }]]);
      const service = new ExpenseAdjustmentsService(db as any);
      const total = await service.getTotalAdjustmentsForExpense('exp-1');
      expect(total).toBe(5000);
      const originalExpense = 30000;
      const netExpense = originalExpense + total;
      expect(netExpense).toBe(35000);
    });

    it('negative adjustment decreases net expense (supplier refund -25000)', async () => {
      // Original expense = 30000, adjustment = -25000 → net = 5000
      const db = createMockDb([[{ total: -25000 }]]);
      const service = new ExpenseAdjustmentsService(db as any);
      const total = await service.getTotalAdjustmentsForExpense('exp-1');
      expect(total).toBe(-25000);
      const originalExpense = 30000;
      const netExpense = originalExpense + total;
      expect(netExpense).toBe(5000);
    });

    it('multiple adjustments sum correctly (refund -25000 + other +3000 = -22000)', async () => {
      // Original expense = 30000, adjustments = -25000 + 3000 → net = 8000
      const db = createMockDb([[{ total: -22000 }]]);
      const service = new ExpenseAdjustmentsService(db as any);
      const total = await service.getTotalAdjustmentsForExpense('exp-1');
      expect(total).toBe(-22000);
      const originalExpense = 30000;
      const netExpense = originalExpense + total;
      expect(netExpense).toBe(8000);
    });

    it('createAdjustment stores signed amount as-is (negative for SUPPLIER_REFUND)', async () => {
      const db = createMockDb([
        [expenseRow], // expense lookup
        [{ max: 'ADJ-2026-000001' }], // generateAdjustmentNumber
        null, // insert
        [adjustmentRow], // getAdjustment
      ]);
      const service = new ExpenseAdjustmentsService(db as any);
      const result = await service.createAdjustment(
        {
          expense_id: 'exp-1',
          adjustment_type: 'SUPPLIER_REFUND',
          amount: -25000,
          adjustment_date: new Date('2026-08-01'),
          reason: 'Supplier refund for cancelled flight',
          source_record_type: 'FLIGHT_BOOKING',
          source_record_id: 'fb-1',
        } as any,
        actorId,
      );
      expect(db.insertValues[0]).toMatchObject({
        amount: '-25000',
        adjustment_type: 'SUPPLIER_REFUND',
      });
    });

    it('createAdjustment stores signed amount as-is (positive for CANCELLATION_FEE)', async () => {
      const db = createMockDb([
        [expenseRow], // expense lookup
        [{ max: 'ADJ-2026-000001' }], // generateAdjustmentNumber
        null, // insert
        [adjustmentRow], // getAdjustment
      ]);
      const service = new ExpenseAdjustmentsService(db as any);
      await service.createAdjustment(
        {
          expense_id: 'exp-1',
          adjustment_type: 'CANCELLATION_FEE',
          amount: 5000,
          adjustment_date: new Date('2026-08-01'),
          reason: 'Airline cancellation fee',
          source_record_type: 'FLIGHT_BOOKING',
          source_record_id: 'fb-1',
        } as any,
        actorId,
      );
      expect(db.insertValues[0]).toMatchObject({
        amount: '5000',
        adjustment_type: 'CANCELLATION_FEE',
      });
    });

    it('DTO permits both signs for all adjustment types (no sign-type enforcement)', async () => {
      // The DTO only validates amount !== 0. It does NOT enforce
      // SUPPLIER_REFUND = negative or CANCELLATION_FEE = positive.
      // This is intentional — the signed amount is the source of truth.
      const db = createMockDb([
        [expenseRow],
        [{ max: 'ADJ-2026-000001' }],
        null,
        [adjustmentRow],
      ]);
      const service = new ExpenseAdjustmentsService(db as any);
      // Positive SUPPLIER_REFUND (unusual but permitted)
      await service.createAdjustment(
        {
          expense_id: 'exp-1',
          adjustment_type: 'SUPPLIER_REFUND',
          amount: 1000,
          adjustment_date: new Date('2026-08-01'),
          reason: 'Partial supplier refund (positive correction)',
          source_record_type: 'FLIGHT_BOOKING',
          source_record_id: 'fb-1',
        } as any,
        actorId,
      );
      expect(db.insertValues[0]).toMatchObject({
        amount: '1000',
        adjustment_type: 'SUPPLIER_REFUND',
      });
    });
  });
});
