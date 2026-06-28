import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { fiscalPeriods } from '../../db/schema.js';
import { Permission } from '@bais/shared';
import { requirePermission } from '../../plugins/auth.js';
import { NotFoundError } from '../../plugins/error-handler.js';

export async function fiscalPeriodRoutes(app: FastifyInstance) {
  app.get('/', {
    preHandler: [app.authenticate],
  }, async () => {
    const data = await app.db.select().from(fiscalPeriods).orderBy(fiscalPeriods.year, fiscalPeriods.startDate);
    return { data };
  });

  app.post('/', {
    preHandler: [app.authenticate, requirePermission(Permission.PERIODS_MANAGE)],
  }, async (request, reply) => {
    const { name, startDate, endDate, year } = request.body as {
      name: string; startDate: string; endDate: string; year: number;
    };

    const [period] = await app.db.insert(fiscalPeriods).values({
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: 'open',
      year,
    }).returning();

    return reply.status(201).send(period);
  });

  app.patch('/:id', {
    preHandler: [app.authenticate, requirePermission(Permission.PERIODS_MANAGE)],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: 'open' | 'closed' | 'locked' };

    const [period] = await app.db
      .update(fiscalPeriods)
      .set({ status })
      .where(eq(fiscalPeriods.id, id))
      .returning();

    if (!period) throw new NotFoundError('Fiscal Period');
    return period;
  });
}
