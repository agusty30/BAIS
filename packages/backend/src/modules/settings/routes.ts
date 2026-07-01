import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { settings, bankAccounts } from '../../db/schema.js';
import { Permission } from '@bais/shared';
import { requirePermission } from '../../plugins/auth.js';
import { NotFoundError, ValidationError } from '../../plugins/error-handler.js';

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

  // Bank Accounts CRUD
  app.get('/bank-accounts', {
    preHandler: [app.authenticate, requirePermission(Permission.SETTINGS_MANAGE)],
  }, async () => {
    const data = await app.db.select().from(bankAccounts).orderBy(bankAccounts.name);
    return { data };
  });

  app.post('/bank-accounts', {
    preHandler: [app.authenticate, requirePermission(Permission.SETTINGS_MANAGE)],
  }, async (request, reply) => {
    const { name, bankName, accountNumber, currency } = request.body as {
      name: string; bankName: string; accountNumber: string; currency?: string;
    };
    if (!name?.trim() || !bankName?.trim() || !accountNumber?.trim()) {
      throw new ValidationError('Name, bank name, and account number are required');
    }
    const [account] = await app.db.insert(bankAccounts).values({
      name: name.trim(),
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      currency: currency || 'IDR',
    }).returning();
    return reply.status(201).send(account);
  });

  app.put('/bank-accounts/:id', {
    preHandler: [app.authenticate, requirePermission(Permission.SETTINGS_MANAGE)],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as { name?: string; bankName?: string; accountNumber?: string; currency?: string; isActive?: boolean };
    const [existing] = await app.db.select().from(bankAccounts).where(eq(bankAccounts.id, id)).limit(1);
    if (!existing) throw new NotFoundError('Bank account not found');
    const [updated] = await app.db.update(bankAccounts)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(bankAccounts.id, id))
      .returning();
    return updated;
  });

  app.delete('/bank-accounts/:id', {
    preHandler: [app.authenticate, requirePermission(Permission.SETTINGS_MANAGE)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const [existing] = await app.db.select().from(bankAccounts).where(eq(bankAccounts.id, id)).limit(1);
    if (!existing) throw new NotFoundError('Bank account not found');
    await app.db.delete(bankAccounts).where(eq(bankAccounts.id, id));
    return reply.status(204).send();
  });
}
