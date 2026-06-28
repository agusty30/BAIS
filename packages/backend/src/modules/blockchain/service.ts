import { createHash } from 'crypto';
import { eq, desc, sql, asc } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { blockchainRecords, journalEntries, journalEntryLines } from '../../db/schema.js';
import type { BlockchainGateway } from '../../blockchain/types.js';

interface EntryData {
  id: string;
  entryNumber: string;
  date: Date | string;
  description: string;
  totalAmount: number;
}

interface LineData {
  accountId: string;
  debitAmount: number;
  creditAmount: number;
  lineOrder: number;
}

export function computeEntryHash(entry: EntryData, lines: LineData[], previousHash: string | null): string {
  const sortedLines = [...lines].sort((a, b) => a.lineOrder - b.lineOrder);
  const canonical = JSON.stringify({
    entryNumber: entry.entryNumber,
    date: typeof entry.date === 'string' ? entry.date : entry.date.toISOString(),
    description: entry.description,
    totalAmount: entry.totalAmount,
    lines: sortedLines.map(l => ({
      accountId: l.accountId,
      debitAmount: l.debitAmount,
      creditAmount: l.creditAmount,
    })),
    previousHash: previousHash || '0'.repeat(64),
  });
  return createHash('sha256').update(canonical).digest('hex');
}

export function computeMerkleRoot(hashes: string[]): string {
  if (hashes.length === 0) return '0'.repeat(64);
  if (hashes.length === 1) return hashes[0];

  let level = [...hashes];
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : left;
      next.push(createHash('sha256').update(left + right).digest('hex'));
    }
    level = next;
  }
  return level[0];
}

export async function getLastRecord(db: NodePgDatabase<any>) {
  const [last] = await db
    .select({ hash: blockchainRecords.hash })
    .from(blockchainRecords)
    .orderBy(desc(blockchainRecords.createdAt))
    .limit(1);
  return last?.hash ?? null;
}

export async function createBlockchainRecord(
  db: NodePgDatabase<any>,
  blockchain: BlockchainGateway,
  entry: EntryData,
  lines: LineData[],
) {
  const previousHash = await getLastRecord(db);
  const hash = computeEntryHash(entry, lines, previousHash);

  const txId = await blockchain.submitTransaction(
    'ledger',
    'recordJournalEntry',
    JSON.stringify({
      id: entry.id,
      entryNumber: entry.entryNumber,
      date: entry.date,
      lines,
      totalAmount: entry.totalAmount,
      hash,
    }),
  );

  const [record] = await db
    .insert(blockchainRecords)
    .values({
      recordType: 'journal_entry',
      recordId: entry.id,
      hash,
      previousHash,
      blockchainTxId: txId,
      status: 'verified',
      verifiedAt: new Date(),
    })
    .returning();

  return { record, txId };
}

interface VerifyResult {
  valid: boolean;
  totalRecords: number;
  verifiedCount: number;
  invalidRecords: { id: string; recordId: string; reason: string }[];
  brokenLinks: { id: string; recordId: string; expected: string; actual: string | null }[];
}

export async function verifyChain(db: NodePgDatabase<any>): Promise<VerifyResult> {
  const records = await db
    .select()
    .from(blockchainRecords)
    .orderBy(asc(blockchainRecords.createdAt));

  const result: VerifyResult = {
    valid: true,
    totalRecords: records.length,
    verifiedCount: 0,
    invalidRecords: [],
    brokenLinks: [],
  };

  if (records.length === 0) return result;

  for (let i = 0; i < records.length; i++) {
    const record = records[i];

    // Verify chain link
    const expectedPrev = i === 0 ? null : records[i - 1].hash;
    if (record.previousHash !== expectedPrev) {
      result.valid = false;
      result.brokenLinks.push({
        id: record.id,
        recordId: record.recordId,
        expected: expectedPrev || '(genesis)',
        actual: record.previousHash,
      });
      continue;
    }

    // Recompute hash from journal entry data
    if (record.recordType === 'journal_entry') {
      const [entry] = await db
        .select()
        .from(journalEntries)
        .where(eq(journalEntries.id, record.recordId))
        .limit(1);

      if (!entry) {
        result.valid = false;
        result.invalidRecords.push({
          id: record.id,
          recordId: record.recordId,
          reason: 'Journal entry not found',
        });
        continue;
      }

      const lines = await db
        .select()
        .from(journalEntryLines)
        .where(eq(journalEntryLines.journalEntryId, record.recordId));

      const recomputedHash = computeEntryHash(entry, lines, record.previousHash);

      if (recomputedHash !== record.hash) {
        result.valid = false;
        result.invalidRecords.push({
          id: record.id,
          recordId: record.recordId,
          reason: `Hash mismatch: expected ${recomputedHash.slice(0, 16)}... got ${record.hash.slice(0, 16)}...`,
        });
        continue;
      }
    }

    result.verifiedCount++;
  }

  return result;
}

export async function verifyEntry(db: NodePgDatabase<any>, journalEntryId: string) {
  const [record] = await db
    .select()
    .from(blockchainRecords)
    .where(eq(blockchainRecords.recordId, journalEntryId))
    .limit(1);

  if (!record) {
    return { verified: false, reason: 'No blockchain record found for this entry' };
  }

  const [entry] = await db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.id, journalEntryId))
    .limit(1);

  if (!entry) {
    return { verified: false, reason: 'Journal entry not found' };
  }

  const lines = await db
    .select()
    .from(journalEntryLines)
    .where(eq(journalEntryLines.journalEntryId, journalEntryId));

  const recomputedHash = computeEntryHash(entry, lines, record.previousHash);
  const hashValid = recomputedHash === record.hash;

  return {
    verified: hashValid,
    record: {
      id: record.id,
      hash: record.hash,
      previousHash: record.previousHash,
      blockchainTxId: record.blockchainTxId,
      createdAt: record.createdAt,
      verifiedAt: record.verifiedAt,
    },
    recomputedHash,
    reason: hashValid ? 'Hash matches — data integrity confirmed' : 'Hash mismatch — data may have been tampered',
  };
}

export async function getChainStats(db: NodePgDatabase<any>, blockchain: BlockchainGateway) {
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(blockchainRecords);

  const [verifiedResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(blockchainRecords)
    .where(eq(blockchainRecords.status, 'verified'));

  const [latest] = await db
    .select()
    .from(blockchainRecords)
    .orderBy(desc(blockchainRecords.createdAt))
    .limit(1);

  const status = blockchain.getStatus();

  const allHashes = await db
    .select({ hash: blockchainRecords.hash })
    .from(blockchainRecords)
    .orderBy(asc(blockchainRecords.createdAt));

  const merkleRoot = computeMerkleRoot(allHashes.map(h => h.hash));

  return {
    totalRecords: countResult?.count ?? 0,
    verifiedRecords: verifiedResult?.count ?? 0,
    latestBlock: status.latestBlock,
    blockchainMode: status.mode,
    blockchainConnected: status.connected,
    merkleRoot,
    lastRecordAt: latest?.createdAt ?? null,
    lastVerifiedAt: latest?.verifiedAt ?? null,
  };
}
