import { Module } from "@nestjs/common";
import { SharedModule } from "../../shared/shared.module.js";
import { ReferenceDataService } from "./application/services/reference-data.service.js";
import { PayersService } from "./application/services/payers.service.js";
import { InvoicesService } from "./application/services/invoices.service.js";
import { PaymentsService } from "./application/services/payments.service.js";
import { ExpensesService } from "./application/services/expenses.service.js";
import { ExpenseAdjustmentsService } from "./application/services/expense-adjustments.service.js";
import { FinanceExceptionsService } from "./application/services/finance-exceptions.service.js";
import { RefundsService } from "./application/services/refunds.service.js";
import { FinanceReportingService } from "./application/services/finance-reporting.service.js";
import { AdminInvoicesController } from "./presentation/controllers/admin-invoices.controller.js";
import { AdminPaymentsController } from "./presentation/controllers/admin-payments.controller.js";
import { AdminPayersController } from "./presentation/controllers/admin-payers.controller.js";
import { AdminFinanceReferenceController } from "./presentation/controllers/admin-finance-reference.controller.js";
import { AdminExpensesController } from "./presentation/controllers/admin-expenses.controller.js";
import { AdminExpenseAdjustmentsController } from "./presentation/controllers/admin-expense-adjustments.controller.js";
import { AdminFinanceExceptionsController } from "./presentation/controllers/admin-finance-exceptions.controller.js";
import { AdminRefundsController } from "./presentation/controllers/admin-refunds.controller.js";
import { AdminFinanceReportingController } from "./presentation/controllers/admin-finance-reporting.controller.js";

/**
 * Finance bounded context: invoices (with line items), payments (with
 * allocations), payers, expenses, finance exceptions, refunds, and finance
 * reference data.
 *
 * @remarks
 * - **Authority:** owns `invoices`, `invoice_line_items`, `payers`,
 *   `payments`, `payment_allocations`, `payment_methods`, `expenses`,
 *   `expense_allocations`, `finance_exceptions`, `refunds`, and all finance
 *   lookup tables. No other module writes to these tables.
 * - **Scope:** admin-only; no public endpoints.
 */
@Module({
  imports: [SharedModule],
  controllers: [
    AdminInvoicesController,
    AdminPaymentsController,
    AdminPayersController,
    AdminFinanceReferenceController,
    AdminExpensesController,
    AdminExpenseAdjustmentsController,
    AdminFinanceExceptionsController,
    AdminRefundsController,
    AdminFinanceReportingController,
  ],
  providers: [
    ReferenceDataService,
    PayersService,
    InvoicesService,
    PaymentsService,
    ExpensesService,
    ExpenseAdjustmentsService,
    FinanceExceptionsService,
    RefundsService,
    FinanceReportingService,
  ],
  exports: [
    ReferenceDataService,
    PayersService,
    InvoicesService,
    PaymentsService,
    ExpensesService,
    ExpenseAdjustmentsService,
    FinanceExceptionsService,
    RefundsService,
    FinanceReportingService,
  ],
})
export class FinanceModule {}
