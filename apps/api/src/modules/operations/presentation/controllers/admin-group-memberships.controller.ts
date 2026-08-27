import {
  Body,
  Controller,
  Delete,
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
import { GroupMembershipsService } from '../../application/services/group-memberships.service.js';
import {
  CreateGroupMembershipDto,
  GroupMembershipFiltersDto,
  TransferGroupMembershipDto,
  UpdateGroupMembershipStatusDto,
  WaiveGuaranteeDto,
} from '../../application/dto/operations.dto.js';

/**
 * Admin group membership endpoints.
 *
 * @remarks
 * - Read endpoints require `TRAVEL_GROUP_VIEW`; write endpoints require
 *   `TRAVEL_GROUP_MANAGE`.
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminGroupMembershipsController {
  constructor(private readonly memberships: GroupMembershipsService) {}

  @Get('travel-groups/:id/memberships')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  listMembershipsForGroup(
    @Param('id') id: string,
    @Query() filters: GroupMembershipFiltersDto,
  ) {
    return this.memberships.listMembershipsForGroup(id, filters);
  }

  @Get('group-memberships/:id')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  getMembership(@Param('id') id: string) {
    return this.memberships.getMembership(id);
  }

  @Post('group-memberships')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  createMembership(@Body() dto: CreateGroupMembershipDto, @Req() req: any) {
    return this.memberships.createMembership(dto, req.user.sub);
  }

  @Patch('group-memberships/:id/status')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  updateMembershipStatus(
    @Param('id') id: string,
    @Body() dto: UpdateGroupMembershipStatusDto,
    @Req() req: any,
  ) {
    return this.memberships.updateMembershipStatus(id, dto, req.user.sub);
  }

  @Post('group-memberships/:id/transfer')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  transferMembership(
    @Param('id') id: string,
    @Body() dto: TransferGroupMembershipDto,
    @Req() req: any,
  ) {
    return this.memberships.transferMembership(id, dto, req.user.sub);
  }

  @Post('group-memberships/:id/waive-guarantee')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  waiveGuarantee(
    @Param('id') id: string,
    @Body() dto: WaiveGuaranteeDto,
    @Req() req: any,
  ) {
    return this.memberships.waiveGuarantee(id, dto, req.user.sub);
  }

  @Delete('group-memberships/:id')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  deleteMembership(@Param('id') id: string, @Req() req: any) {
    return this.memberships.deleteMembership(id, req.user.sub);
  }

  @Get('group-membership-statuses')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  listStatuses() {
    return this.memberships.listStatuses();
  }
}
