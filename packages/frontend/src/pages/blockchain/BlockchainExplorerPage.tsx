import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useCurrencyStore } from '../../stores/currency';
import { formatCurrency } from '../../lib/currency';
import {
  Blocks,
  Shield,
  CheckCircle,
  AlertTriangle,
  Copy,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowRight,
  RefreshCw,
  Hash,
  Link2,
  Clock,
  Database,
} from 'lucide-react';

export function BlockchainExplorerPage() {
  const [page, setPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const { currency } = useCurrencyStore();
  const fc = (cents: number) => formatCurrency(cents, currency);
  const limit = 15;

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['blockchain-stats'],
    queryFn: () => api.get('/blockchain/stats').then(r => r.data),
  });

  const { data: recordsData, isLoading } = useQuery({
    queryKey: ['blockchain-records', page],
    queryFn: () => api.get(`/blockchain/records?page=${page}&limit=${limit}`).then(r => r.data),
  });

  const verifyMutation = useMutation({
    mutationFn: () => api.get('/blockchain/verify').then(r => r.data),
    onSuccess: () => refetchStats(),
  });

  const records = recordsData?.data || [];
  const totalPages = Math.ceil((recordsData?.total || 0) / limit);

  const recentBlocks = records.slice(0, 6).reverse();

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Blockchain Explorer</h1>
          <p className="page-subtitle">Verify financial data integrity through cryptographic hash chain</p>
        </div>
        <button
          onClick={() => verifyMutation.mutate()}
          disabled={verifyMutation.isPending}
          className="btn-primary"
        >
          <RefreshCw className={`h-4 w-4 ${verifyMutation.isPending ? 'animate-spin' : ''}`} />
          {verifyMutation.isPending ? 'Verifying...' : 'Verify Chain'}
        </button>
      </div>

      {verifyMutation.data && (
        <div className={`rounded-xl border p-4 ${
          verifyMutation.data.valid
            ? 'border-success-200 bg-success-50 dark:border-success-800 dark:bg-success-900/20'
            : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
        }`}>
          <div className="flex items-center gap-2">
            {verifyMutation.data.valid ? (
              <CheckCircle className="h-5 w-5 text-success-600 dark:text-success-400" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            )}
            <span className={`font-medium ${
              verifyMutation.data.valid
                ? 'text-success-700 dark:text-success-300'
                : 'text-red-700 dark:text-red-300'
            }`}>
              {verifyMutation.data.valid
                ? `Chain integrity verified — ${verifyMutation.data.verifiedCount} of ${verifyMutation.data.totalRecords} records valid`
                : `Integrity issues: ${verifyMutation.data.invalidRecords?.length || 0} invalid records, ${verifyMutation.data.brokenLinks?.length || 0} broken links`
              }
            </span>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/50">
              <Database className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.totalRecords ?? '—'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Blocks</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-100 dark:bg-success-900/50">
              <CheckCircle className="h-5 w-5 text-success-600 dark:text-success-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-success-600 dark:text-success-400">{stats?.verifiedRecords ?? '—'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Verified</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/50">
              <Blocks className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.latestBlock ?? '—'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Latest Block #</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
              <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white font-mono truncate" title={stats?.merkleRoot}>
                {stats?.merkleRoot ? stats.merkleRoot.slice(0, 16) + '...' : '—'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Merkle Root</p>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Chain Diagram */}
      {recentBlocks.length > 0 && (
        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white font-display">Hash Chain Visualization</h2>
          <div className="overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max py-2">
              {/* Genesis */}
              <div className="flex flex-col items-center">
                <div className="rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 px-3 py-2 text-center">
                  <div className="text-xs font-medium text-slate-400">Genesis</div>
                  <div className="font-mono text-[10px] text-slate-400">{'0'.repeat(8)}...</div>
                </div>
              </div>
              {recentBlocks.map((block: any, idx: number) => (
                <div key={block.id} className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <div
                    className="rounded-lg border-2 border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 px-3 py-2 text-center cursor-pointer hover:border-primary-400 dark:hover:border-primary-600 transition-colors min-w-[120px]"
                    onClick={() => setSelectedRecord(block)}
                  >
                    <div className="text-xs font-semibold text-primary-700 dark:text-primary-300">
                      {block.entryNumber || `Block ${idx + 1}`}
                    </div>
                    <div className="font-mono text-[10px] text-primary-500 dark:text-primary-400 mt-0.5">
                      {block.hash.slice(0, 12)}...
                    </div>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      {block.status === 'verified' ? (
                        <CheckCircle className="h-3 w-3 text-success-500" />
                      ) : (
                        <Clock className="h-3 w-3 text-amber-500" />
                      )}
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {block.status === 'verified' ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {(recordsData?.total || 0) > recentBlocks.length && (
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-600 px-3 py-2 text-center">
                    <div className="text-xs text-slate-400">+{(recordsData?.total || 0) - recentBlocks.length} more</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Records Table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white font-display">Blockchain Records</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Entry</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Hash</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Prev Hash</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">TX ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Timestamp</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                  No blockchain records yet. Post a journal entry to create the first block.
                </td></tr>
              ) : (
                records.map((record: any, idx: number) => (
                  <tr
                    key={record.id}
                    className="table-row cursor-pointer"
                    onClick={() => setSelectedRecord(record)}
                  >
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-xs">
                      {(recordsData?.total || 0) - ((page - 1) * limit) - idx}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{record.entryNumber || '—'}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{record.entryDescription}</div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="flex items-center gap-1 group"
                        onClick={(e) => { e.stopPropagation(); copyHash(record.hash); }}
                        title="Click to copy full hash"
                      >
                        <Hash className="h-3 w-3 text-slate-400" />
                        <span className="font-mono text-xs text-primary-600 dark:text-primary-400 group-hover:underline">
                          {record.hash.slice(0, 12)}...
                        </span>
                        <Copy className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                        {record.previousHash ? record.previousHash.slice(0, 12) + '...' : '(genesis)'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                        {record.blockchainTxId ? record.blockchainTxId.slice(0, 14) + '...' : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-slate-900 dark:text-white">
                      {record.entryAmount != null ? fc(record.entryAmount) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(record.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {record.status === 'verified' ? (
                        <span className="badge bg-success-100 dark:bg-success-900/50 text-success-700 dark:text-success-300">
                          <CheckCircle className="h-3 w-3" /> Verified
                        </span>
                      ) : (
                        <span className="badge bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                          <Clock className="h-3 w-3" /> Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 px-4 py-3">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Page {page} of {totalPages} ({recordsData?.total || 0} total)
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="btn-secondary !p-1.5 disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="btn-secondary !p-1.5 disabled:opacity-40">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Block Detail Modal */}
      {selectedRecord && (
        <BlockDetailModal record={selectedRecord} onClose={() => setSelectedRecord(null)} fc={fc} />
      )}
    </div>
  );
}

function BlockDetailModal({ record, onClose, fc }: { record: any; onClose: () => void; fc: (n: number) => string }) {
  const { data: detail } = useQuery({
    queryKey: ['blockchain-record', record.id],
    queryFn: () => api.get(`/blockchain/records/${record.id}`).then(r => r.data),
    enabled: !!record.id,
  });

  const { data: verification } = useQuery({
    queryKey: ['blockchain-verify-entry', record.recordId],
    queryFn: () => api.get(`/blockchain/verify/${record.recordId}`).then(r => r.data),
    enabled: !!record.recordId,
  });

  const d = detail || record;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white font-display flex items-center gap-2">
            <Blocks className="h-5 w-5 text-primary-500" />
            Block Detail
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Verification Status */}
        {verification && (
          <div className={`mb-4 rounded-lg p-3 flex items-center gap-2 ${
            verification.verified
              ? 'bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            {verification.verified ? (
              <CheckCircle className="h-4 w-4 text-success-600 dark:text-success-400" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            )}
            <span className={`text-sm font-medium ${
              verification.verified
                ? 'text-success-700 dark:text-success-300'
                : 'text-red-700 dark:text-red-300'
            }`}>
              {verification.reason}
            </span>
          </div>
        )}

        {/* Entry Info */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <InfoField label="Journal Entry" value={d.entryNumber || '—'} />
            <InfoField label="Amount" value={d.entryAmount != null ? fc(d.entryAmount) : '—'} />
            <InfoField label="Date" value={d.entryDate ? new Date(d.entryDate).toLocaleDateString() : '—'} />
            <InfoField label="Status" value={d.status} badge />
            <InfoField label="Record Type" value={d.recordType} />
            <InfoField label="Created At" value={d.createdAt ? new Date(d.createdAt).toLocaleString() : '—'} />
          </div>

          {d.entryDescription && (
            <InfoField label="Description" value={d.entryDescription} full />
          )}

          {/* Hash Details */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1">
              <Link2 className="h-4 w-4" /> Cryptographic Proof
            </h3>
            <div className="space-y-3">
              <HashField label="Block Hash (SHA-256)" value={d.hash} />
              <HashField label="Previous Block Hash" value={d.previousHash || '(genesis block — no previous hash)'} />
              {d.blockchainTxId && (
                <HashField label="Blockchain Transaction ID" value={d.blockchainTxId} />
              )}
              {verification?.recomputedHash && (
                <HashField
                  label="Recomputed Hash"
                  value={verification.recomputedHash}
                  match={verification.recomputedHash === d.hash}
                />
              )}
            </div>
          </div>

          {/* Blockchain Proof */}
          {d.blockchainProof && (
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1">
                <Shield className="h-4 w-4" /> On-Chain Data
              </h3>
              <pre className="rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 text-xs text-slate-700 dark:text-slate-300 overflow-x-auto font-mono">
                {JSON.stringify(d.blockchainProof, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value, badge, full }: { label: string; value: string; badge?: boolean; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      {badge ? (
        <div className="mt-0.5">
          <span className={`badge text-xs ${
            value === 'verified'
              ? 'bg-success-100 dark:bg-success-900/50 text-success-700 dark:text-success-300'
              : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
          }`}>{value}</span>
        </div>
      ) : (
        <p className="mt-0.5 text-sm text-slate-900 dark:text-white">{value}</p>
      )}
    </div>
  );
}

function HashField({ label, value, match }: { label: string; value: string; match?: boolean }) {
  const copyHash = () => navigator.clipboard.writeText(value);

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
        {match !== undefined && (
          match ? (
            <CheckCircle className="h-3 w-3 text-success-500" />
          ) : (
            <AlertTriangle className="h-3 w-3 text-red-500" />
          )
        )}
      </div>
      <div className="mt-1 flex items-center gap-2 group">
        <code className="flex-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-mono text-slate-700 dark:text-slate-300 break-all">
          {value}
        </code>
        <button
          onClick={copyHash}
          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Copy"
        >
          <Copy className="h-3.5 w-3.5 text-slate-400" />
        </button>
      </div>
    </div>
  );
}
