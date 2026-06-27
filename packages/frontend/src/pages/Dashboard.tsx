import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuthStore } from '../stores/auth';
import {
  BarChart3,
  FileText,
  CheckSquare,
  Shield,
  Blocks,
} from 'lucide-react';

export function Dashboard() {
  const { user } = useAuthStore();

  const { data: accountsData } = useQuery({
    queryKey: ['accounts-flat'],
    queryFn: () => api.get('/accounts?flat=true').then((r) => r.data),
  });

  const { data: journalData } = useQuery({
    queryKey: ['journal-entries'],
    queryFn: () => api.get('/journal-entries').then((r) => r.data),
  });

  const { data: approvalsData } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: () => api.get('/workflows/pending').then((r) => r.data),
  });

  const { data: verifyData } = useQuery({
    queryKey: ['blockchain-verify'],
    queryFn: () => api.get('/reports/verify').then((r) => r.data),
  });

  const { data: piecesDashboard } = useQuery({
    queryKey: ['pieces-dashboard'],
    queryFn: () => api.get('/pieces/dashboard').then((r) => r.data),
  });

  const { data: cosoMatrix } = useQuery({
    queryKey: ['coso-matrix'],
    queryFn: () => api.get('/coso/matrix').then((r) => r.data),
  });

  const { data: auditData } = useQuery({
    queryKey: ['audit-recent'],
    queryFn: () => api.get('/audit/logs?limit=5').then((r) => r.data),
  });

  const stats = [
    { name: 'Total Accounts', value: String(accountsData?.data?.length ?? '—'), icon: BarChart3, color: 'bg-blue-500' },
    { name: 'Journal Entries', value: String(journalData?.data?.length ?? '—'), icon: FileText, color: 'bg-green-500' },
    { name: 'Pending Approvals', value: String(approvalsData?.data?.length ?? '—'), icon: CheckSquare, color: 'bg-yellow-500' },
    { name: 'Blockchain Blocks', value: String(verifyData?.latestBlock ?? '—'), icon: Blocks, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Welcome back, {user?.fullName}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="rounded-xl bg-white p-6 shadow-sm border">
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.name}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* PIECES + COSO Overview */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow-sm border">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">PIECES Analysis</h2>
          <div className="space-y-3">
            {(piecesDashboard?.dimensions || defaultPiecesDimensions).map((dim: any) => (
              <div key={dim.dimension} className="flex items-center gap-3">
                <span className="w-28 text-sm text-gray-600">{dim.label}</span>
                <div className="flex-1">
                  <div className="h-2.5 rounded-full bg-gray-100">
                    <div
                      className="h-2.5 rounded-full bg-primary-500 transition-all"
                      style={{ width: `${dim.score}%` }}
                    />
                  </div>
                </div>
                <span className="w-10 text-right text-sm font-medium text-gray-900">
                  {dim.score}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm border">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">COSO Internal Controls</h2>
          <div className="space-y-3">
            {(cosoMatrix?.components || defaultCOSOComponents).map((comp: any) => (
              <div key={comp.component} className="flex items-center gap-3">
                <span className="w-40 text-sm text-gray-600">{comp.label}</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-6 w-6 rounded ${
                        level <= (comp.currentScore || 0)
                          ? 'bg-green-500'
                          : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {comp.currentScore || 0}/5
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl bg-white p-6 shadow-sm border">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Activity</h2>
        <div className="space-y-3">
          {(auditData?.data || []).length > 0 ? (
            (auditData.data as any[]).map((log: any) => (
              <div key={log.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50">
                <Shield className="h-4 w-4 text-gray-400" />
                <span className="flex-1 text-sm text-gray-700">
                  <span className="font-mono text-xs bg-gray-100 rounded px-1 py-0.5 mr-1">{log.action}</span>
                  {log.resource}{log.resourceId ? `/${log.resourceId.slice(0, 8)}` : ''}
                </span>
                <span className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleString()}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
}

const defaultPiecesDimensions = [
  { dimension: 'performance', label: 'Performance', score: 0 },
  { dimension: 'information', label: 'Information', score: 0 },
  { dimension: 'economics', label: 'Economics', score: 0 },
  { dimension: 'control', label: 'Control', score: 0 },
  { dimension: 'efficiency', label: 'Efficiency', score: 0 },
  { dimension: 'service', label: 'Service', score: 0 },
];

const defaultCOSOComponents = [
  { component: 'control_environment', label: 'Control Environment', currentScore: 0 },
  { component: 'risk_assessment', label: 'Risk Assessment', currentScore: 0 },
  { component: 'control_activities', label: 'Control Activities', currentScore: 0 },
  { component: 'information_communication', label: 'Information & Comm.', currentScore: 0 },
  { component: 'monitoring', label: 'Monitoring', currentScore: 0 },
];
