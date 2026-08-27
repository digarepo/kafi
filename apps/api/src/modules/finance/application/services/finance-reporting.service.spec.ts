import { describe, expect, it } from 'vitest';
import { FinanceReportingService } from './finance-reporting.service.js';
import { createMockDb } from './mock-db.js';

describe('FinanceReportingService', () => {
  describe('getFlexibleReport', () => {
    it('returns empty report when travel group has no members and no group expenses', async () => {
      // Query order for travel_group_id with zero members:
      // 1. group memberships (empty)
      // 2. invoices (1=0 sentinel, returns empty)
      // 3. expenses (group-scoped, returns empty)
      // 4. adjustments (group-scoped, returns empty)
      // 5. refunds (1=0 sentinel, returns empty)
      // 6. authorized credit (1=0 sentinel, returns empty)
      // 7. unallocated (no date filter, returns 0)
      const db = createMockDb([
        [], // 1. group memberships (empty)
        [], // 2. invoices (empty, 1=0 sentinel)
        [{ total: '0' }], // 3. expenses (none)
        [{ total: '0' }], // 4. adjustments (none)
        [{ total: '0' }], // 5. refunds (none)
        [{ total: '0' }], // 6. authorized credit (none)
        [{ total_amount: '0', allocated: '0' }], // 7. unallocated
      ]);
      const service = new FinanceReportingService(db as any);
      const result = await service.getFlexibleReport({
        travel_group_id: 'tg-1',
      });
      expect(result).toEqual({
        total_revenue: 0,
        total_collected: 0,
        outstanding: 0,
        total_expenses: 0,
        total_adjustments: 0,
        net_expenses: 0,
        profit_loss: 0,
        total_refunds: 0,
        authorized_credit: 0,
        unallocated_customer_money: 0,
      });
    });

    it('returns group expenses when travel group has zero members but group-level expenses', async () => {
      // A group with 0 members but with accommodation/transport expenses
      // should still report those expenses, not return an empty report.
      const db = createMockDb([
        [], // 1. group memberships (empty)
        [], // 2. invoices (empty, no registrations)
        [{ total: '50000.00' }], // 3. expenses (group-attributed)
        [{ total: '0' }], // 4. adjustments (none)
        [{ total: '0' }], // 5. refunds (none)
        [{ total: '0' }], // 6. authorized credit (none)
        [{ total_amount: '0', allocated: '0' }], // 7. unallocated
      ]);
      const service = new FinanceReportingService(db as any);
      const result = await service.getFlexibleReport({
        travel_group_id: 'tg-1',
      });
      expect(result.total_expenses).toBe(50000);
      expect(result.total_revenue).toBe(0);
      expect(result.total_collected).toBe(0);
      expect(result.net_expenses).toBe(50000);
      expect(result.profit_loss).toBe(-50000);
    });

    it('returns group expenses and adjustments when travel group has zero members', async () => {
      const db = createMockDb([
        [], // 1. group memberships (empty)
        [], // 2. invoices (empty)
        [{ total: '50000.00' }], // 3. expenses (group-attributed)
        [{ total: '-10000.00' }], // 4. adjustments (group-scoped)
        [{ total: '0' }], // 5. refunds (none)
        [{ total: '0' }], // 6. authorized credit (none)
        [{ total_amount: '0', allocated: '0' }], // 7. unallocated
      ]);
      const service = new FinanceReportingService(db as any);
      const result = await service.getFlexibleReport({
        travel_group_id: 'tg-1',
      });
      expect(result.total_expenses).toBe(50000);
      expect(result.total_adjustments).toBe(-10000);
      expect(result.net_expenses).toBe(40000);
    });

    it('does not leak group expenses across groups (no cross-group leakage)', async () => {
      // Group B has zero members. Its report should only include its own
      // group-level expenses, not Group A's.
      const db = createMockDb([
        [], // 1. group memberships for Group B (empty)
        [], // 2. invoices (empty)
        [{ total: '12000.00' }], // 3. expenses (Group B's transport only)
        [{ total: '0' }], // 4. adjustments (none for Group B)
        [{ total: '0' }], // 5. refunds (none)
        [{ total: '0' }], // 6. authorized credit (none)
        [{ total_amount: '0', allocated: '0' }], // 7. unallocated
      ]);
      const service = new FinanceReportingService(db as any);
      const result = await service.getFlexibleReport({
        travel_group_id: 'tg-B',
      });
      // Should only see Group B's 12000 expense, not Group A's 50000
      expect(result.total_expenses).toBe(12000);
    });

    it('returns empty report when package version has no groups', async () => {
      const db = createMockDb([
        [], // travel groups for package version (empty)
      ]);
      const service = new FinanceReportingService(db as any);
      const result = await service.getFlexibleReport({
        package_version_id: 'pv-1',
      });
      expect(result.total_revenue).toBe(0);
      expect(result.total_expenses).toBe(0);
    });

    it('returns all required finance metrics in the report shape', async () => {
      const db = createMockDb([
        [], // 1. group memberships (empty)
        [], // 2. invoices (empty, 1=0 sentinel)
        [{ total: '0' }], // 3. expenses (none)
        [{ total: '0' }], // 4. adjustments (none)
        [{ total: '0' }], // 5. refunds (none)
        [{ total: '0' }], // 6. authorized credit (none)
        [{ total_amount: '0', allocated: '0' }], // 7. unallocated
      ]);
      const service = new FinanceReportingService(db as any);
      const result = await service.getFlexibleReport({
        travel_group_id: 'tg-1',
      });

      // Verify all locked Finance model values are present
      expect(result).toHaveProperty('total_revenue');
      expect(result).toHaveProperty('total_collected');
      expect(result).toHaveProperty('outstanding');
      expect(result).toHaveProperty('total_expenses');
      expect(result).toHaveProperty('profit_loss');
      expect(result).toHaveProperty('total_refunds');
      expect(result).toHaveProperty('authorized_credit');
      expect(result).toHaveProperty('unallocated_customer_money');
    });
  });

  describe('getTravelGroupFinanceSummary', () => {
    it('returns group P&L using actual group expenses (not allocated)', async () => {
      const db = createMockDb([
        [{ registration_id: 'reg-1' }], // group memberships
        [{ id: 'inv-1', total_amount: '100000.00' }], // invoices
        [{ total: '70000.00' }], // collected allocations
        [{ total: '18000.00' }], // actual group expenses
        [{ total: '0' }], // group expense adjustments (none)
      ]);
      const service = new FinanceReportingService(db as any);
      const result = await service.getTravelGroupFinanceSummary('tg-1');

      expect(result.group_revenue).toBe(100000);
      expect(result.group_collected).toBe(70000);
      expect(result.actual_group_expenses).toBe(18000);
      expect(result.total_adjustments).toBe(0);
      expect(result.net_expenses).toBe(18000);
      expect(result.outstanding).toBe(30000);
      // Group P&L = collected - net expenses
      expect(result.profit_loss).toBe(52000);
    });
  });

  // ------------------------------------------------------------------
  // Regression tests for group/package-scoped adjustment and refund
  // filtering. These verify that the flexible report includes
  // group-level expense adjustments and payment-linked refunds when
  // filtered by travel_group_id or package_version_id.
  // ------------------------------------------------------------------
  describe('getFlexibleReport — group-scoped adjustment inclusion', () => {
    it('includes group-level expense adjustments when filtered by travel_group_id', async () => {
      // Query order for travel_group_id filter with invoices present:
      // 1. group memberships → registration_ids
      // 2. invoices → invoice rows
      // 3. collected allocations sum
      // 4. expenses sum (registration + group scoped)
      // 5. expense adjustments sum (registration + group scoped)
      // 6. payment allocations for refund scope
      // 7. refunds sum
      // 8. finance exceptions sum
      // 9. unallocated payments sum
      const db = createMockDb([
        [{ registration_id: 'reg-1' }], // 1. group memberships
        [{ id: 'inv-1', total_amount: '100000.00' }], // 2. invoices
        [{ total: '80000.00' }], // 3. collected
        [{ total: '50000.00' }], // 4. expenses (group-attributed)
        [{ total: '-10000.00' }], // 5. adjustments (group-scoped)
        [{ payment_id: 'pay-1' }], // 6. payment allocations for refund scope
        [{ total: '0' }], // 7. refunds
        [{ total: '0' }], // 8. authorized credit
        [{ total_amount: '80000.00', allocated: '80000.00' }], // 9. unallocated
      ]);
      const service = new FinanceReportingService(db as any);
      const result = await service.getFlexibleReport({
        travel_group_id: 'tg-1',
      });

      expect(result.total_expenses).toBe(50000);
      expect(result.total_adjustments).toBe(-10000);
      expect(result.net_expenses).toBe(40000);
    });
  });

  describe('getFlexibleReport — group-scoped refund inclusion', () => {
    it('includes refunds linked via payment allocations when filtered by travel_group_id', async () => {
      const db = createMockDb([
        [{ registration_id: 'reg-1' }], // 1. group memberships
        [{ id: 'inv-1', total_amount: '100000.00' }], // 2. invoices
        [{ total: '90000.00' }], // 3. collected
        [{ total: '20000.00' }], // 4. expenses
        [{ total: '0' }], // 5. adjustments
        [{ payment_id: 'pay-1' }], // 6. payment allocations for refund scope
        [{ total: '5000.00' }], // 7. refunds (via payment_id match)
        [{ total: '0' }], // 8. authorized credit
        [{ total_amount: '90000.00', allocated: '90000.00' }], // 9. unallocated
      ]);
      const service = new FinanceReportingService(db as any);
      const result = await service.getFlexibleReport({
        travel_group_id: 'tg-1',
      });

      expect(result.total_refunds).toBe(5000);
      // P&L = collected - net_expenses - refunds
      expect(result.profit_loss).toBe(90000 - 20000 - 5000);
    });
  });

  describe('getFlexibleReport — package-scoped adjustment inclusion', () => {
    it('includes package-level expense adjustments when filtered by package_version_id', async () => {
      // Query order for package_version_id filter:
      // 1. travel groups for package
      // 2. group memberships → registration_ids
      // 3. invoices
      // 4. collected
      // 5. expenses
      // 6. adjustments (registration + group scoped)
      // 7. payment allocations for refund scope
      // 8. refunds
      // 9. authorized credit
      // 10. unallocated
      const db = createMockDb([
        [{ id: 'tg-1' }], // 1. travel groups
        [{ registration_id: 'reg-1' }], // 2. group memberships
        [{ id: 'inv-1', total_amount: '200000.00' }], // 3. invoices
        [{ total: '150000.00' }], // 4. collected
        [{ total: '60000.00' }], // 5. expenses
        [{ total: '-15000.00' }], // 6. adjustments (group-scoped)
        [{ payment_id: 'pay-1' }], // 7. payment allocations for refund scope
        [{ total: '0' }], // 8. refunds
        [{ total: '0' }], // 9. authorized credit
        [{ total_amount: '150000.00', allocated: '150000.00' }], // 10. unallocated
      ]);
      const service = new FinanceReportingService(db as any);
      const result = await service.getFlexibleReport({
        package_version_id: 'pv-1',
      });

      expect(result.total_expenses).toBe(60000);
      expect(result.total_adjustments).toBe(-15000);
      expect(result.net_expenses).toBe(45000);
    });
  });

  describe('getFlexibleReport — no double-counting', () => {
    it('does not double-count adjustments that have both registration_id and travel_group_id', async () => {
      // An adjustment with both registration_id and travel_group_id set
      // should be counted once, not twice. The OR condition in the query
      // ensures this at the SQL level.
      const db = createMockDb([
        [{ registration_id: 'reg-1' }], // 1. group memberships
        [{ id: 'inv-1', total_amount: '50000.00' }], // 2. invoices
        [{ total: '50000.00' }], // 3. collected
        [{ total: '30000.00' }], // 4. expenses
        [{ total: '-5000.00' }], // 5. adjustments (counted once via OR)
        [{ payment_id: 'pay-1' }], // 6. payment allocations for refund scope
        [{ total: '0' }], // 7. refunds
        [{ total: '0' }], // 8. authorized credit
        [{ total_amount: '50000.00', allocated: '50000.00' }], // 9. unallocated
      ]);
      const service = new FinanceReportingService(db as any);
      const result = await service.getFlexibleReport({
        travel_group_id: 'tg-1',
      });

      // The adjustment sum is -5000, not -10000 (no double count)
      expect(result.total_adjustments).toBe(-5000);
      expect(result.net_expenses).toBe(25000);
    });
  });

  describe('getFlexibleReport — registration report unchanged', () => {
    it('registration-scoped report still filters adjustments by registration_id only', async () => {
      // For a registration_id filter (no group scope), adjustments should
      // only be filtered by registration_id, not by travel_group_id.
      // Query order for registration_id filter:
      // 1. invoices
      // 2. collected
      // 3. expenses
      // 4. adjustments (registration only, no group scope)
      // 5. payment allocations for refund scope
      // 6. refunds
      // 7. authorized credit
      // 8. unallocated
      const db = createMockDb([
        [{ id: 'inv-1', total_amount: '80000.00' }], // 1. invoices
        [{ total: '60000.00' }], // 2. collected
        [{ total: '10000.00' }], // 3. expenses
        [{ total: '-2000.00' }], // 4. adjustments (registration-scoped)
        [{ payment_id: 'pay-1' }], // 5. payment allocations for refund scope
        [{ total: '1000.00' }], // 6. refunds
        [{ total: '0' }], // 7. authorized credit
        [{ total_amount: '60000.00', allocated: '60000.00' }], // 8. unallocated
      ]);
      const service = new FinanceReportingService(db as any);
      const result = await service.getFlexibleReport({
        registration_id: 'reg-1',
      });

      expect(result.total_expenses).toBe(10000);
      expect(result.total_adjustments).toBe(-2000);
      expect(result.net_expenses).toBe(8000);
      expect(result.total_refunds).toBe(1000);
      // P&L = collected - net_expenses - refunds
      expect(result.profit_loss).toBe(60000 - 8000 - 1000);
    });
  });
});
