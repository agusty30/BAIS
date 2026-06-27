import type { FastifyInstance } from 'fastify';
import { fiscalPeriods } from '../../db/schema.js';

export async function fiscalPeriodRoutes(app: FastifyInstance) {
  app.get('/', {
    preHandler: [app.authenticate],
  }, async () => {
    const data = await app.db.select().from(fiscalPeriods).orderBy(fiscalPeriods.year);
    return { data };
  });
}
