import {
  Body,
  Controller,
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
import { RegistrationsService } from '../../application/services/registrations.service.js';
import { RegistrationOperationalSummaryService } from '../../application/services/registration-operational-summary.service.js';
import { RegistrationQueuesService } from '../../application/services/registration-queues.service.js';
import {
  CancelRegistrationDto,
  CreateRegistrationDto,
  RegistrationFiltersDto,
  UpdateRegistrationDto,
} from '../../application/dto/registrations.dto.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminRegistrationsController {
  constructor(
    private readonly registrations: RegistrationsService,
    private readonly operationalSummary: RegistrationOperationalSummaryService,
    private readonly queues: RegistrationQueuesService,
  ) {}

  @Get('registrations')
  @RequirePermissions('REGISTRATION_VIEW')
  listRegistrations(@Query() filters: RegistrationFiltersDto) {
    return this.registrations.listRegistrations(filters);
  }

  @Get('registrations/:id')
  @RequirePermissions('REGISTRATION_VIEW')
  getRegistration(@Param('id') id: string) {
    return this.registrations.getRegistration(id);
  }

  @Post('registrations')
  @RequirePermissions('REGISTRATION_CREATE')
  createRegistration(@Body() dto: CreateRegistrationDto, @Req() req: any) {
    return this.registrations.createRegistration(dto, req.user.sub);
  }

  @Patch('registrations/:id')
  @RequirePermissions('REGISTRATION_EDIT')
  updateRegistration(
    @Param('id') id: string,
    @Body() dto: UpdateRegistrationDto,
    @Req() req: any,
  ) {
    return this.registrations.updateRegistration(id, dto, req.user.sub);
  }

  @Post('registrations/:id/start-processing')
  @RequirePermissions('REGISTRATION_EDIT')
  startProcessing(@Param('id') id: string, @Req() req: any) {
    return this.registrations.startProcessing(id, req.user.sub);
  }

  @Post('registrations/:id/confirm-ready')
  @RequirePermissions('REGISTRATION_EDIT')
  confirmReadyForTravel(@Param('id') id: string, @Req() req: any) {
    return this.registrations.confirmReadyForTravel(id, req.user.sub);
  }

  @Post('registrations/:id/cancel')
  @RequirePermissions('REGISTRATION_EDIT')
  cancelRegistration(
    @Param('id') id: string,
    @Body() dto: CancelRegistrationDto,
    @Req() req: any,
  ) {
    return this.registrations.cancelRegistration(id, dto, req.user.sub);
  }

  @Post('registrations/:id/archive')
  @RequirePermissions('REGISTRATION_DELETE')
  archiveRegistration(@Param('id') id: string, @Req() req: any) {
    return this.registrations.archiveRegistration(id, req.user.sub);
  }

  @Get('registrations/:id/operational-summary')
  @RequirePermissions('REGISTRATION_VIEW')
  getOperationalSummary(@Param('id') id: string) {
    return this.operationalSummary.getOperationalSummary(id);
  }

  @Get('registrations/queue/blocked-from-ready')
  @RequirePermissions('REGISTRATION_VIEW')
  getBlockedFromReadyQueue() {
    return this.queues.getBlockedFromReadyQueue();
  }

  @Get('registrations/queue/unpaid')
  @RequirePermissions('REGISTRATION_VIEW')
  getUnpaidQueue() {
    return this.queues.getUnpaidQueue();
  }
}
