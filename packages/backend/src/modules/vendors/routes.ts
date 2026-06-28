import type { FastifyInstance } from 'fastify';
import { eq, ilike, sql } from 'drizzle-orm';
import { vendors } from '../../db/schema.js';
import { Permission, createVendorSchema } from '@bais/shared';
import { requirePermission } from '../../plugins/auth.js';
import { NotFoundError } from '../../plugins/error-handler.js';

export async function vendorRoutes(app: FastifyInstance) {
  app.get('/', {
    preHandler: [app.authenticate, requirePermission(Permission.VENDORS_READ)],
  }, async (request) => {
    const { search, page = 1, limit = 20 } = request.query as { search?: string; page?: number; limit?: number };
    const offset = (Number(page) - 1) * Number(limit);

    const where = search ? ilike(vendors.name, `%${search}%`) : undefined;

    const data = await app.db.select().from(vendors).where(where).orderBy(vendors.name).limit(Number(limit)).offset(offset);

    const [{ count }] = await app.db.select({ count: sql<number>`count(*)::int` }).from(vendors).where(where);

    return { data, total: count, page: Number(page), limit: Number(limit) };
  });

  app.get('/:id', {
    preHandler: [app.authenticate, requirePermission(Permission.VENDORS_READ)],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const [vendor] = await app.db.select().from(vendors).where(eq(vendors.id, id)).limit(1);
    if (!vendor) throw new NotFoundError('Vendor');
    return vendor;
  });

  app.post('/', {
    preHandler: [app.authenticate, requirePermission(Permission.VENDORS_MANAGE)],
  }, async (request, reply) => {
    const body = createVendorSchema.parse(request.body);
    const [vendor] = await app.db.insert(vendors).values(body).returning();
    return reply.status(201).send(vendor);
  });

  app.patch('/:id', {
    preHandler: [app.authenticate, requirePermission(Permission.VENDORS_MANAGE)],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<{ name: string; email: string; phone: string; address: string; taxId: string; paymentTerms: number; isActive: boolean }>;
    const [vendor] = await app.db.update(vendors).set({ ...body, updatedAt: new Date() }).where(eq(vendors.id, id)).returning();
    if (!vendor) throw new NotFoundError('Vendor');
    return vendor;
  });
}
