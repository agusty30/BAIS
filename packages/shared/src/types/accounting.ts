export enum AccountType {
  ASSET = 'asset',
  LIABILITY = 'liability',
  EQUITY = 'equity',
  REVENUE = 'revenue',
  EXPENSE = 'expense',
}

export enum NormalBalance {
  DEBIT = 'debit',
  CREDIT = 'credit',
}

export enum JournalEntryStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  POSTED = 'posted',
  VOIDED = 'voided',
}

export enum FiscalPeriodStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  LOCKED = 'locked',
}

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  normalBalance: NormalBalance;
  parentId: string | null;
  level: number;
  path: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface JournalEntryLine {
  id: string;
  journalEntryId: string;
  accountId: string;
  debitAmount: number;
  creditAmount: number;
  description: string;
  lineOrder: number;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: Date;
  description: string;
  reference: string | null;
  status: JournalEntryStatus;
  fiscalPeriodId: string;
  totalAmount: number;
  createdById: string;
  blockchainTxId: string | null;
  lines: JournalEntryLine[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FiscalPeriod {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: FiscalPeriodStatus;
  year: number;
}

export interface AccountBalance {
  id: string;
  accountId: string;
  fiscalPeriodId: string;
  debitTotal: number;
  creditTotal: number;
  balance: number;
  lastUpdatedAt: Date;
}

export interface CreateJournalEntryInput {
  date: string;
  description: string;
  reference?: string;
  fiscalPeriodId: string;
  lines: {
    accountId: string;
    debitAmount: number;
    creditAmount: number;
    description: string;
  }[];
}

// --- Extended Accounting Types ---

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export enum InvoiceType {
  RECEIVABLE = 'receivable',
  PAYABLE = 'payable',
}

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxId: string | null;
  creditLimit: number;
  balance: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vendor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxId: string | null;
  paymentTerms: number;
  balance: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: InvoiceType;
  customerId: string | null;
  vendorId: string | null;
  date: Date;
  dueDate: Date;
  status: InvoiceStatus;
  totalAmount: number;
  paidAmount: number;
  description: string;
  journalEntryId: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  date: Date;
  method: string;
  reference: string | null;
  journalEntryId: string | null;
  createdById: string;
  createdAt: Date;
}

export interface BudgetItem {
  id: string;
  accountId: string;
  fiscalPeriodId: string;
  budgetAmount: number;
  actualAmount: number;
  variance: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CostCenter {
  id: string;
  code: string;
  name: string;
  description: string | null;
  managerId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GeneralLedgerEntry {
  id: string;
  accountId: string;
  journalEntryId: string;
  fiscalPeriodId: string;
  date: Date;
  description: string;
  debitAmount: number;
  creditAmount: number;
  runningBalance: number;
  createdAt: Date;
}
