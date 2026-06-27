import type { FastifyInstance } from 'fastify';
import { eq, isNull } from 'drizzle-orm';
import { accounts } from '../../db/schema.js';
import { Permission } from '@bais/shared';
import { requirePermission } from '../../plugins/auth.js';
import { createAccountSchema } from '@bais/shared';
import { NotFoundError } from '../../plugins/error-handler.js';

export async function accountRoutes(app: FastifyInstance) {
  // List all accounts
  app.get('/', {
    preHandler: [app.authenticate, requirePermission(Permission.ACCOUNTS_READ)],
  }, async (request) => {
    const { flat } = request.query as { flat?: string };
    const result = await app.db.select().from(accounts).orderBy(accounts.code);
    if (flat === 'true') return { data: result };
    return { data: buildTree(result) };
  });

  // Get account tree
  app.get('/tree', {
    preHandler: [app.authenticate, requirePermission(Permission.ACCOUNTS_READ)],
  }, async () => {
    const result = await app.db.select().from(accounts).orderBy(accounts.code);
    return { data: buildTree(result) };
  });

  // Get single account
  app.get('/:id', {
    preHandler: [app.authenticate, requirePermission(Permission.ACCOUNTS_READ)],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const [account] = await app.db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
    if (!account) throw new NotFoundError('Account');
    return account;
  });

  // Create account
  app.post('/', {
    preHandler: [app.authenticate, requirePermission(Permission.ACCOUNTS_CREATE)],
  }, async (request, reply) => {
    const body = createAccountSchema.parse(request.body);
    const normalBalance = ['asset', 'expense'].includes(body.type) ? 'debit' : 'credit';

    let level = 0;
    let path = body.code;
    if (body.parentId) {
      const [parent] = await app.db.select().from(accounts).where(eq(accounts.id, body.parentId)).limit(1);
      if (parent) {
        level = parent.level + 1;
        path = `${parent.path}.${body.code}`;
      }
    }

    const [account] = await app.db.insert(accounts).values({
      code: body.code,
      name: body.name,
      type: body.type as any,
      normalBalance: normalBalance as any,
      parentId: body.parentId || null,
      level,
      path,
    }).returning();

    return reply.status(201).send(account);
  });

  // Update account
  app.patch('/:id', {
    preHandler: [app.authenticate, requirePermission(Permission.ACCOUNTS_UPDATE)],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as { name?: string; isActive?: boolean };

    const [account] = await app.db
      .update(accounts)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(accounts.id, id))
      .returning();

    if (!account) throw new NotFoundError('Account');
    return account;
  });
}

function buildTree(flatAccounts: any[]): any[] {
  const map = new Map<string | null, any[]>();
  flatAccounts.forEach((a) => {
    const parentKey = a.parentId || null;
    if (!map.has(parentKey)) map.set(parentKey, []);
    map.get(parentKey)!.push({ ...a, children: [] });
  });

  function attach(nodes: any[]): any[] {
    return nodes.map((node) => {
      node.children = map.get(node.id) || [];
      attach(node.children);
      return node;
    });
  }

  return attach(map.get(null) || []);
}
