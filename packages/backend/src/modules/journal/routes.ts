import type { FastifyInstance } from 'fastify';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { journalEntries, journalEntryLines, accountBalances } from '../../db/schema.js';
import { Permission, JournalEntryStatus, createJournalEntrySchema } from '@bais/shared';
import { requirePermission } from '../../plugins/auth.js';
import { NotFoundError, ValidationError } from '../../plugins/error-handler.js';

export async function journalRoutes(app: FastifyInstance) {
  // List journal entries
  app.get('/', {
    preHandler: [app.authenticate, requirePermission(Permission.JOURNAL_READ)],
  }, async (request) => {
    const { page = 1, limit = 20, status } = request.query as { page?: number; limit?: number; status?: string };
    const offset = (page - 1) * limit;

    const baseQuery = app.db.select().from(journalEntries);
    const data = status
      ? await baseQuery.where(eq(journalEntries.status, status as any)).orderBy(desc(journalEntries.date)).limit(limit).offset(offset)
      : await baseQuery.orderBy(desc(journalEntries.date)).limit(limit).offset(offset);

    return { data, page, limit };
  });

  // Get single journal entry with lines
  app.get('/:id', {
    preHandler: [app.authenticate, requirePermission(Permission.JOURNAL_READ)],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const [entry] = await app.db.select().from(journalEntries).where(eq(journalEntries.id, id)).limit(1);
    if (!entry) throw new NotFoundError('Journal Entry');

    const lines = await app.db.select().from(journalEntryLines)
      .where(eq(journalEntryLines.journalEntryId, id))
      .orderBy(journalEntryLines.lineOrder);

    return { ...entry, lines };
  });

  // Create journal entry
  app.post('/', {
    preHandler: [app.authenticate, requirePermission(Permission.JOURNAL_CREATE)],
  }, async (request, reply) => {
    const body = createJournalEntrySchema.parse(request.body);
    const totalAmount = body.lines.reduce((sum, l) => sum + l.debitAmount, 0);

    const entryNumber = `JE-${Date.now()}`;
    const [entry] = await app.db.insert(journalEntries).values({
      entryNumber,
      date: new Date(body.date),
      description: body.description,
      reference: body.reference || null,
      status: 'draft',
      fiscalPeriodId: body.fiscalPeriodId,
      totalAmount,
      createdById: request.user.sub,
    }).returning();

    const lineValues = body.lines.map((line, idx) => ({
      journalEntryId: entry.id,
      accountId: line.accountId,
      debitAmount: line.debitAmount,
      creditAmount: line.creditAmount,
      description: line.description || '',
      lineOrder: idx + 1,
    }));

    await app.db.insert(journalEntryLines).values(lineValues);

    return reply.status(201).send(entry);
  });

  // Submit for approval
  app.post('/:id/submit', {
    preHandler: [app.authenticate, requirePermission(Permission.JOURNAL_SUBMIT)],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const [entry] = await app.db.select().from(journalEntries).where(eq(journalEntries.id, id)).limit(1);

    if (!entry) throw new NotFoundError('Journal Entry');
    if (entry.status !== 'draft') {
      throw new ValidationError('Only draft entries can be submitted');
    }

    const [updated] = await app.db
      .update(journalEntries)
      .set({ status: 'pending_approval', updatedAt: new Date() })
      .where(eq(journalEntries.id, id))
      .returning();

    return updated;
  });

  // Post entry (after approval) - records on blockchain
  app.post('/:id/post', {
    preHandler: [app.authenticate, requirePermission(Permission.JOURNAL_POST)],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const [entry] = await app.db.select().from(journalEntries).where(eq(journalEntries.id, id)).limit(1);

    if (!entry) throw new NotFoundError('Journal Entry');
    if (entry.status !== 'approved') {
      throw new ValidationError('Only approved entries can be posted');
    }

    const lines = await app.db.select().from(journalEntryLines)
      .where(eq(journalEntryLines.journalEntryId, id));

    // Wrap posting in a transaction for atomicity
    const posted = await app.db.transaction(async (tx) => {
      // Record on blockchain
      const txId = await app.blockchain.submitTransaction(
        'ledger',
        'recordJournalEntry',
        JSON.stringify({ id: entry.id, entryNumber: entry.entryNumber, date: entry.date, lines, totalAmount: entry.totalAmount }),
      );

      // Update entry status and blockchain reference
      const [result] = await tx
        .update(journalEntries)
        .set({ status: 'posted', blockchainTxId: txId, updatedAt: new Date() })
        .where(eq(journalEntries.id, id))
        .returning();

      // Update account balances
      for (const line of lines) {
        const [existing] = await tx.select().from(accountBalances)
          .where(and(
            eq(accountBalances.accountId, line.accountId),
            eq(accountBalances.fiscalPeriodId, entry.fiscalPeriodId),
          )).limit(1);

        if (existing) {
          await tx.update(accountBalances)
            .set({
              debitTotal: existing.debitTotal + line.debitAmount,
              creditTotal: existing.creditTotal + line.creditAmount,
              balance: (existing.debitTotal + line.debitAmount) - (existing.creditTotal + line.creditAmount),
              lastUpdatedAt: new Date(),
            })
            .where(eq(accountBalances.id, existing.id));
        } else {
          await tx.insert(accountBalances).values({
            accountId: line.accountId,
            fiscalPeriodId: entry.fiscalPeriodId,
            debitTotal: line.debitAmount,
            creditTotal: line.creditAmount,
            balance: line.debitAmount - line.creditAmount,
          });
        }
      }

      return result;
    });

    return posted;
  });

  // Get blockchain proof
  app.get('/:id/blockchain', {
    preHandler: [app.authenticate, requirePermission(Permission.JOURNAL_READ)],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const [entry] = await app.db.select().from(journalEntries).where(eq(journalEntries.id, id)).limit(1);

    if (!entry) throw new NotFoundError('Journal Entry');
    if (!entry.blockchainTxId) {
      return { recorded: false, message: 'Entry not yet recorded on blockchain' };
    }

    const proof = await app.blockchain.evaluateTransaction('ledger', 'getEntry', entry.id);
    return { recorded: true, txId: entry.blockchainTxId, data: JSON.parse(proof) };
  });
}
