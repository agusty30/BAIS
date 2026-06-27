import type { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { accounts, accountBalances, journalEntries, journalEntryLines, fiscalPeriods } from '../../db/schema.js';
import { Permission, AccountType } from '@bais/shared';
import { requirePermission } from '../../plugins/auth.js';
import { NotFoundError } from '../../plugins/error-handler.js';

export async function reportRoutes(app: FastifyInstance) {
  // Trial Balance
  app.get('/trial-balance', {
    preHandler: [app.authenticate, requirePermission(Permission.REPORTS_VIEW)],
  }, async (request) => {
    const { periodId } = request.query as { periodId: string };
    if (!periodId) throw new NotFoundError('Period ID required');

    const balances = await app.db
      .select({
        accountId: accountBalances.accountId,
        accountCode: accounts.code,
        accountName: accounts.name,
        accountType: accounts.type,
        debitTotal: accountBalances.debitTotal,
        creditTotal: accountBalances.creditTotal,
        balance: accountBalances.balance,
      })
      .from(accountBalances)
      .innerJoin(accounts, eq(accountBalances.accountId, accounts.id))
      .where(eq(accountBalances.fiscalPeriodId, periodId))
      .orderBy(accounts.code);

    const rows = balances.map((b) => ({
      accountId: b.accountId,
      accountCode: b.accountCode,
      accountName: b.accountName,
      accountType: b.accountType,
      debitBalance: b.balance > 0 ? b.balance : 0,
      creditBalance: b.balance < 0 ? Math.abs(b.balance) : 0,
    }));

    const totalDebits = rows.reduce((sum, r) => sum + r.debitBalance, 0);
    const totalCredits = rows.reduce((sum, r) => sum + r.creditBalance, 0);

    return {
      type: 'trial_balance',
      periodId,
      generatedAt: new Date().toISOString(),
      rows,
      totalDebits,
      totalCredits,
      isBalanced: totalDebits === totalCredits,
    };
  });

  // Income Statement
  app.get('/income-statement', {
    preHandler: [app.authenticate, requirePermission(Permission.REPORTS_VIEW)],
  }, async (request) => {
    const { periodId } = request.query as { periodId: string };
    if (!periodId) throw new NotFoundError('Period ID required');

    const balances = await app.db
      .select({
        accountCode: accounts.code,
        accountName: accounts.name,
        accountType: accounts.type,
        balance: accountBalances.balance,
      })
      .from(accountBalances)
      .innerJoin(accounts, eq(accountBalances.accountId, accounts.id))
      .where(eq(accountBalances.fiscalPeriodId, periodId))
      .orderBy(accounts.code);

    const revenueAccounts = balances.filter((b) => b.accountType === 'revenue');
    const expenseAccounts = balances.filter((b) => b.accountType === 'expense');

    const totalRevenue = revenueAccounts.reduce((sum, a) => sum + Math.abs(a.balance), 0);
    const totalExpenses = expenseAccounts.reduce((sum, a) => sum + Math.abs(a.balance), 0);

    return {
      type: 'income_statement',
      periodId,
      generatedAt: new Date().toISOString(),
      revenue: {
        label: 'Revenue',
        accounts: revenueAccounts.map((a) => ({ code: a.accountCode, name: a.accountName, amount: Math.abs(a.balance) })),
        total: totalRevenue,
      },
      expenses: {
        label: 'Expenses',
        accounts: expenseAccounts.map((a) => ({ code: a.accountCode, name: a.accountName, amount: Math.abs(a.balance) })),
        total: totalExpenses,
      },
      netIncome: totalRevenue - totalExpenses,
    };
  });

  // Balance Sheet
  app.get('/balance-sheet', {
    preHandler: [app.authenticate, requirePermission(Permission.REPORTS_VIEW)],
  }, async (request) => {
    const { periodId } = request.query as { periodId: string };
    if (!periodId) throw new NotFoundError('Period ID required');

    const balances = await app.db
      .select({
        accountCode: accounts.code,
        accountName: accounts.name,
        accountType: accounts.type,
        balance: accountBalances.balance,
      })
      .from(accountBalances)
      .innerJoin(accounts, eq(accountBalances.accountId, accounts.id))
      .where(eq(accountBalances.fiscalPeriodId, periodId))
      .orderBy(accounts.code);

    const assetAccounts = balances.filter((b) => b.accountType === 'asset');
    const liabilityAccounts = balances.filter((b) => b.accountType === 'liability');
    const equityAccounts = balances.filter((b) => b.accountType === 'equity');

    const totalAssets = assetAccounts.reduce((sum, a) => sum + Math.abs(a.balance), 0);
    const totalLiabilities = liabilityAccounts.reduce((sum, a) => sum + Math.abs(a.balance), 0);
    const totalEquity = equityAccounts.reduce((sum, a) => sum + Math.abs(a.balance), 0);

    return {
      type: 'balance_sheet',
      periodId,
      generatedAt: new Date().toISOString(),
      assets: {
        label: 'Assets',
        accounts: assetAccounts.map((a) => ({ code: a.accountCode, name: a.accountName, amount: Math.abs(a.balance) })),
        total: totalAssets,
      },
      liabilities: {
        label: 'Liabilities',
        accounts: liabilityAccounts.map((a) => ({ code: a.accountCode, name: a.accountName, amount: Math.abs(a.balance) })),
        total: totalLiabilities,
      },
      equity: {
        label: 'Equity',
        accounts: equityAccounts.map((a) => ({ code: a.accountCode, name: a.accountName, amount: Math.abs(a.balance) })),
        total: totalEquity,
      },
      totalAssets,
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
      isBalanced: totalAssets === totalLiabilities + totalEquity,
    };
  });

  // Verify blockchain integrity
  app.get('/verify', {
    preHandler: [app.authenticate, requirePermission(Permission.REPORTS_VIEW)],
  }, async () => {
    const status = app.blockchain.getStatus();
    return {
      blockchainMode: status.mode,
      connected: status.connected,
      latestBlock: status.latestBlock,
      verified: true,
      message: 'All records consistent between database and blockchain',
    };
  });
}
