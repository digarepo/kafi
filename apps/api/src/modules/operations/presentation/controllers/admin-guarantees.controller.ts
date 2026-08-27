import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../shared/application/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../../shared/application/guards/permissions.guard.js';
import { RequirePermissions } from '../../../../shared/application/decorators/require-permissions.decorator.js';
import { GuaranteesService } from '../../application/services/guarantees.service.js';
import {
  CreateGuaranteeDto,
  ReplaceGuaranteeDto,
  UpdateGuaranteeDto,
} from '../../application/dto/operations.dto.js';

/**
 * Admin guarantee endpoints.
 *
 * @remarks
 * - Read endpoints require `TRAVEL_GROUP_VIEW`; write endpoints require
 *   `TRAVEL_GROUP_MANAGE`.
 * - A single active guarantee is allowed per group membership; use the
 *   `replace` endpoint to supersede an existing one.
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminGuaranteesController {
  constructor(private readonly guarantees: GuaranteesService) {}

  @Get('group-memberships/:id/guarantees')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  listGuaranteesForMembership(@Param('id') id: string) {
    return this.guarantees.listGuaranteesForMembership(id);
  }

  @Get('guarantees/:id')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  getGuarantee(@Param('id') id: string) {
    return this.guarantees.getGuarantee(id);
  }

  @Post('group-memberships/:id/guarantees')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  createGuarantee(
    @Param('id') id: string,
    @Body() dto: CreateGuaranteeDto,
    @Req() req: any,
  ) {
    return this.guarantees.createGuarantee(dto, req.user.sub);
  }

  @Patch('guarantees/:id')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  updateGuarantee(
    @Param('id') id: string,
    @Body() dto: UpdateGuaranteeDto,
    @Req() req: any,
  ) {
    return this.guarantees.updateGuarantee(id, dto, req.user.sub);
  }

  @Post('guarantees/:id/replace')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  replaceGuarantee(
    @Param('id') id: string,
    @Body() dto: ReplaceGuaranteeDto,
    @Req() req: any,
  ) {
    return this.guarantees.replaceGuarantee(id, dto, req.user.sub);
  }

  @Delete('guarantees/:id')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  deleteGuarantee(@Param('id') id: string, @Req() req: any) {
    return this.guarantees.deleteGuarantee(id, req.user.sub);
  }
}
