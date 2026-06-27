import type { FastifyInstance } from 'fastify';
import { eq, desc } from 'drizzle-orm';
import { piecesMetrics } from '../../db/schema.js';
import { Permission, PiecesDimension, PIECES_DIMENSION_LABELS, PIECES_METRICS_DEFINITION } from '@bais/shared';
import { requirePermission } from '../../plugins/auth.js';

export async function piecesRoutes(app: FastifyInstance) {
  // Get PIECES dashboard data
  app.get('/dashboard', {
    preHandler: [app.authenticate, requirePermission(Permission.PIECES_VIEW)],
  }, async () => {
    const metrics = await app.db.select().from(piecesMetrics)
      .orderBy(desc(piecesMetrics.measuredAt));

    const dimensions = Object.values(PiecesDimension).map((dimension) => {
      const dimMetrics = metrics.filter((m) => m.dimension === dimension);
      const definitions = PIECES_METRICS_DEFINITION[dimension];
      const score = dimMetrics.length > 0
        ? Math.round(dimMetrics.reduce((sum, m) => sum + m.value, 0) / dimMetrics.length)
        : 0;

      return {
        dimension,
        label: PIECES_DIMENSION_LABELS[dimension],
        score,
        metrics: dimMetrics.slice(0, 5),
        definitions,
        trend: 'stable' as const,
      };
    });

    const overallScore = Math.round(
      dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length,
    );

    return { dimensions, overallScore };
  });

  // Get specific dimension metrics
  app.get('/metrics/:dimension', {
    preHandler: [app.authenticate, requirePermission(Permission.PIECES_VIEW)],
  }, async (request) => {
    const { dimension } = request.params as { dimension: string };
    const metrics = await app.db.select().from(piecesMetrics)
      .where(eq(piecesMetrics.dimension, dimension))
      .orderBy(desc(piecesMetrics.measuredAt))
      .limit(50);

    return { dimension, label: PIECES_DIMENSION_LABELS[dimension as PiecesDimension], metrics };
  });

  // Record metric
  app.post('/metrics', {
    preHandler: [app.authenticate, requirePermission(Permission.PIECES_MANAGE)],
  }, async (request, reply) => {
    const { dimension, metricName, value, unit, periodId } = request.body as {
      dimension: string;
      metricName: string;
      value: number;
      unit: string;
      periodId: string;
    };

    const [metric] = await app.db.insert(piecesMetrics).values({
      dimension,
      metricName,
      value,
      unit,
      periodId,
    }).returning();

    return reply.status(201).send(metric);
  });
}
