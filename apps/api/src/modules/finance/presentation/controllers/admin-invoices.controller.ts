import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../shared/application/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../../shared/application/guards/permissions.guard.js';
import { RequirePermissions } from '../../../../shared/application/decorators/require-permissions.decorator.js';
import { InvoicesService } from '../../application/services/invoices.service.js';
import {
  CreateInvoiceDto,
  CreateLineItemDto,
  InvoiceFiltersDto,
  UpdateInvoiceDto,
  UpdateLineItemDto,
} from '../../application/dto/invoices.dto.js';

/**
 * Admin endpoints for the `Invoice` aggregate, its `invoice_line_items`
 * children, and the registration finance summary projection.
 *
 * @remarks
 * - **Scope:** admin-only; guarded by `JwtAuthGuard` and `PermissionsGuard`.
 * - `subtotal`/`total_amount` are never accepted from the request body;
 *   `InvoicesService` always computes them from line items.
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminInvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get('invoices')
  @RequirePermissions('FINANCE_VIEW')
  listInvoices(@Query() filters: InvoiceFiltersDto) {
    return this.invoices.listInvoices(filters);
  }

  @Get('invoices/:id')
  @RequirePermissions('FINANCE_VIEW')
  getInvoice(@Param('id') id: string) {
    return this.invoices.getInvoice(id);
  }

  @Post('invoices')
  @RequirePermissions('FINANCE_CREATE')
  createInvoice(@Body() dto: CreateInvoiceDto, @Req() req: any) {
    return this.invoices.createInvoice(dto, req.user.sub);
  }

  @Patch('invoices/:id')
  @RequirePermissions('FINANCE_EDIT')
  updateInvoice(
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
    @Req() req: any,
  ) {
    return this.invoices.updateInvoice(id, dto, req.user.sub);
  }

  @Post('invoices/:id/archive')
  @RequirePermissions('FINANCE_DELETE')
  archiveInvoice(@Param('id') id: string, @Req() req: any) {
    return this.invoices.archiveInvoice(id, req.user.sub);
  }

  @Get('invoices/:id/outstanding-balance')
  @RequirePermissions('FINANCE_VIEW')
  getOutstandingBalance(@Param('id') id: string) {
    return this.invoices.getOutstandingBalance(id);
  }

  @Get('invoices/:id/line-items')
  @RequirePermissions('FINANCE_VIEW')
  listLineItems(@Param('id') id: string) {
    return this.invoices.listLineItems(id);
  }

  @Post('invoices/:id/line-items')
  @RequirePermissions('FINANCE_CREATE')
  addLineItem(
    @Param('id') id: string,
    @Body() dto: CreateLineItemDto,
    @Req() req: any,
  ) {
    return this.invoices.addLineItem(id, dto, req.user.sub);
  }

  @Patch('invoices/:id/line-items/:lineItemId')
  @RequirePermissions('FINANCE_EDIT')
  updateLineItem(
    @Param('id') id: string,
    @Param('lineItemId') lineItemId: string,
    @Body() dto: UpdateLineItemDto,
    @Req() req: any,
  ) {
    return this.invoices.updateLineItem(id, lineItemId, dto, req.user.sub);
  }

  @Post('invoices/:id/line-items/:lineItemId/archive')
  @RequirePermissions('FINANCE_DELETE')
  archiveLineItem(
    @Param('id') id: string,
    @Param('lineItemId') lineItemId: string,
    @Req() req: any,
  ) {
    return this.invoices.archiveLineItem(id, lineItemId, req.user.sub);
  }

  @Get('registrations/:id/finance-summary')
  @RequirePermissions('FINANCE_VIEW')
  getRegistrationFinanceSummary(@Param('id') id: string) {
    return this.invoices.getRegistrationFinanceSummary(id);
  }
}
