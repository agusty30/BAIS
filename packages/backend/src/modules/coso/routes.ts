import type { FastifyInstance } from 'fastify';
import { eq, desc } from 'drizzle-orm';
import { cosoEvaluations } from '../../db/schema.js';
import { Permission, COSOComponent, COSO_COMPONENT_LABELS, COSO_SYSTEM_CONTROLS } from '@bais/shared';
import { requirePermission } from '../../plugins/auth.js';

export async function cosoRoutes(app: FastifyInstance) {
  // Get COSO matrix (latest evaluation per component)
  app.get('/matrix', {
    preHandler: [app.authenticate, requirePermission(Permission.COSO_VIEW)],
  }, async () => {
    const components = Object.values(COSOComponent).map((component) => ({
      component,
      label: COSO_COMPONENT_LABELS[component],
      systemControls: COSO_SYSTEM_CONTROLS[component],
    }));

    const evaluations = await app.db.select().from(cosoEvaluations)
      .orderBy(desc(cosoEvaluations.createdAt));

    const latestByComponent = new Map<string, typeof evaluations[0]>();
    for (const evaluation of evaluations) {
      if (!latestByComponent.has(evaluation.component)) {
        latestByComponent.set(evaluation.component, evaluation);
      }
    }

    const matrix = components.map((c) => {
      const evaluation = latestByComponent.get(c.component);
      return {
        ...c,
        currentScore: evaluation?.score ?? 0,
        evidence: evaluation?.evidence ?? [],
        lastEvaluatedAt: evaluation?.createdAt ?? null,
      };
    });

    const overallScore = matrix.reduce((sum, c) => sum + c.currentScore, 0) / matrix.length;

    return { components: matrix, overallScore };
  });

  // Submit COSO evaluation
  app.post('/evaluations', {
    preHandler: [app.authenticate, requirePermission(Permission.COSO_EVALUATE)],
  }, async (request, reply) => {
    const { component, score, evidence, periodId } = request.body as {
      component: string;
      score: number;
      evidence: any[];
      periodId: string;
    };

    const [evaluation] = await app.db.insert(cosoEvaluations).values({
      component,
      score,
      evidence,
      evaluatedById: request.user.sub,
      periodId,
    }).returning();

    return reply.status(201).send(evaluation);
  });

  // Get evaluation history
  app.get('/history', {
    preHandler: [app.authenticate, requirePermission(Permission.COSO_VIEW)],
  }, async () => {
    const evaluations = await app.db.select().from(cosoEvaluations)
      .orderBy(desc(cosoEvaluations.createdAt))
      .limit(100);

    return { data: evaluations };
  });
}
