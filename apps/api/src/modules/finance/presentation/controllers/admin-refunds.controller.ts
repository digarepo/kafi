import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../shared/application/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../../shared/application/guards/permissions.guard.js';
import { RequirePermissions } from '../../../../shared/application/decorators/require-permissions.decorator.js';
import { RefundsService } from '../../application/services/refunds.service.js';
import {
  CreateRefundDto,
  RefundFiltersDto,
} from '../../application/dto/refunds.dto.js';

/**
 * Admin endpoints for refunds / financial adjustments.
 *
 * @remarks
 * - **Scope:** MANAGER or ADMIN approval; guarded by `FINANCE_REFUND_APPROVE`.
 * - AGENT cannot approve refunds.
 * - A refund does NOT modify the original payment record.
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminRefundsController {
  constructor(private readonly refunds: RefundsService) {}

  @Get('refunds')
  @RequirePermissions('FINANCE_VIEW')
  listRefunds(@Query() filters: RefundFiltersDto) {
    return this.refunds.listRefunds(filters);
  }

  @Get('refunds/:id')
  @RequirePermissions('FINANCE_VIEW')
  getRefund(@Param('id') id: string) {
    return this.refunds.getRefund(id);
  }

  @Post('refunds')
  @RequirePermissions('FINANCE_REFUND_APPROVE')
  createRefund(@Body() dto: CreateRefundDto, @Req() req: any) {
    return this.refunds.createRefund(dto, req.user.sub);
  }

  @Post('refunds/:id/complete')
  @RequirePermissions('FINANCE_REFUND_APPROVE')
  completeRefund(@Param('id') id: string, @Req() req: any) {
    return this.refunds.completeRefund(id, req.user.sub);
  }

  @Post('refunds/:id/cancel')
  @RequirePermissions('FINANCE_REFUND_APPROVE')
  cancelRefund(@Param('id') id: string, @Req() req: any) {
    return this.refunds.cancelRefund(id, req.user.sub);
  }

  @Post('refunds/:id/archive')
  @RequirePermissions('FINANCE_DELETE')
  archiveRefund(@Param('id') id: string, @Req() req: any) {
    return this.refunds.archiveRefund(id, req.user.sub);
  }
}
