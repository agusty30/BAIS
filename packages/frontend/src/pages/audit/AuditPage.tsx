import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Shield, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

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
        <h1 className="page-title">Audit Trail</h1>
        <p className="page-subtitle">Immutable record of all financial actions</p>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Action</label>
            <input type="text" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} placeholder="e.g. journal.create" className="input-field w-44" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Resource</label>
            <input type="text" value={resource} onChange={(e) => { setResource(e.target.value); setPage(1); }} placeholder="e.g. journal_entry" className="input-field w-44" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">From</label>
            <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">To</label>
            <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} className="input-field" />
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="btn-secondary !py-2">Clear</button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="table-header sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 w-8" />
                <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">Timestamp</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">User</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">Action</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">Resource</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">Blockchain</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No audit logs found</td></tr>
              ) : (
                logs.map((log: any) => (
                  <>
                    <tr key={log.id} className="table-row cursor-pointer" onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
                      <td className="px-4 py-3">
                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${expandedId === log.id ? 'rotate-180' : ''}`} />
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-900 dark:text-white">{log.userName || log.userId?.slice(0, 8)}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-mono text-slate-700 dark:text-slate-300">{log.action}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {log.resource}
                        {log.resourceId && <span className="text-slate-400 dark:text-slate-500">/{log.resourceId.slice(0, 8)}</span>}
                      </td>
                      <td className="px-4 py-3">
                        {log.blockchainTxId ? (
                          <span className="flex items-center gap-1 text-xs font-mono text-success-600 dark:text-success-400">
                            <Shield className="h-3 w-3" />
                            {log.blockchainTxId.slice(0, 12)}...
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Pending</span>
                        )}
                      </td>
                    </tr>
                    {expandedId === log.id && (
                      <tr key={`${log.id}-detail`}>
                        <td colSpan={6} className="bg-slate-50 dark:bg-slate-800/50 px-8 py-4">
                          <div className="space-y-2 text-sm">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">User ID</span>
                                <p className="font-mono text-slate-700 dark:text-slate-300">{log.userId}</p>
                              </div>
                              <div>
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">IP Address</span>
                                <p className="font-mono text-slate-700 dark:text-slate-300">{log.ipAddress || '—'}</p>
                              </div>
                            </div>
                            {log.details?.oldValues && log.details?.newValues && (
                              <div>
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Changes</span>
                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
                                  <div className="grid grid-cols-3 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 font-medium text-slate-500 dark:text-slate-400">
                                    <span>Field</span><span>Old</span><span>New</span>
                                  </div>
                                  {(() => {
                                    const allKeys = new Set([
                                      ...Object.keys(log.details.oldValues || {}),
                                      ...Object.keys(log.details.newValues || {}),
                                    ]);
                                    return Array.from(allKeys).map((key) => {
                                      const oldVal = log.details.oldValues?.[key];
                                      const newVal = log.details.newValues?.[key];
                                      const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal);
                                      return (
                                        <div key={key} className={`grid grid-cols-3 px-3 py-1.5 border-t border-slate-200 dark:border-slate-700 ${changed ? 'bg-amber-50 dark:bg-amber-950/20' : ''}`}>
                                          <span className="font-medium text-slate-700 dark:text-slate-300">{key}</span>
                                          <span className={`font-mono ${changed ? 'text-red-600 dark:text-red-400 line-through' : 'text-slate-500 dark:text-slate-400'}`}>
                                            {oldVal !== undefined ? (typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal)) : '—'}
                                          </span>
                                          <span className={`font-mono ${changed ? 'text-success-600 dark:text-success-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                            {newVal !== undefined ? (typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal)) : '—'}
                                          </span>
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>
                              </div>
                            )}
                            {log.details && !log.details.oldValues && !log.details.newValues && (
                              <div>
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Details</span>
                                <pre className="mt-1 rounded-lg bg-slate-100 dark:bg-slate-900 p-3 text-xs text-slate-700 dark:text-slate-300 overflow-x-auto border border-slate-200 dark:border-slate-700">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.details?.newValues && !log.details?.oldValues && (
                              <div>
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Created Values</span>
                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
                                  {Object.entries(log.details.newValues).map(([key, val]: [string, any]) => (
                                    <div key={key} className="grid grid-cols-2 px-3 py-1.5 border-t border-slate-200 dark:border-slate-700 first:border-t-0">
                                      <span className="font-medium text-slate-700 dark:text-slate-300">{key}</span>
                                      <span className="font-mono text-success-600 dark:text-success-400">
                                        {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
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
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 px-4 py-3">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Page {page} of {totalPages} ({data?.total || 0} total)
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
    </div>
  );
}
