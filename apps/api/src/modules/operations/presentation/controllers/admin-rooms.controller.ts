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
import { RoomsService } from '../../application/services/rooms.service.js';
import { RoomAssignmentsService } from '../../application/services/room-assignments.service.js';
import {
  CreateRoomAssignmentForRoomDto,
  CreateRoomDto,
  RoomAssignmentFiltersDto,
  RoomFiltersDto,
  UpdateRoomDto,
} from '../../application/dto/operations.dto.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminRoomsController {
  constructor(
    private readonly rooms: RoomsService,
    private readonly roomAssignments: RoomAssignmentsService,
  ) {}

  @Get('rooms')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  listRooms(@Query() filters: RoomFiltersDto) {
    return this.rooms.listRooms(filters);
  }

  @Get('rooms/:id')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  getRoom(@Param('id') id: string) {
    return this.rooms.getRoom(id);
  }

  @Post('rooms')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  createRoom(@Body() dto: CreateRoomDto, @Req() req: any) {
    return this.rooms.createRoom(dto, req.user.sub);
  }

  @Patch('rooms/:id')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  updateRoom(
    @Param('id') id: string,
    @Body() dto: UpdateRoomDto,
    @Req() req: any,
  ) {
    return this.rooms.updateRoom(id, dto, req.user.sub);
  }

  @Delete('rooms/:id')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  deleteRoom(@Param('id') id: string, @Req() req: any) {
    return this.rooms.deleteRoom(id, req.user.sub);
  }

  // ---- Nested room-assignment workflow ----

  @Get('rooms/:id/assignments')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  async listAssignmentsForRoom(
    @Param('id') id: string,
    @Query() filters: RoomAssignmentFiltersDto,
  ) {
    return this.roomAssignments.listAssignments({
      ...filters,
      room_id: id,
    } as any);
  }

  @Post('rooms/:id/assignments')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  async createAssignmentForRoom(
    @Param('id') id: string,
    @Body() dto: CreateRoomAssignmentForRoomDto,
    @Req() req: any,
  ) {
    const room = await this.rooms.getRoom(id);
    return this.roomAssignments.createAssignment(
      {
        ...dto,
        room_id: room.id,
        group_hotel_stay_id: room.group_hotel_stay_id,
      } as any,
      req.user.sub,
    );
  }
}
