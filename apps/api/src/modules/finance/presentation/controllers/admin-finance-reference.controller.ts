import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../shared/application/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../../shared/application/guards/permissions.guard.js';
import { RequirePermissions } from '../../../../shared/application/decorators/require-permissions.decorator.js';
import { ReferenceDataService } from '../../application/services/reference-data.service.js';
import {
  CreatePaymentMethodDto,
  UpdatePaymentMethodDto,
} from '../../application/dto/reference-data.dto.js';

/**
 * Admin endpoints for finance lookup lists.
 *
 * @remarks
 * - **Scope:** admin-only; guarded by `JwtAuthGuard` and `PermissionsGuard`.
 * - `payment_methods` is the only finance lookup with admin CRUD;
 *   all other lookups are read-only and seeded via
 *   `database/seeds/seed.ts`.
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminFinanceReferenceController {
  constructor(private readonly referenceData: ReferenceDataService) {}

  @Get('invoice-statuses')
  @RequirePermissions('FINANCE_VIEW')
  listInvoiceStatuses() {
    return this.referenceData.listInvoiceStatuses();
  }

  @Get('payment-statuses')
  @RequirePermissions('FINANCE_VIEW')
  listPaymentStatuses() {
    return this.referenceData.listPaymentStatuses();
  }

  @Get('payer-types')
  @RequirePermissions('FINANCE_VIEW')
  listPayerTypes() {
    return this.referenceData.listPayerTypes();
  }

  @Get('payer-statuses')
  @RequirePermissions('FINANCE_VIEW')
  listPayerStatuses() {
    return this.referenceData.listPayerStatuses();
  }

  @Get('invoice-line-item-types')
  @RequirePermissions('FINANCE_VIEW')
  listInvoiceLineItemTypes() {
    return this.referenceData.listInvoiceLineItemTypes();
  }

  @Get('payment-methods')
  @RequirePermissions('FINANCE_VIEW')
  listPaymentMethods() {
    return this.referenceData.listPaymentMethods();
  }

  @Get('expense-statuses')
  @RequirePermissions('FINANCE_VIEW')
  listExpenseStatuses() {
    return this.referenceData.listExpenseStatuses();
  }

  @Get('expense-categories')
  @RequirePermissions('FINANCE_VIEW')
  listExpenseCategories() {
    return this.referenceData.listExpenseCategories();
  }

  @Get('expense-sources')
  @RequirePermissions('FINANCE_VIEW')
  listExpenseSources() {
    return this.referenceData.listExpenseSources();
  }

  @Get('finance-exception-statuses')
  @RequirePermissions('FINANCE_VIEW')
  listFinanceExceptionStatuses() {
    return this.referenceData.listFinanceExceptionStatuses();
  }

  @Get('refund-statuses')
  @RequirePermissions('FINANCE_VIEW')
  listRefundStatuses() {
    return this.referenceData.listRefundStatuses();
  }

  @Get('credit-exception-request-statuses')
  @RequirePermissions('FINANCE_VIEW')
  listCreditExceptionRequestStatuses() {
    return this.referenceData.listCreditExceptionRequestStatuses();
  }

  @Post('payment-methods')
  @RequirePermissions('FINANCE_CREATE')
  createPaymentMethod(@Body() dto: CreatePaymentMethodDto) {
    return this.referenceData.createPaymentMethod(dto);
  }

  @Patch('payment-methods/:id')
  @RequirePermissions('FINANCE_EDIT')
  updatePaymentMethod(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentMethodDto,
  ) {
    return this.referenceData.updatePaymentMethod(id, dto);
  }

  @Post('payment-methods/:id/archive')
  @RequirePermissions('FINANCE_DELETE')
  archivePaymentMethod(@Param('id') id: string) {
    return this.referenceData.archivePaymentMethod(id);
  }
}
