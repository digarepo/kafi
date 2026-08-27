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
import { TransportSegmentsService } from '../../application/services/transport-segments.service.js';
import {
  CreateTransportSegmentDto,
  TransportSegmentFiltersDto,
  UpdateTransportSegmentDto,
} from '../../application/dto/operations.dto.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminTransportSegmentsController {
  constructor(private readonly transportSegments: TransportSegmentsService) {}

  @Get('transport-segments')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  listSegments(@Query() filters: TransportSegmentFiltersDto) {
    return this.transportSegments.listSegments(filters);
  }

  @Get('transport-segments/:id')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  getSegment(@Param('id') id: string) {
    return this.transportSegments.getSegment(id);
  }

  @Post('transport-segments')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  createSegment(@Body() dto: CreateTransportSegmentDto, @Req() req: any) {
    return this.transportSegments.createSegment(dto, req.user.sub);
  }

  @Patch('transport-segments/:id')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  updateSegment(
    @Param('id') id: string,
    @Body() dto: UpdateTransportSegmentDto,
    @Req() req: any,
  ) {
    return this.transportSegments.updateSegment(id, dto, req.user.sub);
  }

  @Delete('transport-segments/:id')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  deleteSegment(@Param('id') id: string, @Req() req: any) {
    return this.transportSegments.deleteSegment(id, req.user.sub);
  }
}
