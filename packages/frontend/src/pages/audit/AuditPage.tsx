import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Shield, ExternalLink } from 'lucide-react';

export function AuditPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => api.get('/audit/logs').then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
        <p className="mt-1 text-sm text-gray-500">Immutable record of all financial actions</p>
      </div>

      <div className="rounded-xl bg-white shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Timestamp</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">User</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Action</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Resource</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Blockchain Proof</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : (data?.data || []).length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No audit logs yet</td></tr>
            ) : (
              (data?.data || []).map((log: any) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-600">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-6 py-3 text-gray-900">{log.userId}</td>
                  <td className="px-6 py-3">
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono">{log.action}</span>
                  </td>
                  <td className="px-6 py-3 text-gray-600">{log.resource}/{log.resourceId}</td>
                  <td className="px-6 py-3">
                    {log.blockchainTxId ? (
                      <span className="flex items-center gap-1 text-xs font-mono text-green-600">
                        <Shield className="h-3 w-3" />
                        {log.blockchainTxId.slice(0, 16)}...
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Pending</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
