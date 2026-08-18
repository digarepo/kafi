import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../shared/application/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../../shared/application/guards/permissions.guard.js';
import { RequirePermissions } from '../../../../shared/application/decorators/require-permissions.decorator.js';
import { PackagesService } from '../../application/services/packages.service.js';
import {
  CreatePackageTemplateDto,
  UpdatePackageTemplateDto,
  CreatePackageVersionDto,
  UpdatePackageVersionDto,
} from '../../application/dto/packages.dto.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminPackagesController {
  constructor(private readonly packages: PackagesService) {}

  // ---- Reference data ----

  @Get('package-categories')
  @RequirePermissions('PACKAGE_VIEW')
  listCategories() {
    return this.packages.listCategories();
  }

  @Get('pilgrimage-types')
  @RequirePermissions('PACKAGE_VIEW')
  listPilgrimageTypes() {
    return this.packages.listPilgrimageTypes();
  }

  @Get('currencies')
  @RequirePermissions('PACKAGE_VIEW')
  listCurrencies() {
    return this.packages.listCurrencies();
  }

  @Get('seasons')
  @RequirePermissions('PACKAGE_VIEW')
  listSeasons() {
    return this.packages.listSeasons();
  }

  // ---- Templates ----

  @Get('package-templates')
  @RequirePermissions('PACKAGE_VIEW')
  listTemplates(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(25), ParseIntPipe) pageSize: number,
    @Query('search') search?: string,
  ) {
    return this.packages.listTemplates(page, pageSize, search);
  }

  @Get('package-templates/:id')
  @RequirePermissions('PACKAGE_VIEW')
  getTemplate(@Param('id') id: string) {
    return this.packages.getTemplate(id);
  }

  @Post('package-templates')
  @RequirePermissions('PACKAGE_CREATE')
  createTemplate(@Body() dto: CreatePackageTemplateDto, @Req() req: any) {
    return this.packages.createTemplate(dto, req.user.sub);
  }

  @Patch('package-templates/:id')
  @RequirePermissions('PACKAGE_EDIT')
  updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdatePackageTemplateDto,
    @Req() req: any,
  ) {
    return this.packages.updateTemplate(id, dto, req.user.sub);
  }

  @Post('package-templates/:id/archive')
  @RequirePermissions('PACKAGE_DELETE')
  archiveTemplate(@Param('id') id: string, @Req() req: any) {
    return this.packages.archiveTemplate(id, req.user.sub);
  }

  // ---- Versions ----

  @Get('package-versions')
  @RequirePermissions('PACKAGE_VIEW')
  listVersions(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(25), ParseIntPipe) pageSize: number,
    @Query('templateId') templateId?: string,
    @Query('search') search?: string,
  ) {
    return this.packages.listVersions(page, pageSize, templateId, search);
  }

  @Get('package-versions/:id')
  @RequirePermissions('PACKAGE_VIEW')
  getVersion(@Param('id') id: string) {
    return this.packages.getVersion(id);
  }

  @Post('package-versions')
  @RequirePermissions('PACKAGE_CREATE')
  createVersion(@Body() dto: CreatePackageVersionDto, @Req() req: any) {
    return this.packages.createVersion(dto, req.user.sub);
  }

  @Patch('package-versions/:id')
  @RequirePermissions('PACKAGE_EDIT')
  updateVersion(
    @Param('id') id: string,
    @Body() dto: UpdatePackageVersionDto,
    @Req() req: any,
  ) {
    return this.packages.updateVersion(id, dto, req.user.sub);
  }

  @Post('package-versions/:id/publish')
  @RequirePermissions('PACKAGE_EDIT')
  publishVersion(@Param('id') id: string, @Req() req: any) {
    return this.packages.publishVersion(id, req.user.sub);
  }

  @Post('package-versions/:id/close')
  @RequirePermissions('PACKAGE_EDIT')
  closeVersion(@Param('id') id: string, @Req() req: any) {
    return this.packages.closeVersion(id, req.user.sub);
  }

  @Post('package-versions/:id/cancel')
  @RequirePermissions('PACKAGE_EDIT')
  cancelVersion(@Param('id') id: string, @Req() req: any) {
    return this.packages.cancelVersion(id, req.user.sub);
  }
}
