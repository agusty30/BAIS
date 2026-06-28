import type { FastifyInstance } from 'fastify';
import { eq, ilike, sql } from 'drizzle-orm';
import { customers } from '../../db/schema.js';
import { Permission, createCustomerSchema } from '@bais/shared';
import { requirePermission } from '../../plugins/auth.js';
import { NotFoundError } from '../../plugins/error-handler.js';

export async function customerRoutes(app: FastifyInstance) {
  app.get('/', {
    preHandler: [app.authenticate, requirePermission(Permission.CUSTOMERS_READ)],
  }, async (request) => {
    const { search, page = 1, limit = 20 } = request.query as { search?: string; page?: number; limit?: number };
    const offset = (Number(page) - 1) * Number(limit);

    const where = search ? ilike(customers.name, `%${search}%`) : undefined;

    const data = await app.db.select().from(customers).where(where).orderBy(customers.name).limit(Number(limit)).offset(offset);

    const [{ count }] = await app.db.select({ count: sql<number>`count(*)::int` }).from(customers).where(where);

    return { data, total: count, page: Number(page), limit: Number(limit) };
  });

  app.get('/:id', {
    preHandler: [app.authenticate, requirePermission(Permission.CUSTOMERS_READ)],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const [customer] = await app.db.select().from(customers).where(eq(customers.id, id)).limit(1);
    if (!customer) throw new NotFoundError('Customer');
    return customer;
  });

  app.post('/', {
    preHandler: [app.authenticate, requirePermission(Permission.CUSTOMERS_MANAGE)],
  }, async (request, reply) => {
    const body = createCustomerSchema.parse(request.body);
    const [customer] = await app.db.insert(customers).values(body).returning();
    return reply.status(201).send(customer);
  });

  app.patch('/:id', {
    preHandler: [app.authenticate, requirePermission(Permission.CUSTOMERS_MANAGE)],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<{ name: string; email: string; phone: string; address: string; taxId: string; creditLimit: number; isActive: boolean }>;
    const [customer] = await app.db.update(customers).set({ ...body, updatedAt: new Date() }).where(eq(customers.id, id)).returning();
    if (!customer) throw new NotFoundError('Customer');
    return customer;
  });
}
