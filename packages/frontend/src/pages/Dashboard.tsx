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
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const PIE_COLORS = ['#3b82f6', '#ef4444', '#8b5cf6', '#22c55e', '#f97316'];

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

  const { data: monthlySummary } = useQuery({
    queryKey: ['monthly-summary'],
    queryFn: () => api.get('/reports/monthly-summary').then((r) => r.data),
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

  const chartData = (monthlySummary?.data || []).map((m: any) => ({
    month: m.month.slice(5),
    Revenue: m.revenue / 100,
    Expenses: m.expenses / 100,
  }));

  const accountsByType = (() => {
    const counts: Record<string, number> = {};
    for (const a of (accountsData?.data || [])) {
      counts[a.type] = (counts[a.type] || 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Welcome back, {user?.fullName}</p>
      </div>

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

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow-sm border">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Revenue vs Expenses</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `$${v.toLocaleString()}`} />
                <Tooltip formatter={(v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
                <Bar dataKey="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[250px] items-center justify-center text-sm text-gray-400">
              No posted transactions yet
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm border">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Account Distribution</h2>
          {accountsByType.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="60%" height={250}>
                <PieChart>
                  <Pie
                    data={accountsByType}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, value }) => `${name} (${value})`}
                    labelLine={false}
                  >
                    {accountsByType.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {accountsByType.map((item, idx) => (
                  <div key={item.name} className="flex items-center gap-2 text-sm">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                    <span className="text-gray-600">{item.name}</span>
                    <span className="font-medium text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-[250px] items-center justify-center text-sm text-gray-400">
              No accounts yet
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow-sm border">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">PIECES Analysis</h2>
          <div className="space-y-3">
            {(piecesDashboard?.dimensions || defaultPiecesDimensions).map((dim: any) => (
              <div key={dim.dimension} className="flex items-center gap-3">
                <span className="w-28 text-sm text-gray-600">{dim.label}</span>
                <div className="flex-1">
                  <div className="h-2.5 rounded-full bg-gray-100">
                    <div className="h-2.5 rounded-full bg-primary-500 transition-all" style={{ width: `${dim.score}%` }} />
                  </div>
                </div>
                <span className="w-10 text-right text-sm font-medium text-gray-900">{dim.score}%</span>
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
                    <div key={level} className={`h-6 w-6 rounded ${level <= (comp.currentScore || 0) ? 'bg-green-500' : 'bg-gray-200'}`} />
                  ))}
                </div>
                <span className="text-sm font-medium text-gray-900">{comp.currentScore || 0}/5</span>
              </div>
            ))}
          </div>
        </div>
      </div>

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
