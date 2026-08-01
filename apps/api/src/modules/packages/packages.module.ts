import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module.js';
import { PackagesService } from './application/services/packages.service.js';
import { AdminPackagesController } from './presentation/controllers/admin-packages.controller.js';
import { PublicPackagesController } from './presentation/controllers/public-packages.controller.js';

/**
 * Packages bounded context: package templates, versions, inclusions, and
 * public catalog.
 */
@Module({
  imports: [SharedModule],
  controllers: [AdminPackagesController, PublicPackagesController],
  providers: [PackagesService],
  exports: [PackagesService],
})
export class PackagesModule {}
