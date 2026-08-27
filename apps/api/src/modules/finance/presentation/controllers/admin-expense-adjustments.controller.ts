import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../../../shared/application/guards/jwt-auth.guard.js";
import { PermissionsGuard } from "../../../../shared/application/guards/permissions.guard.js";
import { RequirePermissions } from "../../../../shared/application/decorators/require-permissions.decorator.js";
import { ExpenseAdjustmentsService } from "../../application/services/expense-adjustments.service.js";
import {
  CreateExpenseAdjustmentDto,
  ExpenseAdjustmentFiltersDto,
} from "../../application/dto/expense-adjustments.dto.js";

/**
 * Admin endpoints for the `ExpenseAdjustment` aggregate.
 *
 * @remarks
 * - **Scope:** admin-only; guarded by `JwtAuthGuard` and `PermissionsGuard`.
 * - Creating adjustments requires `FINANCE_CREATE`.
 * - Archiving adjustments requires `FINANCE_DELETE`.
 * - Reading adjustments requires `FINANCE_VIEW`.
 */
@Controller("admin")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminExpenseAdjustmentsController {
  constructor(private readonly adjustments: ExpenseAdjustmentsService) {}

  @Get("expense-adjustments")
  @RequirePermissions("FINANCE_VIEW")
  listAdjustments(@Query() filters: ExpenseAdjustmentFiltersDto) {
    return this.adjustments.listAdjustments(filters);
  }

  @Get("expense-adjustments/:id")
  @RequirePermissions("FINANCE_VIEW")
  getAdjustment(@Param("id") id: string) {
    return this.adjustments.getAdjustment(id);
  }

  @Post("expense-adjustments")
  @RequirePermissions("FINANCE_CREATE")
  createAdjustment(@Body() dto: CreateExpenseAdjustmentDto, @Req() req: any) {
    return this.adjustments.createAdjustment(dto, req.user.sub);
  }

  @Post("expense-adjustments/:id/archive")
  @RequirePermissions("FINANCE_DELETE")
  archiveAdjustment(@Param("id") id: string, @Req() req: any) {
    return this.adjustments.archiveAdjustment(id, req.user.sub);
  }
}
