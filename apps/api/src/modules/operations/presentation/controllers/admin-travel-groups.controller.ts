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
import { TravelGroupsService } from '../../application/services/travel-groups.service.js';
import { TravelGroupOperationalSummaryService } from '../../application/services/travel-group-operational-summary.service.js';
import { GroupHotelStaysService } from '../../application/services/group-hotel-stays.service.js';
import { TransportSegmentsService } from '../../application/services/transport-segments.service.js';
import {
  CreateTravelGroupDto,
  CreateGroupHotelStayForTravelGroupDto,
  GroupHotelStayFiltersDto,
  CreateTransportSegmentForTravelGroupDto,
  TransportSegmentFiltersDto,
  TravelGroupFiltersDto,
  UpdateTravelGroupDto,
} from '../../application/dto/operations.dto.js';

/**
 * Admin travel group endpoints.
 *
 * @remarks
 * - All routes require `TRAVEL_GROUP_VIEW` for reads or `TRAVEL_GROUP_MANAGE`
 *   for writes.
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminTravelGroupsController {
  constructor(
    private readonly travelGroups: TravelGroupsService,
    private readonly operationalSummary: TravelGroupOperationalSummaryService,
    private readonly groupHotelStays: GroupHotelStaysService,
    private readonly transportSegments: TransportSegmentsService,
  ) {}

  @Get('travel-groups')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  listTravelGroups(@Query() filters: TravelGroupFiltersDto) {
    return this.travelGroups.listTravelGroups(filters);
  }

  @Get('travel-groups/:id')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  getTravelGroup(@Param('id') id: string) {
    return this.travelGroups.getTravelGroup(id);
  }

  @Get('travel-groups/:id/operational-summary')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  getOperationalSummary(@Param('id') id: string) {
    return this.operationalSummary.getOperationalSummary(id);
  }

  @Get('travel-groups/:id/travellers')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  getTravellers(@Param('id') id: string) {
    return this.operationalSummary.getTravellers(id);
  }

  @Post('travel-groups')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  createTravelGroup(@Body() dto: CreateTravelGroupDto, @Req() req: any) {
    return this.travelGroups.createTravelGroup(dto, req.user.sub);
  }

  @Patch('travel-groups/:id')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  updateTravelGroup(
    @Param('id') id: string,
    @Body() dto: UpdateTravelGroupDto,
    @Req() req: any,
  ) {
    return this.travelGroups.updateTravelGroup(id, dto, req.user.sub);
  }

  @Delete('travel-groups/:id')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  deleteTravelGroup(@Param('id') id: string, @Req() req: any) {
    return this.travelGroups.deleteTravelGroup(id, req.user.sub);
  }

  @Post('travel-groups/:id/confirm-travel-prepared')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  confirmTravelPrepared(@Param('id') id: string, @Req() req: any) {
    return this.travelGroups.confirmTravelPrepared(id, req.user.sub);
  }

  @Post('travel-groups/:id/depart')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  depart(@Param('id') id: string, @Req() req: any) {
    return this.travelGroups.depart(id, req.user.sub);
  }

  @Post('travel-groups/:id/complete')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  complete(@Param('id') id: string, @Req() req: any) {
    return this.travelGroups.complete(id, req.user.sub);
  }

  @Post('travel-groups/:id/cancel')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  cancelTravelGroup(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Req() req: any,
  ) {
    return this.travelGroups.cancelTravelGroup(id, body?.reason, req.user.sub);
  }

  @Get('travel-group-statuses')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  listStatuses() {
    return this.travelGroups.listStatuses();
  }

  // ---- Nested logistics workflows ----

  @Get('travel-groups/:id/stays')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  listStaysForTravelGroup(
    @Param('id') id: string,
    @Query() filters: GroupHotelStayFiltersDto,
  ) {
    return this.groupHotelStays.listStays({
      ...filters,
      travel_group_id: id,
    } as any);
  }

  @Post('travel-groups/:id/stays')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  createStayForTravelGroup(
    @Param('id') id: string,
    @Body() dto: CreateGroupHotelStayForTravelGroupDto,
    @Req() req: any,
  ) {
    return this.groupHotelStays.createStay(
      { ...dto, travel_group_id: id } as any,
      req.user.sub,
    );
  }

  @Get('travel-groups/:id/transport-segments')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  listTransportSegmentsForTravelGroup(
    @Param('id') id: string,
    @Query() filters: TransportSegmentFiltersDto,
  ) {
    return this.transportSegments.listSegments({
      ...filters,
      travel_group_id: id,
    } as any);
  }

  @Post('travel-groups/:id/transport-segments')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  createTransportSegmentForTravelGroup(
    @Param('id') id: string,
    @Body() dto: CreateTransportSegmentForTravelGroupDto,
    @Req() req: any,
  ) {
    return this.transportSegments.createSegment(
      { ...dto, travel_group_id: id } as any,
      req.user.sub,
    );
  }
}
