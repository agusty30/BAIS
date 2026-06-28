import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  fullName: z.string().min(1).max(255),
  role: z.enum(['admin', 'accountant', 'manager', 'auditor', 'viewer']),
});

export const createAccountSchema = z.object({
  code: z.string().min(4).max(10).regex(/^\d+$/, 'Account code must be numeric'),
  name: z.string().min(1).max(255),
  type: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']),
  parentId: z.string().uuid().nullable().optional(),
});

export const journalEntryLineSchema = z.object({
  accountId: z.string().uuid(),
  debitAmount: z.number().int().min(0),
  creditAmount: z.number().int().min(0),
  description: z.string().max(500).optional().default(''),
});

export const createJournalEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1).max(1000),
  reference: z.string().max(255).optional(),
  fiscalPeriodId: z.string().uuid(),
  lines: z.array(journalEntryLineSchema).min(2).refine(
    (lines) => {
      const totalDebit = lines.reduce((sum, l) => sum + l.debitAmount, 0);
      const totalCredit = lines.reduce((sum, l) => sum + l.creditAmount, 0);
      return totalDebit === totalCredit;
    },
    { message: 'Total debits must equal total credits' },
  ).refine(
    (lines) => lines.every((l) => l.debitAmount > 0 || l.creditAmount > 0),
    { message: 'Each line must have either a debit or credit amount' },
  ).refine(
    (lines) => lines.every((l) => !(l.debitAmount > 0 && l.creditAmount > 0)),
    { message: 'A line cannot have both debit and credit amounts' },
  ),
});

export const approvalDecisionSchema = z.object({
  decision: z.enum(['approve', 'reject', 'return']),
  comments: z.string().max(2000).optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const dateRangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const createCustomerSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  taxId: z.string().max(50).optional().nullable(),
  creditLimit: z.number().int().min(0).default(0),
});

export const createVendorSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  taxId: z.string().max(50).optional().nullable(),
  paymentTerms: z.number().int().min(0).max(365).default(30),
});

export const createInvoiceSchema = z.object({
  type: z.enum(['receivable', 'payable']),
  customerId: z.string().uuid().optional().nullable(),
  vendorId: z.string().uuid().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalAmount: z.number().int().min(1),
  description: z.string().min(1).max(1000),
});

export const recordPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.number().int().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  method: z.enum(['cash', 'bank_transfer', 'check', 'credit_card', 'other']),
  reference: z.string().max(255).optional(),
});

export const createBudgetItemSchema = z.object({
  accountId: z.string().uuid(),
  fiscalPeriodId: z.string().uuid(),
  budgetAmount: z.number().int().min(0),
  notes: z.string().max(500).optional().nullable(),
});
