import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module.js';
import { BusinessNumberService } from './application/services/business-number.service.js';
import { TravelGroupsService } from './application/services/travel-groups.service.js';
import { GroupMembershipsService } from './application/services/group-memberships.service.js';
import { GuaranteesService } from './application/services/guarantees.service.js';
import { AdminTravelGroupsController } from './presentation/controllers/admin-travel-groups.controller.js';
import { AdminGroupMembershipsController } from './presentation/controllers/admin-group-memberships.controller.js';
import { AdminGuaranteesController } from './presentation/controllers/admin-guarantees.controller.js';

/**
 * Operations bounded context: travel groups, group memberships, and guarantees.
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
  ],
  providers: [
    BusinessNumberService,
    TravelGroupsService,
    GroupMembershipsService,
    GuaranteesService,
  ],
  exports: [
    BusinessNumberService,
    TravelGroupsService,
    GroupMembershipsService,
    GuaranteesService,
  ],
})
export class OperationsModule {}
