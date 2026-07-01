import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { taxRates } from '../../db/schema.js';
import { Permission } from '@bais/shared';
import { requirePermission } from '../../plugins/auth.js';
import { NotFoundError, ValidationError } from '../../plugins/error-handler.js';
import { logAudit } from '../../lib/audit.js';

export async function taxRoutes(app: FastifyInstance) {
  app.get('/', {
    preHandler: [app.authenticate, requirePermission(Permission.TAX_READ)],
  }, async () => {
    const data = await app.db.select().from(taxRates).orderBy(taxRates.code);
    return { data };
  });

  app.get('/:id', {
    preHandler: [app.authenticate, requirePermission(Permission.TAX_READ)],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const [rate] = await app.db.select().from(taxRates).where(eq(taxRates.id, id)).limit(1);
    if (!rate) throw new NotFoundError('Tax rate not found');
    return rate;
  });

  app.post('/', {
    preHandler: [app.authenticate, requirePermission(Permission.TAX_MANAGE)],
  }, async (request, reply) => {
    const { name, code, rate, type, description } = request.body as {
      name: string; code: string; rate: number; type: string; description?: string;
    };
    if (!name?.trim()) throw new ValidationError('Tax name is required');
    if (!code?.trim()) throw new ValidationError('Tax code is required');
    if (rate == null || rate < 0) throw new ValidationError('Rate must be a non-negative number');
    if (!['vat', 'income', 'withholding', 'other'].includes(type)) {
      throw new ValidationError('Invalid tax type');
    }

    const [taxRate] = await app.db.insert(taxRates).values({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      rate,
      type: type as any,
      description: description?.trim() || null,
    }).returning();

    await logAudit(app, request, 'create', 'tax_rate', taxRate.id, {
      newValues: { name: taxRate.name, code: taxRate.code, rate: taxRate.rate, type },
    });

    return reply.status(201).send(taxRate);
  });

  app.put('/:id', {
    preHandler: [app.authenticate, requirePermission(Permission.TAX_MANAGE)],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { name, rate, type, description, isActive } = request.body as {
      name?: string; rate?: number; type?: string; description?: string; isActive?: boolean;
    };

    const [existing] = await app.db.select().from(taxRates).where(eq(taxRates.id, id)).limit(1);
    if (!existing) throw new NotFoundError('Tax rate not found');

    if (type && !['vat', 'income', 'withholding', 'other'].includes(type)) {
      throw new ValidationError('Invalid tax type');
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name.trim();
    if (rate !== undefined) updates.rate = rate;
    if (type !== undefined) updates.type = type;
    if (description !== undefined) updates.description = description?.trim() || null;
    if (isActive !== undefined) updates.isActive = isActive;

    const [updated] = await app.db.update(taxRates)
      .set(updates)
      .where(eq(taxRates.id, id))
      .returning();

    await logAudit(app, request, 'update', 'tax_rate', id, {
      oldValues: { name: existing.name, rate: existing.rate, type: existing.type, isActive: existing.isActive },
      newValues: { name: updated.name, rate: updated.rate, type: updated.type, isActive: updated.isActive },
    });

    return updated;
  });

  app.delete('/:id', {
    preHandler: [app.authenticate, requirePermission(Permission.TAX_MANAGE)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const [existing] = await app.db.select().from(taxRates).where(eq(taxRates.id, id)).limit(1);
    if (!existing) throw new NotFoundError('Tax rate not found');

    await app.db.delete(taxRates).where(eq(taxRates.id, id));

    await logAudit(app, request, 'delete', 'tax_rate', id, {
      oldValues: { name: existing.name, code: existing.code, rate: existing.rate },
    });

    return reply.status(204).send();
  });
}
