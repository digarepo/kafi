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
import { ExpensesService } from '../../application/services/expenses.service.js';
import {
  CreateExpenseDto,
  ExpenseFiltersDto,
  UpdateExpenseDto,
} from '../../application/dto/expenses.dto.js';

/**
 * Admin endpoints for the `Expense` aggregate.
 *
 * @remarks
 * - **Scope:** admin-only; guarded by `JwtAuthGuard` and `PermissionsGuard`.
 * - Direct finance expenses use `FINANCE_CREATE` / `FINANCE_EDIT`.
 * - Group expense allocation uses `FINANCE_EDIT`.
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get('expenses')
  @RequirePermissions('FINANCE_VIEW')
  listExpenses(@Query() filters: ExpenseFiltersDto) {
    return this.expenses.listExpenses(filters);
  }

  @Get('expenses/:id')
  @RequirePermissions('FINANCE_VIEW')
  getExpense(@Param('id') id: string) {
    return this.expenses.getExpense(id);
  }

  @Post('expenses')
  @RequirePermissions('FINANCE_CREATE')
  createExpense(@Body() dto: CreateExpenseDto, @Req() req: any) {
    return this.expenses.createExpense(dto, req.user.sub);
  }

  @Patch('expenses/:id')
  @RequirePermissions('FINANCE_EDIT')
  updateExpense(
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
    @Req() req: any,
  ) {
    return this.expenses.updateExpense(id, dto, req.user.sub);
  }

  @Post('expenses/:id/allocate')
  @RequirePermissions('FINANCE_EDIT')
  allocateGroupExpense(
    @Param('id') id: string,
    @Body() body: { traveller_ids: string[] },
    @Req() req: any,
  ) {
    return this.expenses.allocateGroupExpense(id, body.traveller_ids, req.user.sub);
  }

  @Post('expenses/:id/archive')
  @RequirePermissions('FINANCE_DELETE')
  archiveExpense(@Param('id') id: string, @Req() req: any) {
    return this.expenses.archiveExpense(id, req.user.sub);
  }
}
