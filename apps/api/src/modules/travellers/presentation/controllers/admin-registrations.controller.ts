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
import {
  CreateRegistrationDto,
  RegistrationFiltersDto,
  UpdateRegistrationDto,
  UpdateRegistrationStatusDto,
} from '../../application/dto/registrations.dto.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminRegistrationsController {
  constructor(private readonly registrations: RegistrationsService) {}

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

  @Post('registrations/:id/status')
  @RequirePermissions('REGISTRATION_EDIT')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateRegistrationStatusDto,
    @Req() req: any,
  ) {
    return this.registrations.updateRegistrationStatus(id, dto, req.user.sub);
  }

  @Post('registrations/:id/archive')
  @RequirePermissions('REGISTRATION_DELETE')
  archiveRegistration(@Param('id') id: string, @Req() req: any) {
    return this.registrations.archiveRegistration(id, req.user.sub);
  }
}
