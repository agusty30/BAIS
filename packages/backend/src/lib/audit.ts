import type { FastifyInstance, FastifyRequest } from 'fastify';
import { auditLogs } from '../db/schema.js';

interface AuditOptions {
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}

export async function logAudit(
  app: FastifyInstance,
  request: FastifyRequest,
  action: string,
  resource: string,
  resourceId: string | null,
  opts?: AuditOptions,
) {
  const ip = request.ip || request.headers['x-forwarded-for'] as string || null;
  const details: Record<string, unknown> = {};
  if (opts?.oldValues) details.oldValues = opts.oldValues;
  if (opts?.newValues) details.newValues = opts.newValues;

  await app.db.insert(auditLogs).values({
    userId: request.user.sub,
    action,
    resource,
    resourceId,
    details: Object.keys(details).length > 0 ? details : null,
    ipAddress: ip,
  });
}
