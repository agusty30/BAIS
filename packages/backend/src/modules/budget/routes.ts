import type { FastifyInstance } from 'fastify';
import { eq, and, sql } from 'drizzle-orm';
import { budgetItems, accounts, fiscalPeriods } from '../../db/schema.js';
import { Permission, createBudgetItemSchema } from '@bais/shared';
import { requirePermission } from '../../plugins/auth.js';
import { NotFoundError } from '../../plugins/error-handler.js';

export async function budgetRoutes(app: FastifyInstance) {
  app.get('/', {
    preHandler: [app.authenticate, requirePermission(Permission.BUDGET_READ)],
  }, async (request) => {
    const { periodId } = request.query as { periodId?: string };
    const where = periodId ? eq(budgetItems.fiscalPeriodId, periodId) : undefined;

    const data = await app.db
      .select({
        id: budgetItems.id,
        accountId: budgetItems.accountId,
        accountCode: accounts.code,
        accountName: accounts.name,
        fiscalPeriodId: budgetItems.fiscalPeriodId,
        periodName: fiscalPeriods.name,
        budgetAmount: budgetItems.budgetAmount,
        actualAmount: budgetItems.actualAmount,
        variance: budgetItems.variance,
        notes: budgetItems.notes,
      })
      .from(budgetItems)
      .innerJoin(accounts, eq(budgetItems.accountId, accounts.id))
      .innerJoin(fiscalPeriods, eq(budgetItems.fiscalPeriodId, fiscalPeriods.id))
      .where(where)
      .orderBy(accounts.code);

    return { data };
  });

  app.get('/summary', {
    preHandler: [app.authenticate, requirePermission(Permission.BUDGET_READ)],
  }, async (request) => {
    const { periodId } = request.query as { periodId?: string };
    const where = periodId ? eq(budgetItems.fiscalPeriodId, periodId) : undefined;

    const [summary] = await app.db
      .select({
        totalBudget: sql<number>`coalesce(sum(${budgetItems.budgetAmount}), 0)::int`,
        totalActual: sql<number>`coalesce(sum(${budgetItems.actualAmount}), 0)::int`,
        totalVariance: sql<number>`coalesce(sum(${budgetItems.variance}), 0)::int`,
        itemCount: sql<number>`count(*)::int`,
      })
      .from(budgetItems)
      .where(where);

    return summary;
  });

  app.post('/', {
    preHandler: [app.authenticate, requirePermission(Permission.BUDGET_MANAGE)],
  }, async (request, reply) => {
    const body = createBudgetItemSchema.parse(request.body);

    const [existing] = await app.db
      .select()
      .from(budgetItems)
      .where(and(eq(budgetItems.accountId, body.accountId), eq(budgetItems.fiscalPeriodId, body.fiscalPeriodId)))
      .limit(1);

    if (existing) {
      const [updated] = await app.db
        .update(budgetItems)
        .set({
          budgetAmount: body.budgetAmount,
          variance: body.budgetAmount - existing.actualAmount,
          notes: body.notes ?? existing.notes,
          updatedAt: new Date(),
        })
        .where(eq(budgetItems.id, existing.id))
        .returning();
      return updated;
    }

    const [item] = await app.db.insert(budgetItems).values({
      accountId: body.accountId,
      fiscalPeriodId: body.fiscalPeriodId,
      budgetAmount: body.budgetAmount,
      variance: body.budgetAmount,
      notes: body.notes || null,
    }).returning();

    return reply.status(201).send(item);
  });

  app.delete('/:id', {
    preHandler: [app.authenticate, requirePermission(Permission.BUDGET_MANAGE)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const [item] = await app.db.delete(budgetItems).where(eq(budgetItems.id, id)).returning();
    if (!item) throw new NotFoundError('Budget Item');
    return reply.status(204).send();
  });
}
