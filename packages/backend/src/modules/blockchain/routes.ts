import type { FastifyInstance } from 'fastify';
import { eq, desc, sql, asc } from 'drizzle-orm';
import { blockchainRecords, journalEntries } from '../../db/schema.js';
import { Permission } from '@bais/shared';
import { requirePermission } from '../../plugins/auth.js';
import { NotFoundError } from '../../plugins/error-handler.js';
import {
  verifyChain,
  verifyEntry,
  getChainStats,
  computeMerkleRoot,
} from './service.js';

export async function blockchainRoutes(app: FastifyInstance) {
  // Chain overview
  app.get('/', {
    preHandler: [app.authenticate, requirePermission(Permission.AUDIT_VIEW)],
  }, async () => {
    return getChainStats(app.db, app.blockchain);
  });

  // Paginated list of blockchain records
  app.get('/records', {
    preHandler: [app.authenticate, requirePermission(Permission.AUDIT_VIEW)],
  }, async (request) => {
    const { page = 1, limit = 20 } = request.query as { page?: number; limit?: number };
    const offset = (page - 1) * limit;

    const records = await app.db
      .select({
        id: blockchainRecords.id,
        recordType: blockchainRecords.recordType,
        recordId: blockchainRecords.recordId,
        hash: blockchainRecords.hash,
        previousHash: blockchainRecords.previousHash,
        merkleRoot: blockchainRecords.merkleRoot,
        blockchainTxId: blockchainRecords.blockchainTxId,
        status: blockchainRecords.status,
        verifiedAt: blockchainRecords.verifiedAt,
        createdAt: blockchainRecords.createdAt,
        entryNumber: journalEntries.entryNumber,
        entryDescription: journalEntries.description,
        entryDate: journalEntries.date,
        entryAmount: journalEntries.totalAmount,
      })
      .from(blockchainRecords)
      .leftJoin(journalEntries, eq(blockchainRecords.recordId, journalEntries.id))
      .orderBy(desc(blockchainRecords.createdAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await app.db
      .select({ count: sql<number>`count(*)::int` })
      .from(blockchainRecords);

    return { data: records, page, limit, total: countResult?.count ?? 0 };
  });

  // Single record detail
  app.get('/records/:id', {
    preHandler: [app.authenticate, requirePermission(Permission.AUDIT_VIEW)],
  }, async (request) => {
    const { id } = request.params as { id: string };

    const [record] = await app.db
      .select({
        id: blockchainRecords.id,
        recordType: blockchainRecords.recordType,
        recordId: blockchainRecords.recordId,
        hash: blockchainRecords.hash,
        previousHash: blockchainRecords.previousHash,
        merkleRoot: blockchainRecords.merkleRoot,
        blockchainTxId: blockchainRecords.blockchainTxId,
        status: blockchainRecords.status,
        verifiedAt: blockchainRecords.verifiedAt,
        createdAt: blockchainRecords.createdAt,
        entryNumber: journalEntries.entryNumber,
        entryDescription: journalEntries.description,
        entryDate: journalEntries.date,
        entryAmount: journalEntries.totalAmount,
      })
      .from(blockchainRecords)
      .leftJoin(journalEntries, eq(blockchainRecords.recordId, journalEntries.id))
      .where(eq(blockchainRecords.id, id))
      .limit(1);

    if (!record) throw new NotFoundError('Blockchain Record');

    let blockchainProof = null;
    if (record.blockchainTxId) {
      try {
        const proof = await app.blockchain.evaluateTransaction('ledger', 'getEntry', record.recordId);
        blockchainProof = JSON.parse(proof);
      } catch {
        blockchainProof = null;
      }
    }

    return { ...record, blockchainProof };
  });

  // Full chain verification
  app.get('/verify', {
    preHandler: [app.authenticate, requirePermission(Permission.AUDIT_VERIFY)],
  }, async () => {
    const result = await verifyChain(app.db);
    return {
      ...result,
      verifiedAt: new Date().toISOString(),
    };
  });

  // Single entry verification
  app.get('/verify/:journalEntryId', {
    preHandler: [app.authenticate, requirePermission(Permission.AUDIT_VERIFY)],
  }, async (request) => {
    const { journalEntryId } = request.params as { journalEntryId: string };
    return verifyEntry(app.db, journalEntryId);
  });

  // Merkle root computation
  app.get('/merkle', {
    preHandler: [app.authenticate, requirePermission(Permission.AUDIT_VIEW)],
  }, async () => {
    const allHashes = await app.db
      .select({ hash: blockchainRecords.hash })
      .from(blockchainRecords)
      .orderBy(asc(blockchainRecords.createdAt));

    const hashes = allHashes.map(h => h.hash);
    const merkleRoot = computeMerkleRoot(hashes);

    return {
      merkleRoot,
      totalLeaves: hashes.length,
      computedAt: new Date().toISOString(),
    };
  });

  // Chain statistics
  app.get('/stats', {
    preHandler: [app.authenticate, requirePermission(Permission.AUDIT_VIEW)],
  }, async () => {
    return getChainStats(app.db, app.blockchain);
  });
}
