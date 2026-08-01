import { Controller, Get, Param, Query } from '@nestjs/common';
import { PackagesService } from '../../application/services/packages.service.js';
import { PublicPackageFiltersDto } from '../../application/dto/packages.dto.js';

@Controller('public')
export class PublicPackagesController {
  constructor(private readonly packages: PackagesService) {}

  @Get('packages')
  listPackages(@Query() filters: PublicPackageFiltersDto) {
    return this.packages.listPublicPackages(filters);
  }

  @Get('packages/:slug')
  getPackage(@Param('slug') slug: string) {
    return this.packages.getPublicPackageBySlug(slug);
  }
}
