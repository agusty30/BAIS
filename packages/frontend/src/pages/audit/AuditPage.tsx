import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Shield, ChevronDown, ChevronLeft, ChevronRight, Search, Filter } from 'lucide-react';

export function AuditPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [resource, setResource] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, action, resource, fromDate, toDate],
    queryFn: () => {
      const params: Record<string, string | number> = { page, limit };
      if (action) params.action = action;
      if (resource) params.resource = resource;
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      return api.get('/audit/logs', { params }).then((r) => r.data);
    },
  });

  const totalPages = Math.ceil((data?.total || 0) / limit);
  const logs = data?.data || [];

  const clearFilters = () => {
    setAction('');
    setResource('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const hasFilters = action || resource || fromDate || toDate;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
        <p className="mt-1 text-sm text-gray-500">Immutable record of all financial actions</p>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm border">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Action</label>
            <input
              type="text"
              value={action}
              onChange={(e) => { setAction(e.target.value); setPage(1); }}
              placeholder="e.g. journal.create"
              className="w-44 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Resource</label>
            <input
              type="text"
              value={resource}
              onChange={(e) => { setResource(e.target.value); setPage(1); }}
              placeholder="e.g. journal_entry"
              className="w-44 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-white shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500 w-8" />
              <th className="px-4 py-3 text-left font-medium text-gray-500">Timestamp</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">User</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Action</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Resource</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Blockchain</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No audit logs found</td></tr>
            ) : (
              logs.map((log: any) => (
                <>
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  >
                    <td className="px-4 py-3">
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${expandedId === log.id ? 'rotate-180' : ''}`} />
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-900">{log.userName || log.userId?.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono">{log.action}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {log.resource}
                      {log.resourceId && <span className="text-gray-400">/{log.resourceId.slice(0, 8)}</span>}
                    </td>
                    <td className="px-4 py-3">
                      {log.blockchainTxId ? (
                        <span className="flex items-center gap-1 text-xs font-mono text-green-600">
                          <Shield className="h-3 w-3" />
                          {log.blockchainTxId.slice(0, 12)}...
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Pending</span>
                      )}
                    </td>
                  </tr>
                  {expandedId === log.id && (
                    <tr key={`${log.id}-detail`}>
                      <td colSpan={6} className="bg-gray-50 px-8 py-4">
                        <div className="space-y-2 text-sm">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-xs font-medium text-gray-500">User ID</span>
                              <p className="font-mono text-gray-700">{log.userId}</p>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-gray-500">IP Address</span>
                              <p className="font-mono text-gray-700">{log.ipAddress || '—'}</p>
                            </div>
                          </div>
                          {log.details && (
                            <div>
                              <span className="text-xs font-medium text-gray-500">Details</span>
                              <pre className="mt-1 rounded-lg bg-gray-100 p-3 text-xs text-gray-700 overflow-x-auto">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages} ({data?.total || 0} total)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-gray-300 p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-gray-300 p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
