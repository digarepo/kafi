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
import { InquiriesService } from '../../application/services/inquiries.service.js';
import {
  ChangeInquiryStatusDto,
  InquiryFiltersDto,
  UpdateInquiryDto,
} from '../../application/dto/inquiries.dto.js';

/**
 * Staff-facing inquiry inbox.
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminInquiriesController {
  constructor(private readonly inquiries: InquiriesService) {}

  @Get('inquiries')
  @RequirePermissions('INQUIRY_VIEW')
  listInquiries(@Query() filters: InquiryFiltersDto) {
    return this.inquiries.listInquiries(filters);
  }

  // Declared before ':id' so the literal segment is not captured as an id.
  @Get('inquiries/summary')
  @RequirePermissions('INQUIRY_VIEW')
  getSummary() {
    return this.inquiries.getSummary();
  }

  @Get('inquiries/:id')
  @RequirePermissions('INQUIRY_VIEW')
  getInquiry(@Param('id') id: string) {
    return this.inquiries.getInquiry(id);
  }

  @Patch('inquiries/:id')
  @RequirePermissions('INQUIRY_MANAGE')
  updateInquiry(
    @Param('id') id: string,
    @Body() dto: UpdateInquiryDto,
    @Req() req: any,
  ) {
    return this.inquiries.updateInquiry(id, dto, req.user.sub);
  }

  @Post('inquiries/:id/status')
  @RequirePermissions('INQUIRY_MANAGE')
  changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeInquiryStatusDto,
    @Req() req: any,
  ) {
    return this.inquiries.changeStatus(id, dto, req.user.sub);
  }

  @Post('inquiries/:id/archive')
  @RequirePermissions('INQUIRY_MANAGE')
  archiveInquiry(@Param('id') id: string, @Req() req: any) {
    return this.inquiries.archiveInquiry(id, req.user.sub);
  }
}
