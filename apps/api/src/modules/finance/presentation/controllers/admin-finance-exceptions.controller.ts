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
import { FinanceExceptionsService } from '../../application/services/finance-exceptions.service.js';
import {
  CreateFinanceExceptionDto,
  FinanceExceptionFiltersDto,
  UpdateFinanceExceptionDto,
} from '../../application/dto/finance-exceptions.dto.js';

/**
 * Admin endpoints for finance exceptions (authorized credit).
 *
 * @remarks
 * - **Scope:** admin-only approval; guarded by `FINANCE_CREDIT_AUTHORIZE`.
 * - Only ADMIN can authorize credit. MANAGER and AGENT cannot.
 * - An exception does NOT modify payment amounts or outstanding balances.
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminFinanceExceptionsController {
  constructor(private readonly exceptions: FinanceExceptionsService) {}

  @Get('finance-exceptions')
  @RequirePermissions('FINANCE_VIEW')
  listExceptions(@Query() filters: FinanceExceptionFiltersDto) {
    return this.exceptions.listExceptions(filters);
  }

  @Get('finance-exceptions/:id')
  @RequirePermissions('FINANCE_VIEW')
  getException(@Param('id') id: string) {
    return this.exceptions.getException(id);
  }

  @Post('finance-exceptions')
  @RequirePermissions('FINANCE_CREDIT_AUTHORIZE')
  createException(@Body() dto: CreateFinanceExceptionDto, @Req() req: any) {
    return this.exceptions.createException(dto, req.user.sub);
  }

  @Patch('finance-exceptions/:id')
  @RequirePermissions('FINANCE_CREDIT_AUTHORIZE')
  updateException(
    @Param('id') id: string,
    @Body() dto: UpdateFinanceExceptionDto,
    @Req() req: any,
  ) {
    return this.exceptions.updateException(id, dto, req.user.sub);
  }

  @Post('finance-exceptions/:id/revoke')
  @RequirePermissions('FINANCE_CREDIT_AUTHORIZE')
  revokeException(@Param('id') id: string, @Req() req: any) {
    return this.exceptions.revokeException(id, req.user.sub);
  }

  @Post('finance-exceptions/:id/archive')
  @RequirePermissions('FINANCE_DELETE')
  archiveException(@Param('id') id: string, @Req() req: any) {
    return this.exceptions.archiveException(id, req.user.sub);
  }
}
