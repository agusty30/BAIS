import type { FastifyInstance } from 'fastify';
import { eq, desc, sql } from 'drizzle-orm';
import { payments, invoices } from '../../db/schema.js';
import { Permission, recordPaymentSchema } from '@bais/shared';
import { requirePermission } from '../../plugins/auth.js';
import { NotFoundError, ValidationError } from '../../plugins/error-handler.js';

export async function paymentRoutes(app: FastifyInstance) {
  app.get('/', {
    preHandler: [app.authenticate, requirePermission(Permission.PAYMENTS_READ)],
  }, async (request) => {
    const { invoiceId, page = 1, limit = 20 } = request.query as { invoiceId?: string; page?: number; limit?: number };
    const offset = (Number(page) - 1) * Number(limit);

    const where = invoiceId ? eq(payments.invoiceId, invoiceId) : undefined;

    const data = await app.db.select().from(payments).where(where).orderBy(desc(payments.date)).limit(Number(limit)).offset(offset);

    const [{ count }] = await app.db.select({ count: sql<number>`count(*)::int` }).from(payments).where(where);

    return { data, total: count, page: Number(page), limit: Number(limit) };
  });

  app.post('/', {
    preHandler: [app.authenticate, requirePermission(Permission.PAYMENTS_MANAGE)],
  }, async (request, reply) => {
    const body = recordPaymentSchema.parse(request.body);

    const [invoice] = await app.db.select().from(invoices).where(eq(invoices.id, body.invoiceId)).limit(1);
    if (!invoice) throw new NotFoundError('Invoice');

    const remaining = invoice.totalAmount - invoice.paidAmount;
    if (body.amount > remaining) {
      throw new ValidationError(`Payment exceeds remaining balance of ${remaining}`);
    }

    const payment = await app.db.transaction(async (tx) => {
      const [p] = await tx.insert(payments).values({
        invoiceId: body.invoiceId,
        amount: body.amount,
        date: new Date(body.date),
        method: body.method,
        reference: body.reference || null,
        createdById: request.user.sub,
      }).returning();

      const newPaid = invoice.paidAmount + body.amount;
      const newStatus = newPaid >= invoice.totalAmount ? 'paid' : 'partially_paid';

      await tx.update(invoices).set({
        paidAmount: newPaid,
        status: newStatus,
        updatedAt: new Date(),
      }).where(eq(invoices.id, body.invoiceId));

      return p;
    });

    return reply.status(201).send(payment);
  });
}
