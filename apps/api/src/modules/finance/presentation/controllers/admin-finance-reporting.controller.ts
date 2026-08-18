import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../shared/application/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../../shared/application/guards/permissions.guard.js';
import { RequirePermissions } from '../../../../shared/application/decorators/require-permissions.decorator.js';
import { FinanceReportingService } from '../../application/services/finance-reporting.service.js';

/**
 * Admin endpoints for financial reporting.
 *
 * @remarks
 * - **Scope:** admin-only; guarded by `JwtAuthGuard` and `PermissionsGuard`.
 * - All calculations are performed server-side.
 * - Supports traveler, registration, travel group, package version, and
 *   dashboard-level reporting contexts.
 * - The flexible report endpoint supports date range and dimension
 *   filtering for custom reporting contexts (monthly, quarterly, seasonal,
 *   annual, etc.).
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminFinanceReportingController {
  constructor(private readonly reporting: FinanceReportingService) {}

  @Get('finance/dashboard')
  @RequirePermissions('FINANCE_VIEW')
  getDashboardSummary() {
    return this.reporting.getDashboardSummary();
  }

  @Get('finance/registrations/:id/summary')
  @RequirePermissions('FINANCE_VIEW')
  getRegistrationSummary(@Param('id') id: string) {
    return this.reporting.getRegistrationFinanceSummary(id);
  }

  @Get('finance/travel-groups/:id/summary')
  @RequirePermissions('FINANCE_VIEW')
  getTravelGroupSummary(@Param('id') id: string) {
    return this.reporting.getTravelGroupFinanceSummary(id);
  }

  @Get('finance/package-versions/:id/summary')
  @RequirePermissions('FINANCE_VIEW')
  getPackageVersionSummary(@Param('id') id: string) {
    return this.reporting.getPackageVersionFinanceSummary(id);
  }

  @Get('finance/report')
  @RequirePermissions('FINANCE_VIEW')
  getFlexibleReport(
    @Query('date_from') date_from?: string,
    @Query('date_to') date_to?: string,
    @Query('traveller_id') traveller_id?: string,
    @Query('registration_id') registration_id?: string,
    @Query('travel_group_id') travel_group_id?: string,
    @Query('package_version_id') package_version_id?: string,
    @Query('expense_category_id') expense_category_id?: string,
    @Query('expense_source_id') expense_source_id?: string,
  ) {
    return this.reporting.getFlexibleReport({
      date_from,
      date_to,
      traveller_id,
      registration_id,
      travel_group_id,
      package_version_id,
      expense_category_id,
      expense_source_id,
    });
  }
}
