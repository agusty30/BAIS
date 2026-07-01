import type { FastifyInstance } from 'fastify';
import { eq, desc, sql, and } from 'drizzle-orm';
import { products, inventoryTransactions } from '../../db/schema.js';
import { Permission } from '@bais/shared';
import { requirePermission } from '../../plugins/auth.js';
import { NotFoundError, ValidationError } from '../../plugins/error-handler.js';
import { logAudit } from '../../lib/audit.js';

export async function inventoryRoutes(app: FastifyInstance) {
  // --- Products ---
  app.get('/products', {
    preHandler: [app.authenticate, requirePermission(Permission.INVENTORY_READ)],
  }, async (request) => {
    const { page = 1, limit = 50, category } = request.query as {
      page?: number; limit?: number; category?: string;
    };
    const offset = (Number(page) - 1) * Number(limit);
    const conditions = [];
    if (category) conditions.push(eq(products.category, category));
    const where = conditions.length ? and(...conditions) : undefined;

    const data = await app.db.select().from(products).where(where)
      .orderBy(products.sku).limit(Number(limit)).offset(offset);
    const [{ count }] = await app.db.select({ count: sql<number>`count(*)::int` }).from(products).where(where);
    return { data, total: count, page: Number(page), limit: Number(limit) };
  });

  app.get('/products/:id', {
    preHandler: [app.authenticate, requirePermission(Permission.INVENTORY_READ)],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const [product] = await app.db.select().from(products).where(eq(products.id, id)).limit(1);
    if (!product) throw new NotFoundError('Product not found');
    return product;
  });

  app.post('/products', {
    preHandler: [app.authenticate, requirePermission(Permission.INVENTORY_MANAGE)],
  }, async (request, reply) => {
    const { sku, name, description, category, unitCost, salePrice, reorderLevel, costMethod } = request.body as {
      sku: string; name: string; description?: string; category?: string;
      unitCost: number; salePrice: number; reorderLevel?: number; costMethod?: string;
    };
    if (!sku?.trim()) throw new ValidationError('SKU is required');
    if (!name?.trim()) throw new ValidationError('Product name is required');

    const [product] = await app.db.insert(products).values({
      sku: sku.trim().toUpperCase(),
      name: name.trim(),
      description: description?.trim() || null,
      category: category?.trim() || null,
      unitCost: unitCost || 0,
      salePrice: salePrice || 0,
      reorderLevel: reorderLevel || 0,
      costMethod: (costMethod as any) || 'moving_average',
    }).returning();

    await logAudit(app, request, 'create', 'product', product.id, {
      newValues: { sku: product.sku, name: product.name, unitCost, salePrice },
    });

    return reply.status(201).send(product);
  });

  app.put('/products/:id', {
    preHandler: [app.authenticate, requirePermission(Permission.INVENTORY_MANAGE)],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      name?: string; description?: string; category?: string;
      unitCost?: number; salePrice?: number; reorderLevel?: number;
      costMethod?: string; isActive?: boolean;
    };

    const [existing] = await app.db.select().from(products).where(eq(products.id, id)).limit(1);
    if (!existing) throw new NotFoundError('Product not found');

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.description !== undefined) updates.description = body.description?.trim() || null;
    if (body.category !== undefined) updates.category = body.category?.trim() || null;
    if (body.unitCost !== undefined) updates.unitCost = body.unitCost;
    if (body.salePrice !== undefined) updates.salePrice = body.salePrice;
    if (body.reorderLevel !== undefined) updates.reorderLevel = body.reorderLevel;
    if (body.costMethod !== undefined) updates.costMethod = body.costMethod;
    if (body.isActive !== undefined) updates.isActive = body.isActive;

    const [updated] = await app.db.update(products).set(updates).where(eq(products.id, id)).returning();

    await logAudit(app, request, 'update', 'product', id, {
      oldValues: { name: existing.name, unitCost: existing.unitCost, salePrice: existing.salePrice, isActive: existing.isActive },
      newValues: { name: updated.name, unitCost: updated.unitCost, salePrice: updated.salePrice, isActive: updated.isActive },
    });

    return updated;
  });

  app.delete('/products/:id', {
    preHandler: [app.authenticate, requirePermission(Permission.INVENTORY_MANAGE)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const [existing] = await app.db.select().from(products).where(eq(products.id, id)).limit(1);
    if (!existing) throw new NotFoundError('Product not found');

    const [{ count }] = await app.db.select({ count: sql<number>`count(*)::int` })
      .from(inventoryTransactions).where(eq(inventoryTransactions.productId, id));
    if (count > 0) throw new ValidationError('Cannot delete product with transaction history');

    await app.db.delete(products).where(eq(products.id, id));
    await logAudit(app, request, 'delete', 'product', id, {
      oldValues: { sku: existing.sku, name: existing.name },
    });
    return reply.status(204).send();
  });

  // --- Inventory Transactions ---
  app.get('/transactions', {
    preHandler: [app.authenticate, requirePermission(Permission.INVENTORY_READ)],
  }, async (request) => {
    const { page = 1, limit = 50, productId, type } = request.query as {
      page?: number; limit?: number; productId?: string; type?: string;
    };
    const offset = (Number(page) - 1) * Number(limit);
    const conditions = [];
    if (productId) conditions.push(eq(inventoryTransactions.productId, productId));
    if (type) conditions.push(eq(inventoryTransactions.type, type as any));
    const where = conditions.length ? and(...conditions) : undefined;

    const data = await app.db.select({
      id: inventoryTransactions.id,
      productId: inventoryTransactions.productId,
      productSku: products.sku,
      productName: products.name,
      type: inventoryTransactions.type,
      quantity: inventoryTransactions.quantity,
      unitCost: inventoryTransactions.unitCost,
      totalCost: inventoryTransactions.totalCost,
      reference: inventoryTransactions.reference,
      notes: inventoryTransactions.notes,
      date: inventoryTransactions.date,
      createdAt: inventoryTransactions.createdAt,
    })
      .from(inventoryTransactions)
      .innerJoin(products, eq(inventoryTransactions.productId, products.id))
      .where(where)
      .orderBy(desc(inventoryTransactions.date))
      .limit(Number(limit)).offset(offset);

    const [{ count }] = await app.db.select({ count: sql<number>`count(*)::int` })
      .from(inventoryTransactions).where(where);

    return { data, total: count, page: Number(page), limit: Number(limit) };
  });

  app.post('/transactions', {
    preHandler: [app.authenticate, requirePermission(Permission.INVENTORY_MANAGE)],
  }, async (request, reply) => {
    const { productId, type, quantity, unitCost, reference, notes, date } = request.body as {
      productId: string; type: string; quantity: number; unitCost: number;
      reference?: string; notes?: string; date: string;
    };

    if (!productId) throw new ValidationError('Product is required');
    if (!['in', 'out', 'adjustment'].includes(type)) throw new ValidationError('Invalid transaction type');
    if (!quantity || quantity === 0) throw new ValidationError('Quantity must be non-zero');

    const [product] = await app.db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!product) throw new NotFoundError('Product not found');

    if (type === 'out' && quantity > product.stockQuantity) {
      throw new ValidationError(`Insufficient stock. Available: ${product.stockQuantity}`);
    }

    const totalCost = Math.abs(quantity) * (unitCost || product.unitCost);

    const [tx] = await app.db.insert(inventoryTransactions).values({
      productId,
      type: type as any,
      quantity,
      unitCost: unitCost || product.unitCost,
      totalCost,
      reference: reference?.trim() || null,
      notes: notes?.trim() || null,
      date: new Date(date),
      createdById: request.user.sub,
    }).returning();

    // Update stock quantity
    let stockDelta = quantity;
    if (type === 'out') stockDelta = -quantity;

    // Update moving average cost on inbound
    let newUnitCost = product.unitCost;
    if (type === 'in' && product.costMethod === 'moving_average') {
      const totalExistingCost = product.stockQuantity * product.unitCost;
      const totalNewCost = quantity * (unitCost || product.unitCost);
      const newTotalQty = product.stockQuantity + quantity;
      newUnitCost = newTotalQty > 0 ? Math.round((totalExistingCost + totalNewCost) / newTotalQty) : unitCost || product.unitCost;
    }

    await app.db.update(products).set({
      stockQuantity: sql`${products.stockQuantity} + ${stockDelta}`,
      unitCost: type === 'in' ? newUnitCost : product.unitCost,
      updatedAt: new Date(),
    }).where(eq(products.id, productId));

    await logAudit(app, request, 'create', 'inventory_transaction', tx.id, {
      newValues: { productId, type, quantity, unitCost: tx.unitCost, totalCost },
    });

    return reply.status(201).send(tx);
  });

  // --- Summary ---
  app.get('/summary', {
    preHandler: [app.authenticate, requirePermission(Permission.INVENTORY_READ)],
  }, async () => {
    const [stats] = await app.db.select({
      totalProducts: sql<number>`count(*)::int`,
      activeProducts: sql<number>`count(*) filter (where ${products.isActive})::int`,
      totalStockValue: sql<number>`coalesce(sum(${products.stockQuantity} * ${products.unitCost}), 0)::bigint`,
      lowStockCount: sql<number>`count(*) filter (where ${products.stockQuantity} <= ${products.reorderLevel} and ${products.isActive})::int`,
    }).from(products);

    return stats;
  });
}
