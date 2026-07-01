import type { FastifyInstance } from 'fastify';
import { eq, and, desc, sql } from 'drizzle-orm';
import { invoices, customers, vendors } from '../../db/schema.js';
import { Permission, createInvoiceSchema } from '@bais/shared';
import { requirePermission } from '../../plugins/auth.js';
import { NotFoundError, ValidationError } from '../../plugins/error-handler.js';
import { logAudit } from '../../lib/audit.js';

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

  // Edit draft invoice
  app.put('/:id', {
    preHandler: [app.authenticate, requirePermission(Permission.INVOICES_MANAGE)],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      customerId?: string; vendorId?: string; date?: string; dueDate?: string;
      totalAmount?: number; description?: string;
    };

    const [existing] = await app.db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    if (!existing) throw new NotFoundError('Invoice');
    if (existing.status !== 'draft') {
      throw new ValidationError('Only draft invoices can be edited. Use amendment for non-draft invoices.');
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.customerId !== undefined) updates.customerId = body.customerId || null;
    if (body.vendorId !== undefined) updates.vendorId = body.vendorId || null;
    if (body.date !== undefined) updates.date = new Date(body.date);
    if (body.dueDate !== undefined) updates.dueDate = new Date(body.dueDate);
    if (body.totalAmount !== undefined) updates.totalAmount = body.totalAmount;
    if (body.description !== undefined) updates.description = body.description;

    const [updated] = await app.db.update(invoices).set(updates).where(eq(invoices.id, id)).returning();

    await logAudit(app, request, 'update', 'invoice', id, {
      oldValues: { totalAmount: existing.totalAmount, description: existing.description, dueDate: existing.dueDate },
      newValues: { totalAmount: updated.totalAmount, description: updated.description, dueDate: updated.dueDate },
    });

    return updated;
  });

  // Create amendment for non-draft invoices
  app.post('/:id/amend', {
    preHandler: [app.authenticate, requirePermission(Permission.INVOICES_MANAGE)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { totalAmount, description, dueDate, reason } = request.body as {
      totalAmount: number; description?: string; dueDate?: string; reason?: string;
    };

    const [original] = await app.db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    if (!original) throw new NotFoundError('Invoice');
    if (original.status === 'draft') {
      throw new ValidationError('Draft invoices should be edited directly, not amended.');
    }
    if (original.status === 'cancelled') {
      throw new ValidationError('Cannot amend a cancelled invoice.');
    }

    const amendNumber = `${original.invoiceNumber}-A${Date.now().toString(36).slice(-4).toUpperCase()}`;

    const [amendment] = await app.db.insert(invoices).values({
      invoiceNumber: amendNumber,
      type: original.type,
      customerId: original.customerId,
      vendorId: original.vendorId,
      date: new Date(),
      dueDate: dueDate ? new Date(dueDate) : original.dueDate,
      totalAmount: totalAmount ?? original.totalAmount,
      description: description || `Amendment of ${original.invoiceNumber}${reason ? ': ' + reason : ''}`,
      amendedFromId: original.id,
      createdById: request.user.sub,
    }).returning();

    await app.db.update(invoices).set({
      status: 'cancelled',
      updatedAt: new Date(),
    }).where(eq(invoices.id, id));

    await logAudit(app, request, 'amend', 'invoice', id, {
      oldValues: { invoiceNumber: original.invoiceNumber, totalAmount: original.totalAmount, status: original.status },
      newValues: { amendmentId: amendment.id, amendmentNumber: amendment.invoiceNumber, totalAmount: amendment.totalAmount },
    });

    return reply.status(201).send(amendment);
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
