import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { roles } from '../../db/schema.js';
import { Permission } from '@bais/shared';
import { requirePermission } from '../../plugins/auth.js';
import { NotFoundError, ValidationError } from '../../plugins/error-handler.js';
import { logAudit } from '../../lib/audit.js';

export async function rolesRoutes(app: FastifyInstance) {
  app.get('/', {
    preHandler: [app.authenticate, requirePermission(Permission.ROLES_MANAGE)],
  }, async () => {
    const data = await app.db.select().from(roles).orderBy(roles.name);
    return { data };
  });

  app.get('/:id', {
    preHandler: [app.authenticate, requirePermission(Permission.ROLES_MANAGE)],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const [role] = await app.db.select().from(roles).where(eq(roles.id, id)).limit(1);
    if (!role) throw new NotFoundError('Role not found');
    return role;
  });

  app.post('/', {
    preHandler: [app.authenticate, requirePermission(Permission.ROLES_MANAGE)],
  }, async (request, reply) => {
    const { name, description, permissions: perms } = request.body as {
      name: string;
      description?: string;
      permissions: string[];
    };
    if (!name?.trim()) throw new ValidationError('Role name is required');

    const allPerms = Object.values(Permission) as string[];
    const invalid = (perms || []).filter(p => !allPerms.includes(p));
    if (invalid.length > 0) throw new ValidationError(`Invalid permissions: ${invalid.join(', ')}`);

    const [role] = await app.db.insert(roles).values({
      name: name.trim(),
      description: description?.trim() || null,
      permissions: perms || [],
      isSystem: false,
    }).returning();

    await logAudit(app, request, 'create', 'role', role.id, {
      newValues: { name: role.name, permissions: perms },
    });

    return reply.status(201).send(role);
  });

  app.put('/:id', {
    preHandler: [app.authenticate, requirePermission(Permission.ROLES_MANAGE)],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { description, permissions: perms } = request.body as {
      description?: string;
      permissions: string[];
    };

    const [existing] = await app.db.select().from(roles).where(eq(roles.id, id)).limit(1);
    if (!existing) throw new NotFoundError('Role not found');

    const allPerms = Object.values(Permission) as string[];
    const invalid = (perms || []).filter(p => !allPerms.includes(p));
    if (invalid.length > 0) throw new ValidationError(`Invalid permissions: ${invalid.join(', ')}`);

    const [updated] = await app.db.update(roles)
      .set({
        description: description?.trim() ?? existing.description,
        permissions: perms,
        updatedAt: new Date(),
      })
      .where(eq(roles.id, id))
      .returning();

    await logAudit(app, request, 'update', 'role', id, {
      oldValues: { permissions: existing.permissions },
      newValues: { permissions: perms },
    });

    return updated;
  });

  app.delete('/:id', {
    preHandler: [app.authenticate, requirePermission(Permission.ROLES_MANAGE)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const [existing] = await app.db.select().from(roles).where(eq(roles.id, id)).limit(1);
    if (!existing) throw new NotFoundError('Role not found');
    if (existing.isSystem) throw new ValidationError('Cannot delete system roles');

    await app.db.delete(roles).where(eq(roles.id, id));

    await logAudit(app, request, 'delete', 'role', id, {
      oldValues: { name: existing.name },
    });

    return reply.status(204).send();
  });

  app.get('/permissions/all', {
    preHandler: [app.authenticate, requirePermission(Permission.ROLES_MANAGE)],
  }, async () => {
    const allPerms = Object.values(Permission);
    const grouped: Record<string, string[]> = {};
    for (const p of allPerms) {
      const [category] = p.split(':');
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(p);
    }
    return { permissions: allPerms, grouped };
  });
}
