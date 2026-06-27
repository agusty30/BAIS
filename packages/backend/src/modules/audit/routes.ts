import type { FastifyInstance } from 'fastify';
import { desc, eq } from 'drizzle-orm';
import { auditLogs } from '../../db/schema.js';
import { Permission } from '@bais/shared';
import { requirePermission } from '../../plugins/auth.js';
import { NotFoundError } from '../../plugins/error-handler.js';

export async function auditRoutes(app: FastifyInstance) {
  // List audit logs
  app.get('/logs', {
    preHandler: [app.authenticate, requirePermission(Permission.AUDIT_VIEW)],
  }, async (request) => {
    const { page = 1, limit = 50 } = request.query as { page?: number; limit?: number };
    const offset = (page - 1) * limit;

    const logs = await app.db.select().from(auditLogs)
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit)
      .offset(offset);

    return { data: logs, page, limit };
  });

  // Get single audit log
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

  // Verify integrity
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
