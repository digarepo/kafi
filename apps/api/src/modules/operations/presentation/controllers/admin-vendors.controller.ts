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
import { VendorsService } from '../../application/services/vendors.service.js';
import {
  CreateVendorDto,
  UpdateVendorDto,
  VendorFiltersDto,
} from '../../application/dto/operations.dto.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminVendorsController {
  constructor(private readonly vendors: VendorsService) {}

  @Get('vendors')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  listVendors(@Query() filters: VendorFiltersDto) {
    return this.vendors.listVendors(filters);
  }

  @Get('vendors/:id')
  @RequirePermissions('TRAVEL_GROUP_VIEW')
  getVendor(@Param('id') id: string) {
    return this.vendors.getVendor(id);
  }

  @Post('vendors')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  createVendor(@Body() dto: CreateVendorDto, @Req() req: any) {
    return this.vendors.createVendor(dto, req.user.sub);
  }

  @Patch('vendors/:id')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  updateVendor(
    @Param('id') id: string,
    @Body() dto: UpdateVendorDto,
    @Req() req: any,
  ) {
    return this.vendors.updateVendor(id, dto, req.user.sub);
  }

  @Delete('vendors/:id')
  @RequirePermissions('TRAVEL_GROUP_MANAGE')
  deleteVendor(@Param('id') id: string, @Req() req: any) {
    return this.vendors.deleteVendor(id, req.user.sub);
  }
}
