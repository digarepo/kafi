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
import { GroupHotelStaysService } from '../../application/services/group-hotel-stays.service.js';
import { RoomsService } from '../../application/services/rooms.service.js';
import { RoomAssignmentsService } from '../../application/services/room-assignments.service.js';
import {
  CreateGroupHotelStayDto,
  CreateRoomForStayDto,
  GroupHotelStayFiltersDto,
  RoomFiltersDto,
  UpdateGroupHotelStayDto,
} from '../../application/dto/operations.dto.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminGroupHotelStaysController {
  constructor(
    private readonly groupHotelStays: GroupHotelStaysService,
    private readonly rooms: RoomsService,
    private readonly roomAssignments: RoomAssignmentsService,
  ) {}

  @Get('group-hotel-stays')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  listStays(@Query() filters: GroupHotelStayFiltersDto) {
    return this.groupHotelStays.listStays(filters);
  }

  @Get('group-hotel-stays/:id')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  getStay(@Param('id') id: string) {
    return this.groupHotelStays.getStay(id);
  }

  @Post('group-hotel-stays')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  createStay(@Body() dto: CreateGroupHotelStayDto, @Req() req: any) {
    return this.groupHotelStays.createStay(dto, req.user.sub);
  }

  @Patch('group-hotel-stays/:id')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  updateStay(
    @Param('id') id: string,
    @Body() dto: UpdateGroupHotelStayDto,
    @Req() req: any,
  ) {
    return this.groupHotelStays.updateStay(id, dto, req.user.sub);
  }

  @Delete('group-hotel-stays/:id')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  deleteStay(@Param('id') id: string, @Req() req: any) {
    return this.groupHotelStays.deleteStay(id, req.user.sub);
  }

  // ---- Accommodation coverage ----

  @Get('travel-groups/:id/accommodation-coverage')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  getAccommodationCoverage(@Param('id') id: string) {
    return this.groupHotelStays.getAccommodationCoverage(id);
  }

  // ---- Nested room workflow ----

  @Get('stays/:id/rooms')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  listRoomsForStay(@Param('id') id: string, @Query() filters: RoomFiltersDto) {
    return this.rooms.listRooms({
      ...filters,
      group_hotel_stay_id: id,
    } as any);
  }

  @Post('stays/:id/rooms')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  createRoomForStay(
    @Param('id') id: string,
    @Body() dto: CreateRoomForStayDto,
    @Req() req: any,
  ) {
    return this.rooms.createRoom(
      { ...dto, group_hotel_stay_id: id } as any,
      req.user.sub,
    );
  }

  // ---- Auto-assign ----

  @Post('stays/:id/auto-assign')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  autoAssignForStay(@Param('id') id: string, @Req() req: any) {
    return this.roomAssignments.autoAssignForStay(id, req.user.sub);
  }
}
