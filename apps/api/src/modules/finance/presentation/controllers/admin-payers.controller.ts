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
import { PayersService } from '../../application/services/payers.service.js';
import {
  CreatePayerDto,
  PayerFiltersDto,
  UpdatePayerDto,
} from '../../application/dto/payers.dto.js';

/**
 * Admin endpoints for the `Payer` aggregate.
 *
 * @remarks
 * - **Scope:** admin-only; guarded by `JwtAuthGuard` and `PermissionsGuard`.
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminPayersController {
  constructor(private readonly payers: PayersService) {}

  @Get('payers')
  @RequirePermissions('FINANCE_VIEW')
  listPayers(@Query() filters: PayerFiltersDto) {
    return this.payers.listPayers(filters);
  }

  @Get('payers/:id')
  @RequirePermissions('FINANCE_VIEW')
  getPayer(@Param('id') id: string) {
    return this.payers.getPayer(id);
  }

  @Post('payers')
  @RequirePermissions('FINANCE_CREATE')
  createPayer(@Body() dto: CreatePayerDto, @Req() req: any) {
    return this.payers.createPayer(dto, req.user.sub);
  }

  @Patch('payers/:id')
  @RequirePermissions('FINANCE_EDIT')
  updatePayer(
    @Param('id') id: string,
    @Body() dto: UpdatePayerDto,
    @Req() req: any,
  ) {
    return this.payers.updatePayer(id, dto, req.user.sub);
  }

  @Post('payers/:id/archive')
  @RequirePermissions('FINANCE_DELETE')
  archivePayer(@Param('id') id: string, @Req() req: any) {
    return this.payers.archivePayer(id, req.user.sub);
  }
}
