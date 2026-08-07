import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module.js';
import { BusinessNumberService } from './application/services/business-number.service.js';
import { LogisticsLookupsService } from './application/services/logistics-lookups.service.js';
import { TravelGroupsService } from './application/services/travel-groups.service.js';
import { GroupMembershipsService } from './application/services/group-memberships.service.js';
import { GuaranteesService } from './application/services/guarantees.service.js';
import { HotelsService } from './application/services/hotels.service.js';
import { VendorsService } from './application/services/vendors.service.js';
import { GroupHotelStaysService } from './application/services/group-hotel-stays.service.js';
import { RoomsService } from './application/services/rooms.service.js';
import { RoomAssignmentsService } from './application/services/room-assignments.service.js';
import { TransportSegmentsService } from './application/services/transport-segments.service.js';
import { AdminTravelGroupsController } from './presentation/controllers/admin-travel-groups.controller.js';
import { AdminLogisticsLookupsController } from './presentation/controllers/admin-logistics-lookups.controller.js';
import { AdminGroupMembershipsController } from './presentation/controllers/admin-group-memberships.controller.js';
import { AdminGuaranteesController } from './presentation/controllers/admin-guarantees.controller.js';
import { AdminHotelsController } from './presentation/controllers/admin-hotels.controller.js';
import { AdminVendorsController } from './presentation/controllers/admin-vendors.controller.js';
import { AdminGroupHotelStaysController } from './presentation/controllers/admin-group-hotel-stays.controller.js';
import { AdminRoomsController } from './presentation/controllers/admin-rooms.controller.js';
import { AdminRoomAssignmentsController } from './presentation/controllers/admin-room-assignments.controller.js';
import { AdminTransportSegmentsController } from './presentation/controllers/admin-transport-segments.controller.js';

/**
 * Operations bounded context: travel groups, group memberships, guarantees,
 * hotels, vendors, rooms, room assignments, and transport segments.
 *
 * @remarks
 * - This module owns the operations aggregates and does not write to
 *   travellers, packages, finance, or iam tables.
 */
@Module({
  imports: [SharedModule],
  controllers: [
    AdminTravelGroupsController,
    AdminGroupMembershipsController,
    AdminGuaranteesController,
    AdminHotelsController,
    AdminVendorsController,
    AdminGroupHotelStaysController,
    AdminRoomsController,
    AdminRoomAssignmentsController,
    AdminTransportSegmentsController,
    AdminLogisticsLookupsController,
  ],
  providers: [
    BusinessNumberService,
    LogisticsLookupsService,
    TravelGroupsService,
    GroupMembershipsService,
    GuaranteesService,
    HotelsService,
    VendorsService,
    GroupHotelStaysService,
    RoomsService,
    RoomAssignmentsService,
    TransportSegmentsService,
  ],
  exports: [
    BusinessNumberService,
    LogisticsLookupsService,
    TravelGroupsService,
    GroupMembershipsService,
    GuaranteesService,
    HotelsService,
    VendorsService,
    GroupHotelStaysService,
    RoomsService,
    RoomAssignmentsService,
    TransportSegmentsService,
  ],
})
export class OperationsModule {}
