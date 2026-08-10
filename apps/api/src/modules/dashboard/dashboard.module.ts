import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module.js';
import { FinanceModule } from '../finance/index.js';
import { DashboardService } from './application/services/dashboard.service.js';
import { AdminDashboardController } from './presentation/controllers/admin-dashboard.controller.js';

@Module({
  imports: [SharedModule, FinanceModule],
  providers: [DashboardService],
  controllers: [AdminDashboardController],
  exports: [DashboardService],
})
export class DashboardModule {}
