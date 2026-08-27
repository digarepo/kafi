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
import { PaymentsService } from '../../application/services/payments.service.js';
import {
  AllocatePaymentDto,
  CreatePaymentDto,
  PaymentFiltersDto,
  UpdatePaymentDto,
} from '../../application/dto/payments.dto.js';

/**
 * Admin endpoints for the `Payment` aggregate and its `payment_allocations`
 * children.
 *
 * @remarks
 * - **Scope:** admin-only; guarded by `JwtAuthGuard` and `PermissionsGuard`.
 * - `amount` (ETB) is never accepted from the request body; `PaymentsService`
 *   always computes it from `original_amount * exchange_rate`.
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminPaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('payments')
  @RequirePermissions('FINANCE_VIEW')
  listPayments(@Query() filters: PaymentFiltersDto) {
    return this.payments.listPayments(filters);
  }

  @Get('payments/:id')
  @RequirePermissions('FINANCE_VIEW')
  getPayment(@Param('id') id: string) {
    return this.payments.getPayment(id);
  }

  @Post('payments')
  @RequirePermissions('FINANCE_CREATE')
  createPayment(@Body() dto: CreatePaymentDto, @Req() req: any) {
    return this.payments.createPayment(dto, req.user.sub);
  }

  @Patch('payments/:id')
  @RequirePermissions('FINANCE_EDIT')
  updatePayment(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentDto,
    @Req() req: any,
  ) {
    return this.payments.updatePayment(id, dto, req.user.sub);
  }

  @Post('payments/:id/allocate')
  @RequirePermissions('FINANCE_EDIT')
  allocatePayment(
    @Param('id') id: string,
    @Body() dto: AllocatePaymentDto,
    @Req() req: any,
  ) {
    return this.payments.allocatePayment(id, dto, req.user.sub);
  }

  @Post('payments/:id/allocations/:allocationId/reverse')
  @RequirePermissions('FINANCE_EDIT')
  reverseAllocation(
    @Param('id') id: string,
    @Param('allocationId') allocationId: string,
    @Req() req: any,
  ) {
    return this.payments.reverseAllocation(id, allocationId, req.user.sub);
  }

  @Post('payments/:id/cancel')
  @RequirePermissions('FINANCE_EDIT')
  cancelPayment(@Param('id') id: string, @Req() req: any) {
    return this.payments.cancelPayment(id, req.user.sub);
  }

  @Post('payments/:id/archive')
  @RequirePermissions('FINANCE_DELETE')
  archivePayment(@Param('id') id: string, @Req() req: any) {
    return this.payments.archivePayment(id, req.user.sub);
  }
}
