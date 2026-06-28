import type { FastifyInstance } from 'fastify';
import { eq, and, sql, gte } from 'drizzle-orm';
import { accounts, accountBalances, journalEntries, journalEntryLines, fiscalPeriods } from '../../db/schema.js';
import { Permission, AccountType } from '@bais/shared';
import { requirePermission } from '../../plugins/auth.js';
import { NotFoundError } from '../../plugins/error-handler.js';
import { verifyChain, getChainStats } from '../blockchain/service.js';

export async function reportRoutes(app: FastifyInstance) {
  // Monthly summary for dashboard charts
  app.get('/monthly-summary', {
    preHandler: [app.authenticate, requirePermission(Permission.REPORTS_VIEW)],
  }, async () => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const rows = await app.db
      .select({
        month: sql<string>`to_char(${journalEntries.date}, 'YYYY-MM')`,
        accountType: accounts.type,
        total: sql<number>`sum(${journalEntryLines.debitAmount} + ${journalEntryLines.creditAmount})`,
      })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .innerJoin(accounts, eq(journalEntryLines.accountId, accounts.id))
      .where(and(
        eq(journalEntries.status, 'posted'),
        gte(journalEntries.date, sixMonthsAgo),
      ))
      .groupBy(sql`to_char(${journalEntries.date}, 'YYYY-MM')`, accounts.type)
      .orderBy(sql`to_char(${journalEntries.date}, 'YYYY-MM')`);

    const months = new Map<string, { month: string; revenue: number; expenses: number }>();
    for (const row of rows) {
      const m = months.get(row.month) || { month: row.month, revenue: 0, expenses: 0 };
      if (row.accountType === 'revenue') m.revenue += Number(row.total);
      else if (row.accountType === 'expense') m.expenses += Number(row.total);
      months.set(row.month, m);
    }

    return { data: Array.from(months.values()) };
  });
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
    const stats = await getChainStats(app.db, app.blockchain);
    const verification = await verifyChain(app.db);
    return {
      blockchainMode: stats.blockchainMode,
      connected: stats.blockchainConnected,
      latestBlock: stats.latestBlock,
      verified: verification.valid,
      totalRecords: verification.totalRecords,
      verifiedCount: verification.verifiedCount,
      invalidCount: verification.invalidRecords.length,
      brokenLinks: verification.brokenLinks.length,
      merkleRoot: stats.merkleRoot,
      message: verification.valid
        ? 'All records consistent between database and blockchain'
        : `Integrity issues detected: ${verification.invalidRecords.length} invalid records, ${verification.brokenLinks.length} broken links`,
    };
  });

  // CSV Export — Trial Balance
  app.get('/trial-balance/export', {
    preHandler: [app.authenticate, requirePermission(Permission.REPORTS_EXPORT)],
  }, async (request, reply) => {
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

    const rows = balances.map((b) => [
      b.accountCode,
      `"${b.accountName}"`,
      b.accountType,
      b.balance > 0 ? (b.balance / 100).toFixed(2) : '0.00',
      b.balance < 0 ? (Math.abs(b.balance) / 100).toFixed(2) : '0.00',
    ].join(','));

    const csv = ['Code,Account,Type,Debit,Credit', ...rows].join('\n');
    return reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', 'attachment; filename="trial-balance.csv"')
      .send(csv);
  });

  // CSV Export — Income Statement
  app.get('/income-statement/export', {
    preHandler: [app.authenticate, requirePermission(Permission.REPORTS_EXPORT)],
  }, async (request, reply) => {
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

    const lines: string[] = ['Section,Code,Account,Amount'];
    for (const b of balances.filter((b) => b.accountType === 'revenue')) {
      lines.push(`Revenue,${b.accountCode},"${b.accountName}",${(Math.abs(b.balance) / 100).toFixed(2)}`);
    }
    for (const b of balances.filter((b) => b.accountType === 'expense')) {
      lines.push(`Expense,${b.accountCode},"${b.accountName}",${(Math.abs(b.balance) / 100).toFixed(2)}`);
    }
    const totalRevenue = balances.filter((b) => b.accountType === 'revenue').reduce((s, b) => s + Math.abs(b.balance), 0);
    const totalExpenses = balances.filter((b) => b.accountType === 'expense').reduce((s, b) => s + Math.abs(b.balance), 0);
    lines.push(`,,Net Income,${((totalRevenue - totalExpenses) / 100).toFixed(2)}`);

    return reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', 'attachment; filename="income-statement.csv"')
      .send(lines.join('\n'));
  });

  // CSV Export — Balance Sheet
  app.get('/balance-sheet/export', {
    preHandler: [app.authenticate, requirePermission(Permission.REPORTS_EXPORT)],
  }, async (request, reply) => {
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

    const lines: string[] = ['Section,Code,Account,Amount'];
    for (const type of ['asset', 'liability', 'equity'] as const) {
      const label = type.charAt(0).toUpperCase() + type.slice(1);
      for (const b of balances.filter((b) => b.accountType === type)) {
        lines.push(`${label},${b.accountCode},"${b.accountName}",${(Math.abs(b.balance) / 100).toFixed(2)}`);
      }
    }

    return reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', 'attachment; filename="balance-sheet.csv"')
      .send(lines.join('\n'));
  });
}
