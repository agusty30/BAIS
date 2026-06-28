import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const roleEnum = pgEnum('role', ['admin', 'accountant', 'manager', 'auditor', 'viewer']);
export const accountTypeEnum = pgEnum('account_type', ['asset', 'liability', 'equity', 'revenue', 'expense']);
export const normalBalanceEnum = pgEnum('normal_balance', ['debit', 'credit']);
export const journalEntryStatusEnum = pgEnum('journal_entry_status', ['draft', 'pending_approval', 'approved', 'posted', 'voided']);
export const fiscalPeriodStatusEnum = pgEnum('fiscal_period_status', ['open', 'closed', 'locked']);
export const workflowStatusEnum = pgEnum('workflow_status', ['pending', 'approved', 'rejected', 'cancelled']);
export const approvalStepStatusEnum = pgEnum('approval_step_status', ['pending', 'approved', 'rejected', 'skipped']);

// Users
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  role: roleEnum('role').notNull().default('viewer'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Accounts (Chart of Accounts)
export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 10 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  type: accountTypeEnum('type').notNull(),
  normalBalance: normalBalanceEnum('normal_balance').notNull(),
  parentId: uuid('parent_id'),
  level: integer('level').notNull().default(0),
  path: varchar('path', { length: 500 }).notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('accounts_code_idx').on(table.code),
  index('accounts_type_idx').on(table.type),
  index('accounts_parent_idx').on(table.parentId),
]);

// Fiscal Periods
export const fiscalPeriods = pgTable('fiscal_periods', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  status: fiscalPeriodStatusEnum('status').notNull().default('open'),
  year: integer('year').notNull(),
});

// Journal Entries
export const journalEntries = pgTable('journal_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  entryNumber: varchar('entry_number', { length: 50 }).notNull().unique(),
  date: timestamp('date').notNull(),
  description: text('description').notNull(),
  reference: varchar('reference', { length: 255 }),
  status: journalEntryStatusEnum('status').notNull().default('draft'),
  fiscalPeriodId: uuid('fiscal_period_id').notNull().references(() => fiscalPeriods.id),
  totalAmount: integer('total_amount').notNull().default(0),
  createdById: uuid('created_by_id').notNull().references(() => users.id),
  blockchainTxId: varchar('blockchain_tx_id', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('journal_entries_status_idx').on(table.status),
  index('journal_entries_date_idx').on(table.date),
  index('journal_entries_period_idx').on(table.fiscalPeriodId),
  index('journal_entries_created_by_idx').on(table.createdById),
]);

// Journal Entry Lines
export const journalEntryLines = pgTable('journal_entry_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  journalEntryId: uuid('journal_entry_id').notNull().references(() => journalEntries.id),
  accountId: uuid('account_id').notNull().references(() => accounts.id),
  debitAmount: integer('debit_amount').notNull().default(0),
  creditAmount: integer('credit_amount').notNull().default(0),
  description: text('description').default(''),
  lineOrder: integer('line_order').notNull(),
}, (table) => [
  index('journal_lines_entry_idx').on(table.journalEntryId),
  index('journal_lines_account_idx').on(table.accountId),
]);

// Account Balances (materialized running totals)
export const accountBalances = pgTable('account_balances', {
  id: uuid('id').defaultRandom().primaryKey(),
  accountId: uuid('account_id').notNull().references(() => accounts.id),
  fiscalPeriodId: uuid('fiscal_period_id').notNull().references(() => fiscalPeriods.id),
  debitTotal: integer('debit_total').notNull().default(0),
  creditTotal: integer('credit_total').notNull().default(0),
  balance: integer('balance').notNull().default(0),
  lastUpdatedAt: timestamp('last_updated_at').notNull().defaultNow(),
}, (table) => [
  index('account_balances_account_period_idx').on(table.accountId, table.fiscalPeriodId),
]);

// Approval Workflows
export const approvalWorkflows = pgTable('approval_workflows', {
  id: uuid('id').defaultRandom().primaryKey(),
  journalEntryId: uuid('journal_entry_id').notNull().references(() => journalEntries.id),
  status: workflowStatusEnum('status').notNull().default('pending'),
  currentStep: integer('current_step').notNull().default(1),
  totalSteps: integer('total_steps').notNull(),
  initiatedById: uuid('initiated_by_id').notNull().references(() => users.id),
  blockchainTxId: varchar('blockchain_tx_id', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
});

// Approval Steps
export const approvalSteps = pgTable('approval_steps', {
  id: uuid('id').defaultRandom().primaryKey(),
  workflowId: uuid('workflow_id').notNull().references(() => approvalWorkflows.id),
  stepOrder: integer('step_order').notNull(),
  approverId: uuid('approver_id').references(() => users.id),
  requiredRole: varchar('required_role', { length: 50 }).notNull(),
  status: approvalStepStatusEnum('status').notNull().default('pending'),
  comments: text('comments'),
  decidedAt: timestamp('decided_at'),
  blockchainTxId: varchar('blockchain_tx_id', { length: 255 }),
});

// Workflow Templates
export const workflowTemplates = pgTable('workflow_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  minAmount: integer('min_amount').notNull().default(0),
  maxAmount: integer('max_amount'),
  steps: jsonb('steps').notNull().$type<{ stepOrder: number; requiredRole: string; escalationTimeoutHours: number }[]>(),
  isActive: boolean('is_active').notNull().default(true),
});

// Audit Logs
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  resource: varchar('resource', { length: 100 }).notNull(),
  resourceId: varchar('resource_id', { length: 255 }),
  details: jsonb('details').$type<Record<string, unknown>>(),
  ipAddress: varchar('ip_address', { length: 45 }),
  blockchainTxId: varchar('blockchain_tx_id', { length: 255 }),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
}, (table) => [
  index('audit_logs_user_idx').on(table.userId),
  index('audit_logs_resource_idx').on(table.resource, table.resourceId),
  index('audit_logs_timestamp_idx').on(table.timestamp),
]);

// COSO Evaluations
export const cosoEvaluations = pgTable('coso_evaluations', {
  id: uuid('id').defaultRandom().primaryKey(),
  component: varchar('component', { length: 50 }).notNull(),
  score: integer('score').notNull(),
  evidence: jsonb('evidence').notNull().$type<{ control: string; description: string; implemented: boolean; effectiveness: string }[]>(),
  evaluatedById: uuid('evaluated_by_id').notNull().references(() => users.id),
  periodId: uuid('period_id').notNull().references(() => fiscalPeriods.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// PIECES Metrics
export const piecesMetrics = pgTable('pieces_metrics', {
  id: uuid('id').defaultRandom().primaryKey(),
  dimension: varchar('dimension', { length: 50 }).notNull(),
  metricName: varchar('metric_name', { length: 100 }).notNull(),
  value: integer('value').notNull(),
  unit: varchar('unit', { length: 50 }).notNull(),
  measuredAt: timestamp('measured_at').notNull().defaultNow(),
  periodId: uuid('period_id').notNull().references(() => fiscalPeriods.id),
}, (table) => [
  index('pieces_metrics_dimension_idx').on(table.dimension),
  index('pieces_metrics_period_idx').on(table.periodId),
]);

// Notifications
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('notifications_user_idx').on(table.userId),
  index('notifications_unread_idx').on(table.userId, table.isRead),
]);

// Refresh Tokens
export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  token: varchar('token', { length: 500 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// --- Extended Accounting Tables ---

export const invoiceStatusEnum = pgEnum('invoice_status', ['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled']);
export const invoiceTypeEnum = pgEnum('invoice_type', ['receivable', 'payable']);
export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'bank_transfer', 'check', 'credit_card', 'other']);

// General Ledger (denormalized for fast queries)
export const generalLedger = pgTable('general_ledger', {
  id: uuid('id').defaultRandom().primaryKey(),
  accountId: uuid('account_id').notNull().references(() => accounts.id),
  journalEntryId: uuid('journal_entry_id').notNull().references(() => journalEntries.id),
  fiscalPeriodId: uuid('fiscal_period_id').notNull().references(() => fiscalPeriods.id),
  date: timestamp('date').notNull(),
  description: text('description').notNull().default(''),
  debitAmount: integer('debit_amount').notNull().default(0),
  creditAmount: integer('credit_amount').notNull().default(0),
  runningBalance: integer('running_balance').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('gl_account_idx').on(table.accountId),
  index('gl_period_idx').on(table.fiscalPeriodId),
  index('gl_date_idx').on(table.date),
  index('gl_entry_idx').on(table.journalEntryId),
]);

// Customers
export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  address: text('address'),
  taxId: varchar('tax_id', { length: 50 }),
  creditLimit: integer('credit_limit').notNull().default(0),
  balance: integer('balance').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('customers_name_idx').on(table.name),
]);

// Vendors
export const vendors = pgTable('vendors', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  address: text('address'),
  taxId: varchar('tax_id', { length: 50 }),
  paymentTerms: integer('payment_terms').notNull().default(30),
  balance: integer('balance').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('vendors_name_idx').on(table.name),
]);

// Invoices (AR/AP)
export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull().unique(),
  type: invoiceTypeEnum('type').notNull(),
  customerId: uuid('customer_id').references(() => customers.id),
  vendorId: uuid('vendor_id').references(() => vendors.id),
  date: timestamp('date').notNull(),
  dueDate: timestamp('due_date').notNull(),
  status: invoiceStatusEnum('status').notNull().default('draft'),
  totalAmount: integer('total_amount').notNull().default(0),
  paidAmount: integer('paid_amount').notNull().default(0),
  description: text('description').notNull().default(''),
  journalEntryId: uuid('journal_entry_id').references(() => journalEntries.id),
  createdById: uuid('created_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('invoices_type_idx').on(table.type),
  index('invoices_status_idx').on(table.status),
  index('invoices_customer_idx').on(table.customerId),
  index('invoices_vendor_idx').on(table.vendorId),
  index('invoices_due_date_idx').on(table.dueDate),
]);

// Payments
export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id),
  amount: integer('amount').notNull(),
  date: timestamp('date').notNull(),
  method: paymentMethodEnum('method').notNull(),
  reference: varchar('reference', { length: 255 }),
  journalEntryId: uuid('journal_entry_id').references(() => journalEntries.id),
  createdById: uuid('created_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('payments_invoice_idx').on(table.invoiceId),
  index('payments_date_idx').on(table.date),
]);

// Budget Items
export const budgetItems = pgTable('budget_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  accountId: uuid('account_id').notNull().references(() => accounts.id),
  fiscalPeriodId: uuid('fiscal_period_id').notNull().references(() => fiscalPeriods.id),
  budgetAmount: integer('budget_amount').notNull().default(0),
  actualAmount: integer('actual_amount').notNull().default(0),
  variance: integer('variance').notNull().default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('budget_account_period_idx').on(table.accountId, table.fiscalPeriodId),
]);

// Cost Centers
export const costCenters = pgTable('cost_centers', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  managerId: uuid('manager_id').references(() => users.id),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Application Settings
export const settings = pgTable('settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: text('value').notNull(),
  category: varchar('category', { length: 50 }).notNull().default('general'),
  updatedById: uuid('updated_by_id').references(() => users.id),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Blockchain Records (for integrity verification)
export const blockchainRecords = pgTable('blockchain_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  recordType: varchar('record_type', { length: 50 }).notNull(),
  recordId: varchar('record_id', { length: 255 }).notNull(),
  hash: varchar('hash', { length: 128 }).notNull(),
  previousHash: varchar('previous_hash', { length: 128 }),
  merkleRoot: varchar('merkle_root', { length: 128 }),
  blockchainTxId: varchar('blockchain_tx_id', { length: 255 }),
  verifiedAt: timestamp('verified_at'),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('bc_records_type_idx').on(table.recordType, table.recordId),
  index('bc_records_hash_idx').on(table.hash),
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  journalEntries: many(journalEntries),
  auditLogs: many(auditLogs),
  notifications: many(notifications),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  parent: one(accounts, { fields: [accounts.parentId], references: [accounts.id] }),
  balances: many(accountBalances),
  journalLines: many(journalEntryLines),
}));

export const journalEntriesRelations = relations(journalEntries, ({ one, many }) => ({
  createdBy: one(users, { fields: [journalEntries.createdById], references: [users.id] }),
  fiscalPeriod: one(fiscalPeriods, { fields: [journalEntries.fiscalPeriodId], references: [fiscalPeriods.id] }),
  lines: many(journalEntryLines),
  workflow: many(approvalWorkflows),
}));

export const journalEntryLinesRelations = relations(journalEntryLines, ({ one }) => ({
  journalEntry: one(journalEntries, { fields: [journalEntryLines.journalEntryId], references: [journalEntries.id] }),
  account: one(accounts, { fields: [journalEntryLines.accountId], references: [accounts.id] }),
}));
