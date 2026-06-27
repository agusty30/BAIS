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
