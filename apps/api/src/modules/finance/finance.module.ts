import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module.js';
import { ReferenceDataService } from './application/services/reference-data.service.js';
import { PayersService } from './application/services/payers.service.js';
import { InvoicesService } from './application/services/invoices.service.js';
import { PaymentsService } from './application/services/payments.service.js';
import { AdminInvoicesController } from './presentation/controllers/admin-invoices.controller.js';
import { AdminPaymentsController } from './presentation/controllers/admin-payments.controller.js';
import { AdminPayersController } from './presentation/controllers/admin-payers.controller.js';
import { AdminFinanceReferenceController } from './presentation/controllers/admin-finance-reference.controller.js';

/**
 * Finance bounded context: invoices (with line items), payments (with
 * allocations), payers, and finance reference data.
 *
 * @remarks
 * - **Authority:** owns `invoices`, `invoice_line_items`, `payers`,
 *   `payments`, `payment_allocations`, `payment_methods`, and all finance
 *   lookup tables. No other module writes to these tables.
 * - **Scope:** admin-only in Slice 4; no public endpoints.
 */
@Module({
  imports: [SharedModule],
  controllers: [
    AdminInvoicesController,
    AdminPaymentsController,
    AdminPayersController,
    AdminFinanceReferenceController,
  ],
  providers: [
    ReferenceDataService,
    PayersService,
    InvoicesService,
    PaymentsService,
  ],
  exports: [ReferenceDataService, PayersService, InvoicesService, PaymentsService],
})
export class FinanceModule {}
