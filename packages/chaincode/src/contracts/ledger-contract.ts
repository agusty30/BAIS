import { Contract, Context, Info, Transaction } from 'fabric-contract-api';

@Info({ title: 'LedgerContract', description: 'Manages journal entries and account balances on-chain' })
export class LedgerContract extends Contract {
  constructor() {
    super('LedgerContract');
  }

  @Transaction()
  async recordJournalEntry(ctx: Context, entryJson: string): Promise<string> {
    const entry = JSON.parse(entryJson);
    const key = ctx.stub.createCompositeKey('journal', [entry.id]);
    const record = {
      ...entry,
      timestamp: new Date().toISOString(),
      txId: ctx.stub.getTxID(),
    };
    await ctx.stub.putState(key, Buffer.from(JSON.stringify(record)));

    // Update account balances
    for (const line of entry.lines || []) {
      const balanceKey = ctx.stub.createCompositeKey('balance', [line.accountId]);
      const existing = await ctx.stub.getState(balanceKey);
      let balance = { accountId: line.accountId, debitTotal: 0, creditTotal: 0, balance: 0 };

      if (existing && existing.length > 0) {
        balance = JSON.parse(existing.toString());
      }

      balance.debitTotal += line.debitAmount || 0;
      balance.creditTotal += line.creditAmount || 0;
      balance.balance = balance.debitTotal - balance.creditTotal;

      await ctx.stub.putState(balanceKey, Buffer.from(JSON.stringify(balance)));
    }

    return ctx.stub.getTxID();
  }

  @Transaction(false)
  async getEntry(ctx: Context, entryId: string): Promise<string> {
    const key = ctx.stub.createCompositeKey('journal', [entryId]);
    const data = await ctx.stub.getState(key);
    if (!data || data.length === 0) {
      return JSON.stringify(null);
    }
    return data.toString();
  }

  @Transaction(false)
  async getAccountBalance(ctx: Context, accountId: string): Promise<string> {
    const key = ctx.stub.createCompositeKey('balance', [accountId]);
    const data = await ctx.stub.getState(key);
    if (!data || data.length === 0) {
      return JSON.stringify({ accountId, debitTotal: 0, creditTotal: 0, balance: 0 });
    }
    return data.toString();
  }

  @Transaction(false)
  async verifyBalance(ctx: Context, accountId: string, expectedBalance: string): Promise<string> {
    const key = ctx.stub.createCompositeKey('balance', [accountId]);
    const data = await ctx.stub.getState(key);
    if (!data || data.length === 0) {
      return JSON.stringify({ verified: false, reason: 'Account not found on chain' });
    }
    const balance = JSON.parse(data.toString());
    const matches = balance.balance === parseInt(expectedBalance, 10);
    return JSON.stringify({ verified: matches, onChainBalance: balance.balance, expected: parseInt(expectedBalance, 10) });
  }
}
