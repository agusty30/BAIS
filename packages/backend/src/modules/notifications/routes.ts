import type { FastifyInstance } from 'fastify';
import { eq, and, desc, sql } from 'drizzle-orm';
import { notifications } from '../../db/schema.js';

export async function notificationRoutes(app: FastifyInstance) {
  app.get('/', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { limit = 20 } = request.query as { limit?: number };

    const rows = await app.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, request.user.sub))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    return { data: rows };
  });

  app.get('/unread-count', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const [result] = await app.db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, request.user.sub),
        eq(notifications.isRead, false),
      ));

    return { count: result?.count ?? 0 };
  });

  app.post('/:id/read', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    await app.db
      .update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.id, id),
        eq(notifications.userId, request.user.sub),
      ));

    return reply.send({ success: true });
  });

  app.post('/read-all', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    await app.db
      .update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.userId, request.user.sub),
        eq(notifications.isRead, false),
      ));

    return reply.send({ success: true });
  });
}
