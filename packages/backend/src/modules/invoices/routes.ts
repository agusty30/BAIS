import type { FastifyInstance } from 'fastify';
import { eq, and, desc, sql } from 'drizzle-orm';
import { invoices, customers, vendors } from '../../db/schema.js';
import { Permission, createInvoiceSchema } from '@bais/shared';
import { requirePermission } from '../../plugins/auth.js';
import { NotFoundError, ValidationError } from '../../plugins/error-handler.js';

export async function invoiceRoutes(app: FastifyInstance) {
  app.get('/', {
    preHandler: [app.authenticate, requirePermission(Permission.INVOICES_READ)],
  }, async (request) => {
    const { type, status, page = 1, limit = 20 } = request.query as {
      type?: string; status?: string; page?: number; limit?: number;
    };
    const offset = (Number(page) - 1) * Number(limit);
    const conditions = [];

    if (type) conditions.push(eq(invoices.type, type as any));
    if (status) conditions.push(eq(invoices.status, status as any));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await app.db
      .select()
      .from(invoices)
      .where(where)
      .orderBy(desc(invoices.date))
      .limit(Number(limit))
      .offset(offset);

    const [{ count }] = await app.db.select({ count: sql<number>`count(*)::int` }).from(invoices).where(where);

    return { data, total: count, page: Number(page), limit: Number(limit) };
  });

  app.get('/:id', {
    preHandler: [app.authenticate, requirePermission(Permission.INVOICES_READ)],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const [invoice] = await app.db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    if (!invoice) throw new NotFoundError('Invoice');
    return invoice;
  });

  app.post('/', {
    preHandler: [app.authenticate, requirePermission(Permission.INVOICES_MANAGE)],
  }, async (request, reply) => {
    const body = createInvoiceSchema.parse(request.body);

    if (body.type === 'receivable' && !body.customerId) {
      throw new ValidationError('Customer is required for receivable invoices');
    }
    if (body.type === 'payable' && !body.vendorId) {
      throw new ValidationError('Vendor is required for payable invoices');
    }

    const invoiceNumber = `INV-${Date.now()}`;
    const [invoice] = await app.db.insert(invoices).values({
      invoiceNumber,
      type: body.type,
      customerId: body.customerId || null,
      vendorId: body.vendorId || null,
      date: new Date(body.date),
      dueDate: new Date(body.dueDate),
      totalAmount: body.totalAmount,
      description: body.description,
      createdById: request.user.sub,
    }).returning();

    return reply.status(201).send(invoice);
  });

  app.patch('/:id/status', {
    preHandler: [app.authenticate, requirePermission(Permission.INVOICES_MANAGE)],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: string };

    const [invoice] = await app.db
      .update(invoices)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();

    if (!invoice) throw new NotFoundError('Invoice');
    return invoice;
  });

  // AR/AP summary
  app.get('/summary/ar-ap', {
    preHandler: [app.authenticate, requirePermission(Permission.INVOICES_READ)],
  }, async () => {
    const [ar] = await app.db
      .select({
        totalOutstanding: sql<number>`coalesce(sum(${invoices.totalAmount} - ${invoices.paidAmount}), 0)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(invoices)
      .where(and(eq(invoices.type, 'receivable'), sql`${invoices.status} NOT IN ('paid', 'cancelled')`));

    const [ap] = await app.db
      .select({
        totalOutstanding: sql<number>`coalesce(sum(${invoices.totalAmount} - ${invoices.paidAmount}), 0)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(invoices)
      .where(and(eq(invoices.type, 'payable'), sql`${invoices.status} NOT IN ('paid', 'cancelled')`));

    return { receivable: ar, payable: ap };
  });
}
