import { Module } from '@nestjs/common';
import { OperationsModule } from '../operations/operations.module.js';
import { TravellersModule } from '../travellers/travellers.module.js';
import { TravelDocumentsService } from './application/services/travel-documents.service.js';
import { AdminTravelDocumentsController } from './presentation/controllers/admin-travel-documents.controller.js';

@Module({
  imports: [OperationsModule, TravellersModule],
  controllers: [AdminTravelDocumentsController],
  providers: [TravelDocumentsService],
})
export class TravelDocumentsModule {}
