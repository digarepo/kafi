import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module.js';
import { IAMModule } from '../iam/iam.module.js';
import { InquiriesService } from './application/services/inquiries.service.js';
import { AdminInquiriesController } from './presentation/controllers/admin-inquiries.controller.js';
import { PublicInquiriesController } from './presentation/controllers/public-inquiries.controller.js';

/**
 * Inquiries bounded context: inbound leads captured from the public website
 * and the staff inbox used to work them.
 *
 * @remarks
 * - Owns only the `inquiries` table and writes to no other context.
 * - Imports IAMModule for the configured `Mailer` so staff notifications use
 *   the single driver-selection factory rather than a second mail setup.
 */
@Module({
  imports: [SharedModule, IAMModule],
  controllers: [PublicInquiriesController, AdminInquiriesController],
  providers: [InquiriesService],
  exports: [InquiriesService],
})
export class InquiriesModule {}
