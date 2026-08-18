import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../shared/application/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../../shared/application/guards/permissions.guard.js';
import { RequirePermissions } from '../../../../shared/application/decorators/require-permissions.decorator.js';
import { LogisticsLookupsService } from '../../application/services/logistics-lookups.service.js';

/**
 * Read-only catalog endpoints for Slice 6 logistics lookup tables.
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminLogisticsLookupsController {
  constructor(private readonly lookups: LogisticsLookupsService) {}

  @Get('hotel-types')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  listHotelTypes() {
    return this.lookups.listHotelTypes();
  }

  @Get('hotel-statuses')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  listHotelStatuses() {
    return this.lookups.listHotelStatuses();
  }

  @Get('vendor-types')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  listVendorTypes() {
    return this.lookups.listVendorTypes();
  }

  @Get('vendor-statuses')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  listVendorStatuses() {
    return this.lookups.listVendorStatuses();
  }

  @Get('room-types')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  listRoomTypes() {
    return this.lookups.listRoomTypes();
  }

  @Get('room-statuses')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  listRoomStatuses() {
    return this.lookups.listRoomStatuses();
  }

  @Get('room-assignment-statuses')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  listRoomAssignmentStatuses() {
    return this.lookups.listRoomAssignmentStatuses();
  }

  @Get('group-hotel-stay-statuses')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  listGroupHotelStayStatuses() {
    return this.lookups.listGroupHotelStayStatuses();
  }

  @Get('transport-segment-statuses')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  listTransportSegmentStatuses() {
    return this.lookups.listTransportSegmentStatuses();
  }

  @Get('cities')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  listCities(@Query('country_id') countryId?: string) {
    return this.lookups.listCities(countryId);
  }
}
