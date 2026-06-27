import { Contract, Context, Info, Transaction } from 'fabric-contract-api';
import { createHash } from 'crypto';

@Info({ title: 'AuditContract', description: 'Immutable append-only audit trail' })
export class AuditContract extends Contract {
  constructor() {
    super('AuditContract');
  }

  @Transaction()
  async logAction(ctx: Context, auditEntryJson: string): Promise<string> {
    const entry = JSON.parse(auditEntryJson);
    const key = ctx.stub.createCompositeKey('audit', [entry.id]);

    const detailsHash = createHash('sha256')
      .update(JSON.stringify(entry.details || {}))
      .digest('hex');

    const record = {
      id: entry.id,
      action: entry.action,
      actor: entry.actor,
      resource: entry.resource,
      resourceId: entry.resourceId,
      detailsHash,
      timestamp: new Date().toISOString(),
      txId: ctx.stub.getTxID(),
    };

    await ctx.stub.putState(key, Buffer.from(JSON.stringify(record)));
    return ctx.stub.getTxID();
  }

  @Transaction(false)
  async getAuditTrail(ctx: Context, resourceType: string, resourceId: string): Promise<string> {
    const iterator = await ctx.stub.getStateByPartialCompositeKey('audit', []);
    const results: any[] = [];

    let result = await iterator.next();
    while (!result.done) {
      const record = JSON.parse(result.value.value.toString());
      if (record.resource === resourceType && record.resourceId === resourceId) {
        results.push(record);
      }
      result = await iterator.next();
    }
    await iterator.close();

    return JSON.stringify(results);
  }

  @Transaction(false)
  async verifyLogIntegrity(ctx: Context, logId: string, expectedHash: string): Promise<string> {
    const key = ctx.stub.createCompositeKey('audit', [logId]);
    const data = await ctx.stub.getState(key);
    if (!data || data.length === 0) {
      return JSON.stringify({ verified: false, reason: 'Log entry not found on chain' });
    }
    const record = JSON.parse(data.toString());
    const matches = record.detailsHash === expectedHash;
    return JSON.stringify({ verified: matches, onChainHash: record.detailsHash });
  }
}
