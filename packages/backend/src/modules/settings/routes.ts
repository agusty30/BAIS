import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { settings } from '../../db/schema.js';
import { Permission } from '@bais/shared';
import { requirePermission } from '../../plugins/auth.js';

export async function settingsRoutes(app: FastifyInstance) {
  app.get('/', {
    preHandler: [app.authenticate, requirePermission(Permission.SETTINGS_MANAGE)],
  }, async () => {
    const data = await app.db.select().from(settings).orderBy(settings.category, settings.key);
    return { data };
  });

  app.get('/:key', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { key } = request.params as { key: string };
    const [setting] = await app.db.select().from(settings).where(eq(settings.key, key)).limit(1);
    return setting || { key, value: null };
  });

  app.put('/:key', {
    preHandler: [app.authenticate, requirePermission(Permission.SETTINGS_MANAGE)],
  }, async (request) => {
    const { key } = request.params as { key: string };
    const { value, category } = request.body as { value: string; category?: string };

    const [existing] = await app.db.select().from(settings).where(eq(settings.key, key)).limit(1);

    if (existing) {
      const [updated] = await app.db
        .update(settings)
        .set({ value, category: category || existing.category, updatedById: request.user.sub, updatedAt: new Date() })
        .where(eq(settings.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await app.db.insert(settings).values({
      key,
      value,
      category: category || 'general',
      updatedById: request.user.sub,
    }).returning();

    return created;
  });
}
