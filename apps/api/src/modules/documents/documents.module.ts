import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module.js';
import { FinanceModule } from '../finance/finance.module.js';
import { DocumentsService } from './application/services/documents.service.js';
import { VisaApplicationsService } from './application/services/visa-applications.service.js';
import { LocalStorageProvider } from './infrastructure/storage/local-storage.provider.js';
import { STORAGE_PROVIDER } from './infrastructure/storage/storage-provider.token.js';
import { AdminDocumentsController } from './presentation/controllers/admin-documents.controller.js';
import { AdminVisaApplicationsController } from './presentation/controllers/admin-visa-applications.controller.js';

/**
 * Documents bounded context: travel documents, their verification state,
 * and Saudi visa applications.
 *
 * @remarks
 * - This module reads from travellers and registrations to resolve ownership
 *   and never writes to those tables.
 * - Storage is local for development/CI; S3 is deferred.
 * - Imports FinanceModule so visa approval can auto-create a Finance expense.
 */
@Module({
  imports: [SharedModule, FinanceModule],
  controllers: [AdminDocumentsController, AdminVisaApplicationsController],
  providers: [
    DocumentsService,
    VisaApplicationsService,
    {
      provide: STORAGE_PROVIDER,
      useClass: LocalStorageProvider,
    },
  ],
  exports: [DocumentsService, VisaApplicationsService],
})
export class DocumentsModule {}
