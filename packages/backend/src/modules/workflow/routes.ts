import type { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { approvalWorkflows, approvalSteps, journalEntries } from '../../db/schema.js';
import { Permission, getThresholdForAmount, approvalDecisionSchema } from '@bais/shared';
import { requirePermission } from '../../plugins/auth.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../../plugins/error-handler.js';

export async function workflowRoutes(app: FastifyInstance) {
  // Get pending approvals for current user
  app.get('/pending', {
    preHandler: [app.authenticate, requirePermission(Permission.APPROVAL_VIEW)],
  }, async (request) => {
    const workflows = await app.db.select().from(approvalWorkflows)
      .where(eq(approvalWorkflows.status, 'pending'));

    const result = [];
    for (const wf of workflows) {
      const steps = await app.db.select().from(approvalSteps)
        .where(and(
          eq(approvalSteps.workflowId, wf.id),
          eq(approvalSteps.stepOrder, wf.currentStep),
        )).limit(1);

      const currentStep = steps[0];
      if (currentStep && currentStep.requiredRole === request.user.role) {
        const [entry] = await app.db.select().from(journalEntries)
          .where(eq(journalEntries.id, wf.journalEntryId)).limit(1);
        result.push({ workflow: wf, currentStep, journalEntry: entry });
      }
    }

    return { data: result };
  });

  // Get workflow details
  app.get('/:id', {
    preHandler: [app.authenticate, requirePermission(Permission.APPROVAL_VIEW)],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const [workflow] = await app.db.select().from(approvalWorkflows)
      .where(eq(approvalWorkflows.id, id)).limit(1);

    if (!workflow) throw new NotFoundError('Workflow');

    const steps = await app.db.select().from(approvalSteps)
      .where(eq(approvalSteps.workflowId, id))
      .orderBy(approvalSteps.stepOrder);

    const [entry] = await app.db.select().from(journalEntries)
      .where(eq(journalEntries.id, workflow.journalEntryId)).limit(1);

    return { ...workflow, steps, journalEntry: entry };
  });

  // Approve
  app.post('/:id/approve', {
    preHandler: [app.authenticate, requirePermission(Permission.APPROVAL_DECIDE)],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const body = approvalDecisionSchema.parse(request.body);

    const [workflow] = await app.db.select().from(approvalWorkflows)
      .where(eq(approvalWorkflows.id, id)).limit(1);
    if (!workflow) throw new NotFoundError('Workflow');
    if (workflow.status !== 'pending') throw new ValidationError('Workflow is not pending');

    // Segregation of duties: submitter cannot approve
    if (workflow.initiatedById === request.user.sub) {
      throw new ForbiddenError('Cannot approve your own submission');
    }

    // Record decision on blockchain
    const txId = await app.blockchain.submitTransaction(
      'approval',
      'recordDecision',
      id,
      String(workflow.currentStep),
      'approved',
      body.comments || '',
    );

    // Update step
    await app.db.update(approvalSteps)
      .set({
        status: 'approved',
        approverId: request.user.sub,
        comments: body.comments || null,
        decidedAt: new Date(),
        blockchainTxId: txId,
      })
      .where(and(
        eq(approvalSteps.workflowId, id),
        eq(approvalSteps.stepOrder, workflow.currentStep),
      ));

    // Check if all steps complete
    if (workflow.currentStep >= workflow.totalSteps) {
      await app.db.update(approvalWorkflows)
        .set({ status: 'approved', completedAt: new Date(), blockchainTxId: txId })
        .where(eq(approvalWorkflows.id, id));

      // Auto-update journal entry to approved
      await app.db.update(journalEntries)
        .set({ status: 'approved', updatedAt: new Date() })
        .where(eq(journalEntries.id, workflow.journalEntryId));
    } else {
      await app.db.update(approvalWorkflows)
        .set({ currentStep: workflow.currentStep + 1 })
        .where(eq(approvalWorkflows.id, id));
    }

    return { success: true, txId };
  });

  // Reject
  app.post('/:id/reject', {
    preHandler: [app.authenticate, requirePermission(Permission.APPROVAL_DECIDE)],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const body = approvalDecisionSchema.parse(request.body);

    const [workflow] = await app.db.select().from(approvalWorkflows)
      .where(eq(approvalWorkflows.id, id)).limit(1);
    if (!workflow) throw new NotFoundError('Workflow');
    if (workflow.status !== 'pending') throw new ValidationError('Workflow is not pending');

    const txId = await app.blockchain.submitTransaction(
      'approval',
      'recordDecision',
      id,
      String(workflow.currentStep),
      'rejected',
      body.comments || '',
    );

    await app.db.update(approvalSteps)
      .set({
        status: 'rejected',
        approverId: request.user.sub,
        comments: body.comments || null,
        decidedAt: new Date(),
        blockchainTxId: txId,
      })
      .where(and(
        eq(approvalSteps.workflowId, id),
        eq(approvalSteps.stepOrder, workflow.currentStep),
      ));

    await app.db.update(approvalWorkflows)
      .set({ status: 'rejected', completedAt: new Date(), blockchainTxId: txId })
      .where(eq(approvalWorkflows.id, id));

    await app.db.update(journalEntries)
      .set({ status: 'draft', updatedAt: new Date() })
      .where(eq(journalEntries.id, workflow.journalEntryId));

    return { success: true, txId };
  });
}
