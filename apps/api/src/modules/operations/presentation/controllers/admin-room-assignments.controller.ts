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
import { RoomAssignmentsService } from '../../application/services/room-assignments.service.js';
import {
  CreateRoomAssignmentDto,
  RoomAssignmentFiltersDto,
} from '../../application/dto/operations.dto.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminRoomAssignmentsController {
  constructor(private readonly roomAssignments: RoomAssignmentsService) {}

  @Get('room-assignments')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  listAssignments(@Query() filters: RoomAssignmentFiltersDto) {
    return this.roomAssignments.listAssignments(filters);
  }

  @Get('room-assignments/:id')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  getAssignment(@Param('id') id: string) {
    return this.roomAssignments.getAssignment(id);
  }

  @Post('room-assignments')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  createAssignment(@Body() dto: CreateRoomAssignmentDto, @Req() req: any) {
    return this.roomAssignments.createAssignment(dto, req.user.sub);
  }

  @Patch('room-assignments/:id/release')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  releaseAssignment(@Param('id') id: string, @Req() req: any) {
    return this.roomAssignments.releaseAssignment(id, req.user.sub);
  }
}
