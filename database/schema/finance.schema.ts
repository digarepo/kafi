import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  datetime,
  decimal,
  index,
  int,
  mysqlTable,
  text,
  unique,
  varchar,
} from 'drizzle-orm/mysql-core';
import {
  actorMetadata,
  auditMetadata,
  codeColumn,
  currencies,
  fkUuid,
  idColumn,
  nameColumn,
  softDeleteMetadata,
} from './common.schema.js';
import { users } from './iam.schema.js';
import { contactPersons, registrations, travellers } from './travellers.schema.js';

/**
 * Lifecycle states for invoices: Draft, Sent, Partially Paid, Paid, Overdue,
 * Cancelled.
 */
export const invoiceStatuses = mysqlTable('invoice_statuses', {
  id: idColumn,
  status_code: codeColumn('status_code'),
  name: nameColumn(),
  description: text('description'),
  display_order: int('display_order').notNull().default(1),
  is_active: boolean('is_active').notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * Lifecycle states for payments: Pending, Completed, Cancelled, Reconciled.
 */
export const paymentStatuses = mysqlTable('payment_statuses', {
  id: idColumn,
  status_code: codeColumn('status_code'),
  name: nameColumn(),
  description: text('description'),
  display_order: int('display_order').notNull().default(1),
  is_active: boolean('is_active').notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * Payer classification: Individual or Organization.
 */
export const payerTypes = mysqlTable('payer_types', {
  id: idColumn,
  type_code: codeColumn('type_code'),
  name: nameColumn(),
  description: text('description'),
  display_order: int('display_order').notNull().default(1),
  is_active: boolean('is_active').notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * Lifecycle states for payers: Active, Inactive, Blacklisted.
 */
export const payerStatuses = mysqlTable('payer_statuses', {
  id: idColumn,
  status_code: codeColumn('status_code'),
  name: nameColumn(),
  description: text('description'),
  display_order: int('display_order').notNull().default(1),
  is_active: boolean('is_active').notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * Lifecycle states for payment methods: Active, Inactive.
 */
export const paymentMethodStatuses = mysqlTable('payment_method_statuses', {
  id: idColumn,
  status_code: codeColumn('status_code'),
  name: nameColumn(),
  description: text('description'),
  display_order: int('display_order').notNull().default(1),
  is_active: boolean('is_active').notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * Master payment methods: Cash, Bank Transfer, Mobile Banking, Card, Online
 * Gateway.
 */
export const paymentMethods = mysqlTable(
  'payment_methods',
  {
    id: idColumn,
    method_code: codeColumn('method_code'),
    name: nameColumn(),
    description: text('description'),
    payment_method_status_id: fkUuid('payment_method_status_id').notNull(),
    display_order: int('display_order').notNull().default(1),
    ...auditMetadata,
    ...softDeleteMetadata,
  },
  (table) => [],
);

/**
 * Optional classification for invoice line items (e.g. Package Cost, Visa
 * Processing, Hotel Upgrade). Seeded for future reporting use; not required
 * on `invoice_line_items` in Slice 4.
 */
export const invoiceLineItemTypes = mysqlTable('invoice_line_item_types', {
  id: idColumn,
  line_item_type_code: codeColumn('line_item_type_code'),
  name: nameColumn(),
  description: text('description'),
  display_order: int('display_order').notNull().default(1),
  is_active: boolean('is_active').notNull().default(true),
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
  'invoices',
  {
    id: idColumn,
    invoice_number: varchar('invoice_number', { length: 30 })
      .notNull()
      .unique(),
    registration_id: fkUuid('registration_id').notNull(),
    invoice_date: datetime('invoice_date', { mode: 'date' }).notNull(),
    due_date: datetime('due_date', { mode: 'date' }),
    subtotal: decimal('subtotal', { precision: 18, scale: 2 }).notNull(),
    discount_amount: decimal('discount_amount', { precision: 18, scale: 2 })
      .notNull()
      .default('0'),
    total_amount: decimal('total_amount', { precision: 18, scale: 2 }).notNull(),
    currency_id: fkUuid('currency_id').notNull(),
    invoice_status_id: fkUuid('invoice_status_id').notNull(),
    notes: text('notes'),
    ...auditMetadata,
    ...actorMetadata,
    ...softDeleteMetadata,
  },
  (table) => [index('invoices_registration_id_idx').on(table.registration_id)],
);

/**
 * A single billable charge on an invoice.
 *
 * Invoice `subtotal` is always derived from the sum of its line items; line
 * items are the source of truth for what is owed.
 */
export const invoiceLineItems = mysqlTable(
  'invoice_line_items',
  {
    id: idColumn,
    invoice_id: fkUuid('invoice_id').notNull(),
    line_item_type_id: fkUuid('line_item_type_id'),
    description: varchar('description', { length: 255 }).notNull(),
    quantity: decimal('quantity', { precision: 18, scale: 2 })
      .notNull()
      .default('1'),
    unit_price: decimal('unit_price', { precision: 18, scale: 2 }).notNull(),
    total_price: decimal('total_price', { precision: 18, scale: 2 }).notNull(),
    notes: text('notes'),
    ...auditMetadata,
    ...actorMetadata,
    ...softDeleteMetadata,
  },
  (table) => [
    index('invoice_line_items_invoice_id_idx').on(table.invoice_id),
  ],
);

/**
 * A person or organization that pays for one or more registrations.
 *
 * `payer_type = ORGANIZATION` requires `organization_name`.
 * `payer_type = INDIVIDUAL` requires either `traveller_id` or
 * `contact_person_id`.
 */
export const payers = mysqlTable(
  'payers',
  {
    id: idColumn,
    payer_number: varchar('payer_number', { length: 30 }).notNull().unique(),
    payer_type_id: fkUuid('payer_type_id').notNull(),
    traveller_id: fkUuid('traveller_id'),
    contact_person_id: fkUuid('contact_person_id'),
    organization_name: varchar('organization_name', { length: 255 }),
    contact_name: varchar('contact_name', { length: 255 }),
    phone_number: varchar('phone_number', { length: 30 }),
    email_address: varchar('email_address', { length: 255 }),
    payer_status_id: fkUuid('payer_status_id').notNull(),
    notes: text('notes'),
    ...auditMetadata,
    ...actorMetadata,
    ...softDeleteMetadata,
  },
  (table) => [],
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
  'payments',
  {
    id: idColumn,
    payment_number: varchar('payment_number', { length: 30 })
      .notNull()
      .unique(),
    payer_id: fkUuid('payer_id').notNull(),
    payment_method_id: fkUuid('payment_method_id').notNull(),
    payment_date: datetime('payment_date', { mode: 'date' }).notNull(),
    original_amount: decimal('original_amount', { precision: 18, scale: 2 }).notNull(),
    original_currency_id: fkUuid('original_currency_id').notNull(),
    exchange_rate: decimal('exchange_rate', {
      precision: 18,
      scale: 6,
    }).notNull(),
    amount: decimal('amount', { precision: 18, scale: 2 }).notNull(),
    reference_number: varchar('reference_number', { length: 100 }),
    received_by: fkUuid('received_by').notNull(),
    payment_status_id: fkUuid('payment_status_id').notNull(),
    notes: text('notes'),
    ...auditMetadata,
    ...actorMetadata,
    ...softDeleteMetadata,
  },
  (table) => [index('payments_payer_id_idx').on(table.payer_id)],
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
  'payment_allocations',
  {
    id: idColumn,
    payment_id: fkUuid('payment_id').notNull(),
    invoice_id: fkUuid('invoice_id').notNull(),
    allocated_amount: decimal('allocated_amount', {
      precision: 18,
      scale: 2,
    }).notNull(),
    allocation_date: datetime('allocation_date', { mode: 'date' })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    notes: text('notes'),
    ...auditMetadata,
    ...actorMetadata,
    ...softDeleteMetadata,
  },
  (table) => [
    unique('payment_allocations_payment_invoice_unique').on(
      table.payment_id,
      table.invoice_id,
    ),
    index('payment_allocations_invoice_id_idx').on(table.invoice_id),
    index('payment_allocations_payment_id_idx').on(table.payment_id),
  ],
);

// Relations
export const invoiceStatusesRelations = relations(
  invoiceStatuses,
  ({ many }) => ({
    invoices: many(invoices),
  }),
);

export const paymentStatusesRelations = relations(
  paymentStatuses,
  ({ many }) => ({
    payments: many(payments),
  }),
);

export const payerTypesRelations = relations(payerTypes, ({ many }) => ({
  payers: many(payers),
}));

export const payerStatusesRelations = relations(payerStatuses, ({ many }) => ({
  payers: many(payers),
}));

export const paymentMethodStatusesRelations = relations(
  paymentMethodStatuses,
  ({ many }) => ({
    paymentMethods: many(paymentMethods),
  }),
);

export const paymentMethodsRelations = relations(
  paymentMethods,
  ({ one, many }) => ({
    status: one(paymentMethodStatuses, {
      fields: [paymentMethods.payment_method_status_id],
      references: [paymentMethodStatuses.id],
    }),
    payments: many(payments),
  }),
);

export const invoiceLineItemTypesRelations = relations(
  invoiceLineItemTypes,
  ({ many }) => ({
    lineItems: many(invoiceLineItems),
  }),
);

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

export const invoiceLineItemsRelations = relations(
  invoiceLineItems,
  ({ one }) => ({
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
  }),
);

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

export const paymentAllocationsRelations = relations(
  paymentAllocations,
  ({ one }) => ({
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
  }),
);
