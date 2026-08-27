import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../shared/application/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../../shared/application/guards/permissions.guard.js';
import { RequirePermissions } from '../../../../shared/application/decorators/require-permissions.decorator.js';
import { VisaApplicationsService } from '../../application/services/visa-applications.service.js';
import {
  CreateVisaApplicationDto,
  RecordVisaResultDto,
  UpdateVisaApplicationDto,
  VisaApplicationFiltersDto,
} from '../../application/dto/visa-applications.dto.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminVisaApplicationsController {
  constructor(private readonly visas: VisaApplicationsService) {}

  @Get('visa-applications')
  @RequirePermissions('VISA_VIEW')
  listVisaApplications(@Query() filters: VisaApplicationFiltersDto) {
    return this.visas.listVisaApplications(filters);
  }

  @Post('visa-applications')
  @RequirePermissions('VISA_MANAGE')
  createVisaApplication(
    @Body() dto: CreateVisaApplicationDto,
    @Req() req: any,
  ) {
    return this.visas.createVisaApplication(dto, req.user.sub);
  }

  @Get('visa-applications/:id')
  @RequirePermissions('VISA_VIEW')
  getVisaApplication(@Param('id') id: string) {
    return this.visas.getVisaApplication(id);
  }

  @Patch('visa-applications/:id')
  @RequirePermissions('VISA_MANAGE')
  updateVisaApplication(
    @Param('id') id: string,
    @Body() dto: UpdateVisaApplicationDto,
    @Req() req: any,
  ) {
    return this.visas.updateVisaApplication(id, dto, req.user.sub);
  }

  @Post('visa-applications/:id/record-result')
  @RequirePermissions('VISA_MANAGE')
  recordVisaResult(
    @Param('id') id: string,
    @Body() dto: RecordVisaResultDto,
    @Req() req: any,
  ) {
    return this.visas.recordVisaResult(id, dto, req.user.sub);
  }

  @Delete('visa-applications/:id')
  @RequirePermissions('VISA_MANAGE')
  softDeleteVisaApplication(@Param('id') id: string, @Req() req: any) {
    return this.visas.softDelete(id, req.user.sub);
  }

  @Get('visa-application-statuses')
  @RequirePermissions('VISA_VIEW')
  listVisaStatuses() {
    return this.visas.listStatuses();
  }

  @Get('registrations/:id/visa-applications')
  @RequirePermissions('VISA_VIEW')
  listRegistrationVisaApplications(
    @Param('id') id: string,
    @Query() filters: VisaApplicationFiltersDto,
  ) {
    return this.visas.listVisaApplications({ ...filters, registration_id: id });
  }
}
