import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../shared/application/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../../shared/application/guards/permissions.guard.js';
import { RequirePermissions } from '../../../../shared/application/decorators/require-permissions.decorator.js';
import { CreditExceptionRequestsService } from '../../application/services/credit-exception-requests.service.js';
import {
  CreateCreditExceptionRequestDto,
  CreditExceptionRequestFiltersDto,
  RejectCreditExceptionRequestDto,
} from '../../application/dto/credit-exception-requests.dto.js';

/**
 * Admin endpoints for credit exception requests.
 *
 * @remarks
 * - **Request:** agents and managers with `FINANCE_CREDIT_REQUEST` can
 *   create requests. This does NOT authorize credit — it only asks an
 *   admin to review.
 * - **Approval:** only admins with `FINANCE_CREDIT_AUTHORIZE` can approve
 *   or reject. Approval creates an ACTIVE finance exception.
 * - **View:** any user with `FINANCE_VIEW` can list and view requests.
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminCreditExceptionRequestsController {
  constructor(
    private readonly requests: CreditExceptionRequestsService,
  ) {}

  @Get('credit-exception-requests')
  @RequirePermissions('FINANCE_VIEW')
  listRequests(@Query() filters: CreditExceptionRequestFiltersDto) {
    return this.requests.listRequests(filters);
  }

  @Get('credit-exception-requests/:id')
  @RequirePermissions('FINANCE_VIEW')
  getRequest(@Param('id') id: string) {
    return this.requests.getRequest(id);
  }

  @Post('credit-exception-requests')
  @RequirePermissions('FINANCE_CREDIT_REQUEST')
  createRequest(
    @Body() dto: CreateCreditExceptionRequestDto,
    @Req() req: any,
  ) {
    return this.requests.createRequest(dto, req.user.sub);
  }

  @Post('credit-exception-requests/:id/approve')
  @RequirePermissions('FINANCE_CREDIT_AUTHORIZE')
  approveRequest(@Param('id') id: string, @Req() req: any) {
    return this.requests.approveRequest(id, req.user.sub);
  }

  @Post('credit-exception-requests/:id/reject')
  @RequirePermissions('FINANCE_CREDIT_AUTHORIZE')
  rejectRequest(
    @Param('id') id: string,
    @Body() dto: RejectCreditExceptionRequestDto,
    @Req() req: any,
  ) {
    return this.requests.rejectRequest(id, dto, req.user.sub);
  }

  @Post('credit-exception-requests/:id/archive')
  @RequirePermissions('FINANCE_DELETE')
  archiveRequest(@Param('id') id: string, @Req() req: any) {
    return this.requests.archiveRequest(id, req.user.sub);
  }
}
