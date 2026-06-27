export enum ReportType {
  TRIAL_BALANCE = 'trial_balance',
  INCOME_STATEMENT = 'income_statement',
  BALANCE_SHEET = 'balance_sheet',
  CASH_FLOW = 'cash_flow',
  GENERAL_LEDGER = 'general_ledger',
}

export interface TrialBalanceRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  debitBalance: number;
  creditBalance: number;
}

export interface TrialBalanceReport {
  type: ReportType.TRIAL_BALANCE;
  periodId: string;
  periodName: string;
  generatedAt: Date;
  rows: TrialBalanceRow[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
}

export interface IncomeStatementSection {
  label: string;
  accounts: { code: string; name: string; amount: number }[];
  total: number;
}

export interface IncomeStatementReport {
  type: ReportType.INCOME_STATEMENT;
  periodId: string;
  periodName: string;
  generatedAt: Date;
  revenue: IncomeStatementSection;
  expenses: IncomeStatementSection;
  netIncome: number;
  comparativePeriod?: {
    periodName: string;
    revenue: number;
    expenses: number;
    netIncome: number;
  };
}

export interface BalanceSheetSection {
  label: string;
  accounts: { code: string; name: string; amount: number }[];
  total: number;
}

export interface BalanceSheetReport {
  type: ReportType.BALANCE_SHEET;
  asOfDate: Date;
  generatedAt: Date;
  assets: BalanceSheetSection;
  liabilities: BalanceSheetSection;
  equity: BalanceSheetSection;
  totalAssets: number;
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
}

export interface CashFlowReport {
  type: ReportType.CASH_FLOW;
  periodId: string;
  periodName: string;
  generatedAt: Date;
  operating: { items: { description: string; amount: number }[]; total: number };
  investing: { items: { description: string; amount: number }[]; total: number };
  financing: { items: { description: string; amount: number }[]; total: number };
  netCashFlow: number;
  beginningBalance: number;
  endingBalance: number;
}
