import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../shared/application/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../../shared/application/guards/permissions.guard.js';
import { RequirePermissions } from '../../../../shared/application/decorators/require-permissions.decorator.js';
import { DashboardService } from '../../application/services/dashboard.service.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminDashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('dashboard')
  @RequirePermissions('DASHBOARD_VIEW')
  getDashboard() {
    return this.dashboard.getDashboard();
  }
}
