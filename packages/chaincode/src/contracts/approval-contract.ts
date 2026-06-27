import { Contract, Context, Info, Transaction } from 'fabric-contract-api';

@Info({ title: 'ApprovalContract', description: 'Records approval workflow decisions immutably' })
export class ApprovalContract extends Contract {
  constructor() {
    super('ApprovalContract');
  }

  @Transaction()
  async initiateApproval(ctx: Context, workflowJson: string): Promise<string> {
    const workflow = JSON.parse(workflowJson);
    const key = ctx.stub.createCompositeKey('approval', [workflow.id]);
    const record = {
      ...workflow,
      history: [{ action: 'initiated', timestamp: new Date().toISOString(), txId: ctx.stub.getTxID() }],
    };
    await ctx.stub.putState(key, Buffer.from(JSON.stringify(record)));
    return ctx.stub.getTxID();
  }

  @Transaction()
  async recordDecision(
    ctx: Context,
    workflowId: string,
    step: string,
    decision: string,
    comment: string,
  ): Promise<string> {
    const key = ctx.stub.createCompositeKey('approval', [workflowId]);
    const existing = await ctx.stub.getState(key);

    if (!existing || existing.length === 0) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const workflow = JSON.parse(existing.toString());
    workflow.history.push({
      action: decision,
      step: parseInt(step, 10),
      comment,
      timestamp: new Date().toISOString(),
      txId: ctx.stub.getTxID(),
      actor: ctx.clientIdentity.getID(),
    });

    if (decision === 'approved' && parseInt(step, 10) >= workflow.totalSteps) {
      workflow.status = 'approved';
    } else if (decision === 'rejected') {
      workflow.status = 'rejected';
    }

    await ctx.stub.putState(key, Buffer.from(JSON.stringify(workflow)));
    return ctx.stub.getTxID();
  }

  @Transaction(false)
  async getWorkflow(ctx: Context, workflowId: string): Promise<string> {
    const key = ctx.stub.createCompositeKey('approval', [workflowId]);
    const data = await ctx.stub.getState(key);
    if (!data || data.length === 0) return JSON.stringify(null);
    return data.toString();
  }

  @Transaction(false)
  async getWorkflowHistory(ctx: Context, workflowId: string): Promise<string> {
    const key = ctx.stub.createCompositeKey('approval', [workflowId]);
    const data = await ctx.stub.getState(key);
    if (!data || data.length === 0) return JSON.stringify([]);
    const workflow = JSON.parse(data.toString());
    return JSON.stringify(workflow.history || []);
  }
}
