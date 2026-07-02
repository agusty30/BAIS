import type { FastifyInstance } from 'fastify';
import { eq, and, desc, gte, lte, isNull, or } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { journalEntries, journalEntryLines, accountBalances, workflowTemplates, approvalWorkflows, approvalSteps, fiscalPeriods } from '../../db/schema.js';
import { Permission, JournalEntryStatus, createJournalEntrySchema } from '@bais/shared';
import { requirePermission } from '../../plugins/auth.js';
import { NotFoundError, ValidationError } from '../../plugins/error-handler.js';
import { createBlockchainRecord } from '../blockchain/service.js';
import { logAudit } from '../../lib/audit.js';

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
    const entryDate = new Date(body.date);

    let fiscalPeriodId = body.fiscalPeriodId;
    if (!fiscalPeriodId) {
      const openPeriods = await app.db.select().from(fiscalPeriods)
        .where(and(
          eq(fiscalPeriods.status, 'open'),
          lte(fiscalPeriods.startDate, entryDate),
          gte(fiscalPeriods.endDate, entryDate),
        )).limit(1);

      if (openPeriods.length > 0) {
        fiscalPeriodId = openPeriods[0].id;
      } else {
        const allOpen = await app.db.select().from(fiscalPeriods)
          .where(eq(fiscalPeriods.status, 'open'))
          .orderBy(desc(fiscalPeriods.startDate))
          .limit(1);
        if (allOpen.length > 0) {
          fiscalPeriodId = allOpen[0].id;
        } else {
          throw new ValidationError('No open fiscal period found. Please create a fiscal period first.');
        }
      }
    }

    const entryNumber = `JE-${Date.now()}`;
    const [entry] = await app.db.insert(journalEntries).values({
      entryNumber,
      date: entryDate,
      description: body.description,
      reference: body.reference || null,
      status: 'draft',
      fiscalPeriodId,
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

    await logAudit(app, request, 'create', 'journal_entry', entry.id, {
      newValues: { description: body.description, reference: body.reference, totalAmount: entry.totalAmount, linesCount: lineValues.length },
    });

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

    const templates = await app.db.select().from(workflowTemplates)
      .where(eq(workflowTemplates.isActive, true))
      .orderBy(workflowTemplates.minAmount);

    const template = templates.find(t =>
      entry.totalAmount >= t.minAmount &&
      (t.maxAmount === null || entry.totalAmount < t.maxAmount)
    ) ?? templates[templates.length - 1];

    if (!template) {
      const [updated] = await app.db
        .update(journalEntries)
        .set({ status: 'approved', updatedAt: new Date() })
        .where(eq(journalEntries.id, id))
        .returning();
      await logAudit(app, request, 'submit', 'journal_entry', id, {
        oldValues: { status: 'draft' }, newValues: { status: 'approved' },
      });
      return updated;
    }

    const steps = template.steps as { stepOrder: number; requiredRole: string; escalationTimeoutHours: number }[];

    const [workflow] = await app.db.insert(approvalWorkflows).values({
      journalEntryId: id,
      status: 'pending',
      currentStep: 1,
      totalSteps: steps.length,
      initiatedById: request.user.sub,
    }).returning();

    await app.db.insert(approvalSteps).values(
      steps.map(s => ({
        workflowId: workflow.id,
        stepOrder: s.stepOrder,
        requiredRole: s.requiredRole,
        status: 'pending' as const,
      }))
    );

    const [updated] = await app.db
      .update(journalEntries)
      .set({ status: 'pending_approval', updatedAt: new Date() })
      .where(eq(journalEntries.id, id))
      .returning();

    await logAudit(app, request, 'submit', 'journal_entry', id, {
      oldValues: { status: 'draft' }, newValues: { status: 'pending_approval' },
    });

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
      // Record on blockchain with hash chain
      const { txId } = await createBlockchainRecord(tx as any, app.blockchain, entry, lines);

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

    await logAudit(app, request, 'post', 'journal_entry', id, {
      oldValues: { status: 'approved' }, newValues: { status: 'posted' },
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

  // Admin: reset orphaned pending_approval entry back to draft
  app.post('/:id/reset-to-draft', {
    preHandler: [app.authenticate, requirePermission(Permission.JOURNAL_CREATE)],
  }, async (request) => {
    if (request.user.role !== 'admin') {
      throw new ValidationError('Only admin can reset entries');
    }
    const { id } = request.params as { id: string };
    const [entry] = await app.db.select().from(journalEntries).where(eq(journalEntries.id, id)).limit(1);
    if (!entry) throw new NotFoundError('Journal Entry');
    if (entry.status !== 'pending_approval') {
      throw new ValidationError('Only pending_approval entries can be reset');
    }

    const [workflow] = await app.db.select().from(approvalWorkflows)
      .where(eq(approvalWorkflows.journalEntryId, id)).limit(1);

    if (workflow) {
      await app.db.update(approvalWorkflows)
        .set({ status: 'rejected', completedAt: new Date() })
        .where(eq(approvalWorkflows.id, workflow.id));
    }

    const [updated] = await app.db.update(journalEntries)
      .set({ status: 'draft', updatedAt: new Date() })
      .where(eq(journalEntries.id, id))
      .returning();

    await logAudit(app, request, 'reset_to_draft', 'journal_entry', id, {
      oldValues: { status: 'pending_approval' }, newValues: { status: 'draft' },
    });

    return updated;
  });

  // Admin: void a journal entry (set status to voided)
  app.post('/:id/void', {
    preHandler: [app.authenticate, requirePermission(Permission.JOURNAL_CREATE)],
  }, async (request) => {
    if (request.user.role !== 'admin') {
      throw new ValidationError('Only admin can void entries');
    }
    const { id } = request.params as { id: string };
    const [entry] = await app.db.select().from(journalEntries).where(eq(journalEntries.id, id)).limit(1);
    if (!entry) throw new NotFoundError('Journal Entry');
    if (entry.status === 'posted') {
      throw new ValidationError('Posted entries cannot be voided');
    }

    const [workflow] = await app.db.select().from(approvalWorkflows)
      .where(eq(approvalWorkflows.journalEntryId, id)).limit(1);

    if (workflow) {
      await app.db.update(approvalWorkflows)
        .set({ status: 'rejected', completedAt: new Date() })
        .where(eq(approvalWorkflows.id, workflow.id));
    }

    const [updated] = await app.db.update(journalEntries)
      .set({ status: 'draft', updatedAt: new Date() })
      .where(eq(journalEntries.id, id))
      .returning();

    await app.db.delete(journalEntryLines).where(eq(journalEntryLines.journalEntryId, id));
    await app.db.delete(journalEntries).where(eq(journalEntries.id, id));

    await logAudit(app, request, 'void', 'journal_entry', id, {
      oldValues: { status: entry.status, entryNumber: entry.entryNumber },
    });

    return { success: true, message: 'Entry voided and deleted' };
  });
}
