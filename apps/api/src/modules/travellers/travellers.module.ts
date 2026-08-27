import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module.js';
import { FinanceModule } from '../finance/finance.module.js';
import { PackagesModule } from '../packages/packages.module.js';
import { OperationsModule } from '../operations/operations.module.js';
import { TravellersService } from './application/services/travellers.service.js';
import { RegistrationsService } from './application/services/registrations.service.js';
import { RegistrationReadinessService } from './application/services/registration-readiness.service.js';
import { RegistrationOperationalSummaryService } from './application/services/registration-operational-summary.service.js';
import { RegistrationQueuesService } from './application/services/registration-queues.service.js';
import { AdminTravellersController } from './presentation/controllers/admin-travellers.controller.js';
import { AdminRegistrationsController } from './presentation/controllers/admin-registrations.controller.js';

/**
 * Travellers bounded context: travellers, contact persons, traveller contacts,
 * and registrations.
 */
@Module({
  imports: [SharedModule, FinanceModule, PackagesModule, OperationsModule],
  controllers: [AdminTravellersController, AdminRegistrationsController],
  providers: [
    TravellersService,
    RegistrationsService,
    RegistrationReadinessService,
    RegistrationOperationalSummaryService,
    RegistrationQueuesService,
  ],
  exports: [TravellersService, RegistrationsService, RegistrationQueuesService],
})
export class TravellersModule {}
