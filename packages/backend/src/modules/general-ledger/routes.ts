import type { FastifyInstance } from 'fastify';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { generalLedger, accounts, journalEntries, journalEntryLines, fiscalPeriods } from '../../db/schema.js';
import { Permission } from '@bais/shared';
import { requirePermission } from '../../plugins/auth.js';

export async function generalLedgerRoutes(app: FastifyInstance) {
  app.get('/', {
    preHandler: [app.authenticate, requirePermission(Permission.LEDGER_READ)],
  }, async (request) => {
    const { accountId, periodId, from, to, page = 1, limit = 50 } = request.query as {
      accountId?: string; periodId?: string; from?: string; to?: string; page?: number; limit?: number;
    };
    const offset = (Number(page) - 1) * Number(limit);
    const conditions = [];

    if (accountId) conditions.push(eq(generalLedger.accountId, accountId));
    if (periodId) conditions.push(eq(generalLedger.fiscalPeriodId, periodId));
    if (from) conditions.push(gte(generalLedger.date, new Date(from)));
    if (to) conditions.push(lte(generalLedger.date, new Date(to)));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await app.db
      .select({
        id: generalLedger.id,
        date: generalLedger.date,
        description: generalLedger.description,
        debitAmount: generalLedger.debitAmount,
        creditAmount: generalLedger.creditAmount,
        runningBalance: generalLedger.runningBalance,
        accountCode: accounts.code,
        accountName: accounts.name,
        entryNumber: journalEntries.entryNumber,
      })
      .from(generalLedger)
      .innerJoin(accounts, eq(generalLedger.accountId, accounts.id))
      .innerJoin(journalEntries, eq(generalLedger.journalEntryId, journalEntries.id))
      .where(where)
      .orderBy(desc(generalLedger.date))
      .limit(Number(limit))
      .offset(offset);

    const [{ count }] = await app.db
      .select({ count: sql<number>`count(*)::int` })
      .from(generalLedger)
      .where(where);

    return { data, total: count, page: Number(page), limit: Number(limit) };
  });

  app.get('/summary', {
    preHandler: [app.authenticate, requirePermission(Permission.LEDGER_READ)],
  }, async (request) => {
    const { periodId } = request.query as { periodId?: string };
    const conditions = periodId ? eq(generalLedger.fiscalPeriodId, periodId) : undefined;

    const data = await app.db
      .select({
        accountId: generalLedger.accountId,
        accountCode: accounts.code,
        accountName: accounts.name,
        accountType: accounts.type,
        totalDebit: sql<number>`sum(${generalLedger.debitAmount})::int`,
        totalCredit: sql<number>`sum(${generalLedger.creditAmount})::int`,
      })
      .from(generalLedger)
      .innerJoin(accounts, eq(generalLedger.accountId, accounts.id))
      .where(conditions)
      .groupBy(generalLedger.accountId, accounts.code, accounts.name, accounts.type)
      .orderBy(accounts.code);

    return { data };
  });

  // Rebuild GL from journal entries (admin utility)
  app.post('/rebuild', {
    preHandler: [app.authenticate, requirePermission(Permission.SETTINGS_MANAGE)],
  }, async (_request, reply) => {
    await app.db.transaction(async (tx) => {
      await tx.delete(generalLedger);

      const posted = await tx
        .select()
        .from(journalEntries)
        .where(eq(journalEntries.status, 'posted'))
        .orderBy(journalEntries.date);

      for (const entry of posted) {
        const lines = await tx
          .select()
          .from(journalEntryLines)
          .where(eq(journalEntryLines.journalEntryId, entry.id));

        for (const line of lines) {
          await tx.insert(generalLedger).values({
            accountId: line.accountId,
            journalEntryId: entry.id,
            fiscalPeriodId: entry.fiscalPeriodId,
            date: entry.date,
            description: entry.description,
            debitAmount: line.debitAmount,
            creditAmount: line.creditAmount,
            runningBalance: 0,
          });
        }
      }
    });

    return reply.status(200).send({ message: 'General ledger rebuilt' });
  });
}
