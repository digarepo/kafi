import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module.js';
import { TravellersService } from './application/services/travellers.service.js';
import { RegistrationsService } from './application/services/registrations.service.js';
import { AdminTravellersController } from './presentation/controllers/admin-travellers.controller.js';
import { AdminRegistrationsController } from './presentation/controllers/admin-registrations.controller.js';

/**
 * Travellers bounded context: travellers, contact persons, traveller contacts,
 * and registrations.
 */
@Module({
  imports: [SharedModule],
  controllers: [AdminTravellersController, AdminRegistrationsController],
  providers: [TravellersService, RegistrationsService],
  exports: [TravellersService, RegistrationsService],
})
export class TravellersModule {}
