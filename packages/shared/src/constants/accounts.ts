import { AccountType, NormalBalance } from '../types/accounting.js';

export interface DefaultAccount {
  code: string;
  name: string;
  type: AccountType;
  normalBalance: NormalBalance;
  children?: DefaultAccount[];
}

export const DEFAULT_CHART_OF_ACCOUNTS: DefaultAccount[] = [
  {
    code: '1000',
    name: 'Assets',
    type: AccountType.ASSET,
    normalBalance: NormalBalance.DEBIT,
    children: [
      { code: '1100', name: 'Cash and Cash Equivalents', type: AccountType.ASSET, normalBalance: NormalBalance.DEBIT, children: [
        { code: '1110', name: 'Cash on Hand', type: AccountType.ASSET, normalBalance: NormalBalance.DEBIT },
        { code: '1120', name: 'Bank Accounts', type: AccountType.ASSET, normalBalance: NormalBalance.DEBIT },
      ]},
      { code: '1200', name: 'Accounts Receivable', type: AccountType.ASSET, normalBalance: NormalBalance.DEBIT },
      { code: '1300', name: 'Inventory', type: AccountType.ASSET, normalBalance: NormalBalance.DEBIT },
      { code: '1400', name: 'Prepaid Expenses', type: AccountType.ASSET, normalBalance: NormalBalance.DEBIT },
      { code: '1500', name: 'Fixed Assets', type: AccountType.ASSET, normalBalance: NormalBalance.DEBIT, children: [
        { code: '1510', name: 'Equipment', type: AccountType.ASSET, normalBalance: NormalBalance.DEBIT },
        { code: '1520', name: 'Buildings', type: AccountType.ASSET, normalBalance: NormalBalance.DEBIT },
        { code: '1590', name: 'Accumulated Depreciation', type: AccountType.ASSET, normalBalance: NormalBalance.CREDIT },
      ]},
    ],
  },
  {
    code: '2000',
    name: 'Liabilities',
    type: AccountType.LIABILITY,
    normalBalance: NormalBalance.CREDIT,
    children: [
      { code: '2100', name: 'Accounts Payable', type: AccountType.LIABILITY, normalBalance: NormalBalance.CREDIT },
      { code: '2200', name: 'Accrued Expenses', type: AccountType.LIABILITY, normalBalance: NormalBalance.CREDIT },
      { code: '2300', name: 'Short-term Loans', type: AccountType.LIABILITY, normalBalance: NormalBalance.CREDIT },
      { code: '2400', name: 'Long-term Debt', type: AccountType.LIABILITY, normalBalance: NormalBalance.CREDIT },
      { code: '2500', name: 'Tax Payable', type: AccountType.LIABILITY, normalBalance: NormalBalance.CREDIT },
    ],
  },
  {
    code: '3000',
    name: 'Equity',
    type: AccountType.EQUITY,
    normalBalance: NormalBalance.CREDIT,
    children: [
      { code: '3100', name: 'Owner\'s Capital', type: AccountType.EQUITY, normalBalance: NormalBalance.CREDIT },
      { code: '3200', name: 'Retained Earnings', type: AccountType.EQUITY, normalBalance: NormalBalance.CREDIT },
      { code: '3300', name: 'Dividends', type: AccountType.EQUITY, normalBalance: NormalBalance.DEBIT },
    ],
  },
  {
    code: '4000',
    name: 'Revenue',
    type: AccountType.REVENUE,
    normalBalance: NormalBalance.CREDIT,
    children: [
      { code: '4100', name: 'Sales Revenue', type: AccountType.REVENUE, normalBalance: NormalBalance.CREDIT },
      { code: '4200', name: 'Service Revenue', type: AccountType.REVENUE, normalBalance: NormalBalance.CREDIT },
      { code: '4300', name: 'Interest Income', type: AccountType.REVENUE, normalBalance: NormalBalance.CREDIT },
      { code: '4900', name: 'Other Income', type: AccountType.REVENUE, normalBalance: NormalBalance.CREDIT },
    ],
  },
  {
    code: '5000',
    name: 'Expenses',
    type: AccountType.EXPENSE,
    normalBalance: NormalBalance.DEBIT,
    children: [
      { code: '5100', name: 'Cost of Goods Sold', type: AccountType.EXPENSE, normalBalance: NormalBalance.DEBIT },
      { code: '5200', name: 'Salaries and Wages', type: AccountType.EXPENSE, normalBalance: NormalBalance.DEBIT },
      { code: '5300', name: 'Rent Expense', type: AccountType.EXPENSE, normalBalance: NormalBalance.DEBIT },
      { code: '5400', name: 'Utilities Expense', type: AccountType.EXPENSE, normalBalance: NormalBalance.DEBIT },
      { code: '5500', name: 'Depreciation Expense', type: AccountType.EXPENSE, normalBalance: NormalBalance.DEBIT },
      { code: '5600', name: 'Insurance Expense', type: AccountType.EXPENSE, normalBalance: NormalBalance.DEBIT },
      { code: '5700', name: 'Office Supplies', type: AccountType.EXPENSE, normalBalance: NormalBalance.DEBIT },
      { code: '5800', name: 'Marketing Expense', type: AccountType.EXPENSE, normalBalance: NormalBalance.DEBIT },
      { code: '5900', name: 'Miscellaneous Expense', type: AccountType.EXPENSE, normalBalance: NormalBalance.DEBIT },
    ],
  },
];
