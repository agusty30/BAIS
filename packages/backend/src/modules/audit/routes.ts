import type { FastifyInstance } from 'fastify';
import { desc, eq, and, gte, lte, sql } from 'drizzle-orm';
import { auditLogs, users } from '../../db/schema.js';
import { Permission } from '@bais/shared';
import { requirePermission } from '../../plugins/auth.js';
import { NotFoundError } from '../../plugins/error-handler.js';

export async function auditRoutes(app: FastifyInstance) {
  app.get('/logs', {
    preHandler: [app.authenticate, requirePermission(Permission.AUDIT_VIEW)],
  }, async (request) => {
    const { page = 1, limit = 50, action, resource, userId, from, to } = request.query as {
      page?: number; limit?: number; action?: string; resource?: string;
      userId?: string; from?: string; to?: string;
    };
    const offset = (page - 1) * limit;

    const conditions = [];
    if (action) conditions.push(eq(auditLogs.action, action));
    if (resource) conditions.push(eq(auditLogs.resource, resource));
    if (userId) conditions.push(eq(auditLogs.userId, userId));
    if (from) conditions.push(gte(auditLogs.timestamp, new Date(from)));
    if (to) conditions.push(lte(auditLogs.timestamp, new Date(to)));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const logs = await app.db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        userName: users.fullName,
        action: auditLogs.action,
        resource: auditLogs.resource,
        resourceId: auditLogs.resourceId,
        details: auditLogs.details,
        ipAddress: auditLogs.ipAddress,
        blockchainTxId: auditLogs.blockchainTxId,
        timestamp: auditLogs.timestamp,
      })
      .from(auditLogs)
      .innerJoin(users, eq(auditLogs.userId, users.id))
      .where(where)
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit)
      .offset(offset);

    const [countResult] = await app.db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(where);

    return { data: logs, page, limit, total: countResult?.count ?? 0 };
  });

  app.get('/logs/:id', {
    preHandler: [app.authenticate, requirePermission(Permission.AUDIT_VIEW)],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const [log] = await app.db.select().from(auditLogs)
      .where(eq(auditLogs.id, id)).limit(1);

    if (!log) throw new NotFoundError('Audit Log');

    let blockchainProof = null;
    if (log.blockchainTxId) {
      const proof = await app.blockchain.evaluateTransaction('audit', 'getAuditTrail', log.id);
      blockchainProof = JSON.parse(proof);
    }

    return { ...log, blockchainProof };
  });

  app.get('/integrity-check', {
    preHandler: [app.authenticate, requirePermission(Permission.AUDIT_VERIFY)],
  }, async () => {
    const status = app.blockchain.getStatus();
    return {
      status: 'passed',
      blockchainConnected: status.connected,
      latestBlock: status.latestBlock,
      checkedAt: new Date().toISOString(),
    };
  });
}
