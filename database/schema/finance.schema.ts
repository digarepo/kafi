import { relations, sql } from "drizzle-orm";
import {
  boolean,
  datetime,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  unique,
  varchar,
} from "drizzle-orm/mysql-core";
import {
  actorMetadata,
  auditMetadata,
  codeColumn,
  currencies,
  fkUuid,
  idColumn,
  nameColumn,
  softDeleteMetadata,
} from "./common.schema.js";
import { users } from "./iam.schema.js";
import { contactPersons, registrations, travellers } from "./travellers.schema.js";
import { packageVersions } from "./packages.schema.js";
import { travelGroups, groupHotelStays, transportSegments, vendors } from "./operations.schema.js";
import { visaApplications } from "./documents.schema.js";
import { flightBookings } from "./flights.schema.js";

/**
 * Lifecycle states for invoices: Draft, Sent, Partially Paid, Paid, Overdue,
 * Cancelled.
 */
export const invoiceStatuses = mysqlTable("invoice_statuses", {
  id: idColumn,
  status_code: codeColumn("status_code"),
  name: nameColumn(),
  description: text("description"),
  display_order: int("display_order").notNull().default(1),
  is_active: boolean("is_active").notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * Lifecycle states for payments: Pending, Completed, Cancelled, Reconciled.
 */
export const paymentStatuses = mysqlTable("payment_statuses", {
  id: idColumn,
  status_code: codeColumn("status_code"),
  name: nameColumn(),
  description: text("description"),
  display_order: int("display_order").notNull().default(1),
  is_active: boolean("is_active").notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * Payer classification: Individual or Organization.
 */
export const payerTypes = mysqlTable("payer_types", {
  id: idColumn,
  type_code: codeColumn("type_code"),
  name: nameColumn(),
  description: text("description"),
  display_order: int("display_order").notNull().default(1),
  is_active: boolean("is_active").notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * Lifecycle states for payers: Active, Inactive, Blacklisted.
 */
export const payerStatuses = mysqlTable("payer_statuses", {
  id: idColumn,
  status_code: codeColumn("status_code"),
  name: nameColumn(),
  description: text("description"),
  display_order: int("display_order").notNull().default(1),
  is_active: boolean("is_active").notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * Lifecycle states for payment methods: Active, Inactive.
 */
export const paymentMethodStatuses = mysqlTable("payment_method_statuses", {
  id: idColumn,
  status_code: codeColumn("status_code"),
  name: nameColumn(),
  description: text("description"),
  display_order: int("display_order").notNull().default(1),
  is_active: boolean("is_active").notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * Master payment methods: Cash, Bank Transfer, Mobile Banking, Card, Online
 * Gateway.
 */
export const paymentMethods = mysqlTable(
  "payment_methods",
  {
    id: idColumn,
    method_code: codeColumn("method_code"),
    name: nameColumn(),
    description: text("description"),
    payment_method_status_id: fkUuid("payment_method_status_id").notNull(),
    display_order: int("display_order").notNull().default(1),
    ...auditMetadata,
    ...softDeleteMetadata,
  },
  (table) => []
);

/**
 * Optional classification for invoice line items (e.g. Package Cost, Visa
 * Processing, Hotel Upgrade). Seeded for future reporting use; not required
 * on `invoice_line_items` in Slice 4.
 */
export const invoiceLineItemTypes = mysqlTable("invoice_line_item_types", {
  id: idColumn,
  line_item_type_code: codeColumn("line_item_type_code"),
  name: nameColumn(),
  description: text("description"),
  display_order: int("display_order").notNull().default(1),
  is_active: boolean("is_active").notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * A financial obligation arising from a registration.
 *
 * Payments are never stored here; outstanding balances are derived from
 * `payment_allocations`. Accounting is ETB-only in Slice 4: `currency_id`
 * always references the ETB currency row. `subtotal` and `total_amount` are
 * always computed server-side from `invoice_line_items` and are never
 * accepted from a client request.
 *
 * No unique constraint exists on `registration_id`; the schema supports
 * multiple invoices per registration, but the Slice 4 workflow manages
 * exactly one invoice per registration.
 */
export const invoices = mysqlTable(
  "invoices",
  {
    id: idColumn,
    invoice_number: varchar("invoice_number", { length: 30 }).notNull().unique(),
    registration_id: fkUuid("registration_id").notNull(),
    invoice_date: datetime("invoice_date", { mode: "date" }).notNull(),
    due_date: datetime("due_date", { mode: "date" }),
    subtotal: decimal("subtotal", { precision: 18, scale: 2 }).notNull(),
    discount_amount: decimal("discount_amount", { precision: 18, scale: 2 }).notNull().default("0"),
    total_amount: decimal("total_amount", {
      precision: 18,
      scale: 2,
    }).notNull(),
    currency_id: fkUuid("currency_id").notNull(),
    invoice_status_id: fkUuid("invoice_status_id").notNull(),
    notes: text("notes"),
    ...auditMetadata,
    ...actorMetadata,
    ...softDeleteMetadata,
  },
  (table) => [index("invoices_registration_id_idx").on(table.registration_id)]
);

/**
 * A single billable charge on an invoice.
 *
 * Invoice `subtotal` is always derived from the sum of its line items; line
 * items are the source of truth for what is owed.
 */
export const invoiceLineItems = mysqlTable(
  "invoice_line_items",
  {
    id: idColumn,
    invoice_id: fkUuid("invoice_id").notNull(),
    line_item_type_id: fkUuid("line_item_type_id"),
    description: varchar("description", { length: 255 }).notNull(),
    quantity: decimal("quantity", { precision: 18, scale: 2 }).notNull().default("1"),
    unit_price: decimal("unit_price", { precision: 18, scale: 2 }).notNull(),
    total_price: decimal("total_price", { precision: 18, scale: 2 }).notNull(),
    notes: text("notes"),
    ...auditMetadata,
    ...actorMetadata,
    ...softDeleteMetadata,
  },
  (table) => [index("invoice_line_items_invoice_id_idx").on(table.invoice_id)]
);

/**
 * A person or organization that pays for one or more registrations.
 *
 * `payer_type = ORGANIZATION` requires `organization_name`.
 * `payer_type = INDIVIDUAL` requires either `traveller_id` or
 * `contact_person_id`.
 */
export const payers = mysqlTable(
  "payers",
  {
    id: idColumn,
    payer_number: varchar("payer_number", { length: 30 }).notNull().unique(),
    payer_type_id: fkUuid("payer_type_id").notNull(),
    traveller_id: fkUuid("traveller_id"),
    contact_person_id: fkUuid("contact_person_id"),
    organization_name: varchar("organization_name", { length: 255 }),
    contact_name: varchar("contact_name", { length: 255 }),
    phone_number: varchar("phone_number", { length: 30 }),
    email_address: varchar("email_address", { length: 255 }),
    payer_status_id: fkUuid("payer_status_id").notNull(),
    notes: text("notes"),
    ...auditMetadata,
    ...actorMetadata,
    ...softDeleteMetadata,
  },
  (table) => []
);

/**
 * Money received by the company.
 *
 * Slice 4 accounting is entirely ETB. `amount` is the ETB accounting value
 * used for all allocation and balance calculations. `original_amount`,
 * `original_currency_id`, and `exchange_rate` are stored for audit and
 * historical reference only and are never used in balance math.
 *
 * A payment does not settle an invoice until it has been allocated through
 * `payment_allocations`. Overpayment is allowed; any unallocated ETB balance
 * remains on the payment for future allocation.
 */
export const payments = mysqlTable(
  "payments",
  {
    id: idColumn,
    payment_number: varchar("payment_number", { length: 30 }).notNull().unique(),
    payer_id: fkUuid("payer_id").notNull(),
    payment_method_id: fkUuid("payment_method_id").notNull(),
    payment_date: datetime("payment_date", { mode: "date" }).notNull(),
    original_amount: decimal("original_amount", {
      precision: 18,
      scale: 2,
    }).notNull(),
    original_currency_id: fkUuid("original_currency_id").notNull(),
    exchange_rate: decimal("exchange_rate", {
      precision: 18,
      scale: 6,
    }).notNull(),
    amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
    reference_number: varchar("reference_number", { length: 100 }),
    received_by: fkUuid("received_by").notNull(),
    payment_status_id: fkUuid("payment_status_id").notNull(),
    notes: text("notes"),
    ...auditMetadata,
    ...actorMetadata,
    ...softDeleteMetadata,
  },
  (table) => [index("payments_payer_id_idx").on(table.payer_id)]
);

/**
 * Resolves the many-to-many relationship between payments and invoices.
 *
 * A payment may settle multiple invoices; an invoice may be settled by
 * multiple payments. Outstanding balances are calculated from invoice totals
 * minus allocated amounts, entirely in ETB. Overpayment is allowed:
 * `allocated_amount` may be less than `payments.amount`, leaving an
 * unallocated ETB balance.
 */
export const paymentAllocations = mysqlTable(
  "payment_allocations",
  {
    id: idColumn,
    payment_id: fkUuid("payment_id").notNull(),
    invoice_id: fkUuid("invoice_id").notNull(),
    allocated_amount: decimal("allocated_amount", {
      precision: 18,
      scale: 2,
    }).notNull(),
    allocation_date: datetime("allocation_date", { mode: "date" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    notes: text("notes"),
    ...auditMetadata,
    ...actorMetadata,
    ...softDeleteMetadata,
  },
  (table) => [
    unique("payment_allocations_payment_invoice_unique").on(table.payment_id, table.invoice_id),
    index("payment_allocations_invoice_id_idx").on(table.invoice_id),
    index("payment_allocations_payment_id_idx").on(table.payment_id),
  ]
);

// ---------------------------------------------------------------------------
// Round 6 — Expenses, Finance Exceptions, Refunds, and Expense Allocations
// ---------------------------------------------------------------------------

/**
 * Lifecycle states for expenses: PENDING, CONFIRMED, CANCELLED.
 *
 * Expenses are recorded with minimal states. PENDING is used when an expense
 * is drafted but not yet confirmed; CONFIRMED means the cost is committed;
 * CANCELLED voids the expense without deleting it.
 */
export const expenseStatuses = mysqlTable("expense_statuses", {
  id: idColumn,
  status_code: codeColumn("status_code"),
  name: nameColumn(),
  description: text("description"),
  display_order: int("display_order").notNull().default(1),
  is_active: boolean("is_active").notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * Classification of business expenses.
 *
 * Seeded categories align with the operational modules that generate expenses:
 * VISA, FLIGHT, ACCOMMODATION, TRANSPORT, CANCELLATION_CHARGE, OTHER.
 */
export const expenseCategories = mysqlTable("expense_categories", {
  id: idColumn,
  category_code: codeColumn("category_code"),
  name: nameColumn(),
  description: text("description"),
  display_order: int("display_order").notNull().default(1),
  is_active: boolean("is_active").notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * The origin of an expense — whether it was created from an operational
 * workflow or entered directly in Finance.
 */
export const expenseSources = mysqlTable("expense_sources", {
  id: idColumn,
  source_code: codeColumn("source_code"),
  name: nameColumn(),
  description: text("description"),
  display_order: int("display_order").notNull().default(1),
  is_active: boolean("is_active").notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * A business expense — money spent by Kafi.
 *
 * An expense may originate from an operational workflow (visa, flight, hotel,
 * transport) or be entered directly in Finance. When it originates from an
 * operational record, the `source_*` fields link back to that record and the
 * business dimensions (traveller, registration, travel group, package version)
 * are derived from it.
 *
 * `amount` is always ETB. `original_amount`, `original_currency_id`, and
 * `exchange_rate` are retained for audit when the expense was incurred in a
 * foreign currency.
 *
 * Group-level expenses (e.g. transport for an entire group) have
 * `attribution_scope = GROUP`. Traveler-level expenses have
 * `attribution_scope = TRAVELER`. Group expenses are allocated to travelers
 * via `expense_allocations` for per-traveler profitability reporting.
 */
export const expenses = mysqlTable(
  "expenses",
  {
    id: idColumn,
    expense_number: varchar("expense_number", { length: 30 }).notNull().unique(),
    expense_category_id: fkUuid("expense_category_id").notNull(),
    expense_source_id: fkUuid("expense_source_id").notNull(),
    expense_status_id: fkUuid("expense_status_id").notNull(),

    // Financial (ETB accounting)
    amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
    original_amount: decimal("original_amount", { precision: 18, scale: 2 }),
    original_currency_id: fkUuid("original_currency_id"),
    exchange_rate: decimal("exchange_rate", { precision: 18, scale: 6 }),

    // Date the expense was incurred
    expense_date: datetime("expense_date", { mode: "date" }).notNull(),

    // Description / notes
    description: varchar("description", { length: 255 }),
    notes: text("notes"),

    // Payee / vendor
    vendor_id: fkUuid("vendor_id"),
    payee_name: varchar("payee_name", { length: 255 }),

    // Attribution scope
    attribution_scope: mysqlEnum("attribution_scope", ["TRAVELER", "GROUP", "GENERAL"]).notNull(),

    // Business dimensions (derived from source where possible)
    traveller_id: fkUuid("traveller_id"),
    registration_id: fkUuid("registration_id"),
    travel_group_id: fkUuid("travel_group_id"),
    package_version_id: fkUuid("package_version_id"),

    // Source operational record linkage
    source_visa_application_id: fkUuid("source_visa_application_id"),
    source_flight_booking_id: fkUuid("source_flight_booking_id"),
    source_group_hotel_stay_id: fkUuid("source_group_hotel_stay_id"),
    source_transport_segment_id: fkUuid("source_transport_segment_id"),

    ...auditMetadata,
    ...actorMetadata,
    ...softDeleteMetadata,
  },
  (table) => [
    index("expenses_category_id_idx").on(table.expense_category_id),
    index("expenses_source_id_idx").on(table.expense_source_id),
    index("expenses_status_id_idx").on(table.expense_status_id),
    index("expenses_traveller_id_idx").on(table.traveller_id),
    index("expenses_registration_id_idx").on(table.registration_id),
    index("expenses_travel_group_id_idx").on(table.travel_group_id),
    index("expenses_package_version_id_idx").on(table.package_version_id),
    index("expenses_expense_date_idx").on(table.expense_date),
  ]
);

/**
 * Allocation of a group-level expense to individual travelers for
 * per-traveler profitability reporting.
 *
 * This is a reporting construct — it does not create individual supplier
 * transactions. For MVP, equal allocation is used.
 */
export const expenseAllocations = mysqlTable(
  "expense_allocations",
  {
    id: idColumn,
    expense_id: fkUuid("expense_id").notNull(),
    traveller_id: fkUuid("traveller_id").notNull(),
    registration_id: fkUuid("registration_id"),
    allocated_amount: decimal("allocated_amount", {
      precision: 18,
      scale: 2,
    }).notNull(),
    notes: text("notes"),
    ...auditMetadata,
    ...actorMetadata,
    ...softDeleteMetadata,
  },
  (table) => [
    unique("expense_allocations_expense_traveller_unique").on(table.expense_id, table.traveller_id),
    index("expense_allocations_expense_id_idx").on(table.expense_id),
    index("expense_allocations_traveller_id_idx").on(table.traveller_id),
    index("expense_allocations_registration_id_idx").on(table.registration_id),
  ]
);

/**
 * Lifecycle states for finance exceptions: ACTIVE, EXPIRED, REVOKED.
 *
 * An ACTIVE exception satisfies the payment readiness gate. EXPIRED means the
 * exception's due date has passed. REVOKED means an admin cancelled the
 * exception.
 */
export const financeExceptionStatuses = mysqlTable("finance_exception_statuses", {
  id: idColumn,
  status_code: codeColumn("status_code"),
  name: nameColumn(),
  description: text("description"),
  display_order: int("display_order").notNull().default(1),
  is_active: boolean("is_active").notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * An authorized credit exception that allows a registration to proceed
 * despite an outstanding balance.
 *
 * This is NOT a payment. It does not increase the collected amount. It only
 * satisfies the workflow gate (`payment_satisfied`). The outstanding balance
 * remains visible and reportable.
 *
 * Only ADMIN can approve a finance exception. The exception records who
 * approved it, when, the authorized amount, and the reason.
 */
export const financeExceptions = mysqlTable(
  "finance_exceptions",
  {
    id: idColumn,
    exception_number: varchar("exception_number", { length: 30 }).notNull().unique(),
    registration_id: fkUuid("registration_id").notNull(),
    authorized_amount: decimal("authorized_amount", {
      precision: 18,
      scale: 2,
    }).notNull(),
    reason: text("reason").notNull(),
    approved_by: fkUuid("approved_by").notNull(),
    approved_at: datetime("approved_at", { mode: "date" }).notNull(),
    due_date: datetime("due_date", { mode: "date" }),
    finance_exception_status_id: fkUuid("finance_exception_status_id").notNull(),
    // Concurrency lock: set to the exception id when ACTIVE, NULL otherwise.
    // A unique index on (registration_id, active_lock) prevents two concurrent
    // ACTIVE exceptions for the same registration.
    active_lock: fkUuid("active_lock"),
    notes: text("notes"),
    ...auditMetadata,
    ...actorMetadata,
    ...softDeleteMetadata,
  },
  (table) => [
    index("finance_exceptions_registration_id_idx").on(table.registration_id),
    index("finance_exceptions_status_id_idx").on(table.finance_exception_status_id),
    // Enforce at most one ACTIVE exception per registration.
    unique("finance_exceptions_active_per_registration_unique").on(
      table.registration_id,
      table.active_lock
    ),
  ]
);

/**
 * Lifecycle states for refunds: PENDING, APPROVED, COMPLETED, CANCELLED.
 */
export const refundStatuses = mysqlTable("refund_statuses", {
  id: idColumn,
  status_code: codeColumn("status_code"),
  name: nameColumn(),
  description: text("description"),
  display_order: int("display_order").notNull().default(1),
  is_active: boolean("is_active").notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * A refund or financial adjustment returning money to a customer.
 *
 * A refund is always linked to the original payment. It does not modify the
 * original payment record — the payment history is preserved. The refund
 * amount cannot exceed the refundable (unallocated) balance of the original
 * payment at the time of approval.
 *
 * MANAGER or ADMIN can approve a refund. AGENT cannot.
 *
 * Refunds may also be used for cancellation financial adjustments (e.g.
 * returning overpayment after a registration is cancelled).
 */
export const refunds = mysqlTable(
  "refunds",
  {
    id: idColumn,
    refund_number: varchar("refund_number", { length: 30 }).notNull().unique(),
    payment_id: fkUuid("payment_id").notNull(),
    payer_id: fkUuid("payer_id").notNull(),
    amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
    reason: text("reason").notNull(),
    refund_date: datetime("refund_date", { mode: "date" }).notNull(),
    approved_by: fkUuid("approved_by").notNull(),
    approved_at: datetime("approved_at", { mode: "date" }).notNull(),
    refund_status_id: fkUuid("refund_status_id").notNull(),
    // Optional linkage to a registration for cancellation adjustments
    registration_id: fkUuid("registration_id"),
    notes: text("notes"),
    ...auditMetadata,
    ...actorMetadata,
    ...softDeleteMetadata,
  },
  (table) => [
    index("refunds_payment_id_idx").on(table.payment_id),
    index("refunds_payer_id_idx").on(table.payer_id),
    index("refunds_status_id_idx").on(table.refund_status_id),
    index("refunds_registration_id_idx").on(table.registration_id),
  ]
);

// ---------------------------------------------------------------------------
// Round 7 — Expense Adjustments (supplier refunds, cancellation fees, etc.)
// ---------------------------------------------------------------------------

/**
 * A financial adjustment to an existing expense — supplier refund,
 * cancellation fee, or other supplier adjustment.
 *
 * @remarks
 * - **Authority:** The original expense is NEVER modified or deleted. This
 *   record represents an explicit, auditable adjustment to the net cost.
 * - `amount` is ETB. Positive = additional cost to Kafi (e.g. cancellation
 *   fee charged by supplier). Negative = recovery/reduction (e.g. supplier
 *   refund).
 * - Net cost of an expense = expense.amount + sum(adjustment.amount).
 * - The `source_record_*` fields preserve traceability even when the
 *   originating operational record is hard-deleted (hotel stays, transport
 *   segments). `source_record_id` has no DB-level FK constraint for this
 *   reason; `source_record_number` stores the business number for audit.
 * - Duplicate prevention: at most one adjustment of each `adjustment_type`
 *   per expense, enforced by a unique constraint.
 */
export const expenseAdjustments = mysqlTable(
  "expense_adjustments",
  {
    id: idColumn,
    adjustment_number: varchar("adjustment_number", { length: 30 }).notNull().unique(),
    expense_id: fkUuid("expense_id").notNull(),

    // Adjustment type
    adjustment_type: mysqlEnum("adjustment_type", [
      "SUPPLIER_REFUND",
      "CANCELLATION_FEE",
      "OTHER_ADJUSTMENT",
    ]).notNull(),

    // Financial (ETB accounting)
    amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),

    // Date the adjustment was recorded
    adjustment_date: datetime("adjustment_date", { mode: "date" }).notNull(),

    // Description / reason
    description: varchar("description", { length: 255 }),
    reason: text("reason").notNull(),

    // Source operational record reference (preserved even if source is
    // hard-deleted). No DB-level FK so hard-deleted sources don't violate
    // the constraint.
    source_record_type: mysqlEnum("source_record_type", [
      "FLIGHT_BOOKING",
      "GROUP_HOTEL_STAY",
      "TRANSPORT_SEGMENT",
      "VISA_APPLICATION",
      "REGISTRATION",
    ]).notNull(),
    source_record_id: fkUuid("source_record_id").notNull(),
    source_record_number: varchar("source_record_number", { length: 30 }),

    // Business dimensions (copied from expense for reporting convenience)
    traveller_id: fkUuid("traveller_id"),
    registration_id: fkUuid("registration_id"),
    travel_group_id: fkUuid("travel_group_id"),

    ...auditMetadata,
    ...actorMetadata,
    ...softDeleteMetadata,
  },
  (table) => [
    // Duplicate prevention: one adjustment of each type per expense
    unique("expense_adjustments_expense_type_unique").on(table.expense_id, table.adjustment_type),
    index("expense_adjustments_expense_id_idx").on(table.expense_id),
    index("expense_adjustments_source_record_idx").on(
      table.source_record_id,
      table.source_record_type
    ),
    index("expense_adjustments_traveller_id_idx").on(table.traveller_id),
    index("expense_adjustments_registration_id_idx").on(table.registration_id),
  ]
);

// Relations
export const invoiceStatusesRelations = relations(invoiceStatuses, ({ many }) => ({
  invoices: many(invoices),
}));

export const paymentStatusesRelations = relations(paymentStatuses, ({ many }) => ({
  payments: many(payments),
}));

export const payerTypesRelations = relations(payerTypes, ({ many }) => ({
  payers: many(payers),
}));

export const payerStatusesRelations = relations(payerStatuses, ({ many }) => ({
  payers: many(payers),
}));

export const paymentMethodStatusesRelations = relations(paymentMethodStatuses, ({ many }) => ({
  paymentMethods: many(paymentMethods),
}));

export const paymentMethodsRelations = relations(paymentMethods, ({ one, many }) => ({
  status: one(paymentMethodStatuses, {
    fields: [paymentMethods.payment_method_status_id],
    references: [paymentMethodStatuses.id],
  }),
  payments: many(payments),
}));

export const invoiceLineItemTypesRelations = relations(invoiceLineItemTypes, ({ many }) => ({
  lineItems: many(invoiceLineItems),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  registration: one(registrations, {
    fields: [invoices.registration_id],
    references: [registrations.id],
  }),
  currency: one(currencies, {
    fields: [invoices.currency_id],
    references: [currencies.id],
  }),
  status: one(invoiceStatuses, {
    fields: [invoices.invoice_status_id],
    references: [invoiceStatuses.id],
  }),
  createdBy: one(users, {
    fields: [invoices.created_by],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [invoices.updated_by],
    references: [users.id],
  }),
  lineItems: many(invoiceLineItems),
  allocations: many(paymentAllocations),
}));

export const invoiceLineItemsRelations = relations(invoiceLineItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceLineItems.invoice_id],
    references: [invoices.id],
  }),
  lineItemType: one(invoiceLineItemTypes, {
    fields: [invoiceLineItems.line_item_type_id],
    references: [invoiceLineItemTypes.id],
  }),
  createdBy: one(users, {
    fields: [invoiceLineItems.created_by],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [invoiceLineItems.updated_by],
    references: [users.id],
  }),
}));

export const payersRelations = relations(payers, ({ one, many }) => ({
  payerType: one(payerTypes, {
    fields: [payers.payer_type_id],
    references: [payerTypes.id],
  }),
  status: one(payerStatuses, {
    fields: [payers.payer_status_id],
    references: [payerStatuses.id],
  }),
  traveller: one(travellers, {
    fields: [payers.traveller_id],
    references: [travellers.id],
  }),
  contactPerson: one(contactPersons, {
    fields: [payers.contact_person_id],
    references: [contactPersons.id],
  }),
  createdBy: one(users, {
    fields: [payers.created_by],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [payers.updated_by],
    references: [users.id],
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  payer: one(payers, {
    fields: [payments.payer_id],
    references: [payers.id],
  }),
  paymentMethod: one(paymentMethods, {
    fields: [payments.payment_method_id],
    references: [paymentMethods.id],
  }),
  originalCurrency: one(currencies, {
    fields: [payments.original_currency_id],
    references: [currencies.id],
  }),
  status: one(paymentStatuses, {
    fields: [payments.payment_status_id],
    references: [paymentStatuses.id],
  }),
  receivedBy: one(users, {
    fields: [payments.received_by],
    references: [users.id],
  }),
  createdBy: one(users, {
    fields: [payments.created_by],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [payments.updated_by],
    references: [users.id],
  }),
  allocations: many(paymentAllocations),
}));

export const paymentAllocationsRelations = relations(paymentAllocations, ({ one }) => ({
  payment: one(payments, {
    fields: [paymentAllocations.payment_id],
    references: [payments.id],
  }),
  invoice: one(invoices, {
    fields: [paymentAllocations.invoice_id],
    references: [invoices.id],
  }),
  createdBy: one(users, {
    fields: [paymentAllocations.created_by],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [paymentAllocations.updated_by],
    references: [users.id],
  }),
}));

// Round 6 — Relations for new finance entities

export const expenseStatusesRelations = relations(expenseStatuses, ({ many }) => ({
  expenses: many(expenses),
}));

export const expenseCategoriesRelations = relations(expenseCategories, ({ many }) => ({
  expenses: many(expenses),
}));

export const expenseSourcesRelations = relations(expenseSources, ({ many }) => ({
  expenses: many(expenses),
}));

export const expensesRelations = relations(expenses, ({ one, many }) => ({
  category: one(expenseCategories, {
    fields: [expenses.expense_category_id],
    references: [expenseCategories.id],
  }),
  source: one(expenseSources, {
    fields: [expenses.expense_source_id],
    references: [expenseSources.id],
  }),
  status: one(expenseStatuses, {
    fields: [expenses.expense_status_id],
    references: [expenseStatuses.id],
  }),
  vendor: one(vendors, {
    fields: [expenses.vendor_id],
    references: [vendors.id],
  }),
  traveller: one(travellers, {
    fields: [expenses.traveller_id],
    references: [travellers.id],
  }),
  registration: one(registrations, {
    fields: [expenses.registration_id],
    references: [registrations.id],
  }),
  travelGroup: one(travelGroups, {
    fields: [expenses.travel_group_id],
    references: [travelGroups.id],
  }),
  packageVersion: one(packageVersions, {
    fields: [expenses.package_version_id],
    references: [packageVersions.id],
  }),
  sourceVisaApplication: one(visaApplications, {
    fields: [expenses.source_visa_application_id],
    references: [visaApplications.id],
  }),
  sourceFlightBooking: one(flightBookings, {
    fields: [expenses.source_flight_booking_id],
    references: [flightBookings.id],
  }),
  sourceGroupHotelStay: one(groupHotelStays, {
    fields: [expenses.source_group_hotel_stay_id],
    references: [groupHotelStays.id],
  }),
  sourceTransportSegment: one(transportSegments, {
    fields: [expenses.source_transport_segment_id],
    references: [transportSegments.id],
  }),
  allocations: many(expenseAllocations),
  adjustments: many(expenseAdjustments),
  createdBy: one(users, {
    fields: [expenses.created_by],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [expenses.updated_by],
    references: [users.id],
  }),
}));

export const expenseAllocationsRelations = relations(expenseAllocations, ({ one }) => ({
  expense: one(expenses, {
    fields: [expenseAllocations.expense_id],
    references: [expenses.id],
  }),
  traveller: one(travellers, {
    fields: [expenseAllocations.traveller_id],
    references: [travellers.id],
  }),
  registration: one(registrations, {
    fields: [expenseAllocations.registration_id],
    references: [registrations.id],
  }),
}));

export const financeExceptionStatusesRelations = relations(
  financeExceptionStatuses,
  ({ many }) => ({
    exceptions: many(financeExceptions),
  })
);

export const financeExceptionsRelations = relations(financeExceptions, ({ one }) => ({
  registration: one(registrations, {
    fields: [financeExceptions.registration_id],
    references: [registrations.id],
  }),
  status: one(financeExceptionStatuses, {
    fields: [financeExceptions.finance_exception_status_id],
    references: [financeExceptionStatuses.id],
  }),
  approvedBy: one(users, {
    fields: [financeExceptions.approved_by],
    references: [users.id],
  }),
  createdBy: one(users, {
    fields: [financeExceptions.created_by],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [financeExceptions.updated_by],
    references: [users.id],
  }),
}));

export const refundStatusesRelations = relations(refundStatuses, ({ many }) => ({
  refunds: many(refunds),
}));

export const refundsRelations = relations(refunds, ({ one }) => ({
  payment: one(payments, {
    fields: [refunds.payment_id],
    references: [payments.id],
  }),
  payer: one(payers, {
    fields: [refunds.payer_id],
    references: [payers.id],
  }),
  status: one(refundStatuses, {
    fields: [refunds.refund_status_id],
    references: [refundStatuses.id],
  }),
  approvedBy: one(users, {
    fields: [refunds.approved_by],
    references: [users.id],
  }),
  registration: one(registrations, {
    fields: [refunds.registration_id],
    references: [registrations.id],
  }),
  createdBy: one(users, {
    fields: [refunds.created_by],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [refunds.updated_by],
    references: [users.id],
  }),
}));

// Round 7 — Expense adjustment relations

export const expenseAdjustmentsRelations = relations(expenseAdjustments, ({ one }) => ({
  expense: one(expenses, {
    fields: [expenseAdjustments.expense_id],
    references: [expenses.id],
  }),
  traveller: one(travellers, {
    fields: [expenseAdjustments.traveller_id],
    references: [travellers.id],
  }),
  registration: one(registrations, {
    fields: [expenseAdjustments.registration_id],
    references: [registrations.id],
  }),
  travelGroup: one(travelGroups, {
    fields: [expenseAdjustments.travel_group_id],
    references: [travelGroups.id],
  }),
  createdBy: one(users, {
    fields: [expenseAdjustments.created_by],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [expenseAdjustments.updated_by],
    references: [users.id],
  }),
}));
