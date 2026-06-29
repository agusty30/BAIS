import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuthStore } from '../stores/auth';
import { useCurrencyStore } from '../stores/currency';
import { formatCurrency, formatCurrencyShort } from '../lib/currency';
import { CurrencySelector } from '../components/CurrencySelector';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  FileText,
  CheckSquare,
  Shield,
  Blocks,
  Plus,
  Receipt,
  CreditCard,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell,
} from 'recharts';

const BAR_COLORS = ['#1e3a8a', '#ef4444', '#8b5cf6', '#10b981', '#f97316'];

export function Dashboard() {
  const { user } = useAuthStore();
  const { currency } = useCurrencyStore();

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
    queryKey: ['blockchain-stats'],
    queryFn: () => api.get('/blockchain/stats').then((r) => r.data),
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
    { name: 'Total Accounts', value: String(accountsData?.data?.length ?? '—'), icon: BarChart3, gradient: 'from-primary-600 to-primary-800' },
    { name: 'Journal Entries', value: String(journalData?.data?.length ?? '—'), icon: FileText, gradient: 'from-success-500 to-success-700' },
    { name: 'Pending Approvals', value: String(approvalsData?.data?.length ?? '—'), icon: CheckSquare, gradient: 'from-amber-500 to-amber-700' },
    { name: 'Blockchain Blocks', value: String(verifyData?.latestBlock ?? '—'), icon: Blocks, gradient: 'from-purple-500 to-purple-700' },
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.fullName}</p>
        </div>
        <CurrencySelector />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="card p-6">
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${stat.gradient}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{stat.name}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/journal" className="card p-4 flex items-center gap-3 hover:border-primary-300 dark:hover:border-primary-700 transition-colors group">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/50 group-hover:bg-primary-200 dark:group-hover:bg-primary-900/80 transition-colors">
            <Plus className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">New Journal Entry</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Create financial entry</p>
          </div>
        </Link>
        <Link to="/invoices" className="card p-4 flex items-center gap-3 hover:border-primary-300 dark:hover:border-primary-700 transition-colors group">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50 group-hover:bg-amber-200 dark:group-hover:bg-amber-900/80 transition-colors">
            <Receipt className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">New Invoice</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Create AR/AP invoice</p>
          </div>
        </Link>
        <Link to="/payments" className="card p-4 flex items-center gap-3 hover:border-primary-300 dark:hover:border-primary-700 transition-colors group">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-100 dark:bg-success-900/50 group-hover:bg-success-200 dark:group-hover:bg-success-900/80 transition-colors">
            <CreditCard className="h-5 w-5 text-success-600 dark:text-success-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">Record Payment</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Log a payment</p>
          </div>
        </Link>
        <div className="card p-4 flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${verifyData?.chainValid !== false ? 'bg-success-100 dark:bg-success-900/50' : 'bg-red-100 dark:bg-red-900/50'}`}>
            {verifyData?.chainValid !== false ? (
              <CheckCircle className="h-5 w-5 text-success-600 dark:text-success-400" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">Blockchain Health</p>
            <p className={`text-xs font-medium ${verifyData?.chainValid !== false ? 'text-success-600 dark:text-success-400' : 'text-red-600 dark:text-red-400'}`}>
              {verifyData?.chainValid !== false ? 'Chain Verified' : 'Integrity Issue'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white font-display">Revenue vs Expenses</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v: number) => formatCurrencyShort(v * 100, currency)} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--tooltip-bg, #fff)', border: '1px solid var(--tooltip-border, #e2e8f0)', borderRadius: '8px', fontSize: '13px' }}
                  formatter={(v: number) => formatCurrency(v * 100, currency)}
                />
                <Bar dataKey="Revenue" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[250px] flex-col items-center justify-center text-sm text-slate-400">
              <FileText className="h-8 w-8 mb-2 text-slate-300 dark:text-slate-600" />
              <p>No posted transactions yet</p>
              <Link to="/journal" className="mt-2 text-xs text-primary-600 dark:text-primary-400 hover:underline">Create a journal entry</Link>
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white font-display">Account Distribution</h2>
          {accountsByType.length > 0 ? (
            <div className="flex flex-col justify-center h-[250px]">
              <ResponsiveContainer width="100%" height={accountsByType.length * 44 + 20}>
                <BarChart data={accountsByType} layout="vertical" margin={{ left: 0, right: 30, top: 5, bottom: 5 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={90}
                    tick={{ fontSize: 13, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--tooltip-bg, #fff)', border: '1px solid var(--tooltip-border, #e2e8f0)', borderRadius: '8px', fontSize: '13px' }}
                    formatter={(v: number) => [`${v} accounts`, 'Count']}
                    cursor={{ fill: 'rgba(100,116,139,0.08)' }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
                    {accountsByType.map((_, idx) => (
                      <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[250px] flex-col items-center justify-center text-sm text-slate-400">
              <BarChart3 className="h-8 w-8 mb-2 text-slate-300 dark:text-slate-600" />
              <p>No accounts yet</p>
              <Link to="/accounts" className="mt-2 text-xs text-primary-600 dark:text-primary-400 hover:underline">Set up chart of accounts</Link>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white font-display">PIECES Analysis</h2>
          <div className="space-y-3">
            {(piecesDashboard?.dimensions || defaultPiecesDimensions).map((dim: any) => (
              <div key={dim.dimension} className="flex items-center gap-3">
                <span className="w-28 text-sm text-slate-600 dark:text-slate-400">{dim.label}</span>
                <div className="flex-1">
                  <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-2.5 rounded-full bg-success-500 transition-all" style={{ width: `${dim.score}%` }} />
                  </div>
                </div>
                <span className="w-10 text-right text-sm font-medium text-slate-900 dark:text-white">{dim.score}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white font-display">COSO Internal Controls</h2>
          <div className="space-y-3">
            {(cosoMatrix?.components || defaultCOSOComponents).map((comp: any) => (
              <div key={comp.component} className="flex items-center gap-3">
                <span className="w-40 text-sm text-slate-600 dark:text-slate-400">{comp.label}</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div key={level} className={`h-6 w-6 rounded ${level <= (comp.currentScore || 0) ? 'bg-success-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                  ))}
                </div>
                <span className="text-sm font-medium text-slate-900 dark:text-white">{comp.currentScore || 0}/5</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white font-display">Recent Activity</h2>
        <div className="space-y-3">
          {(auditData?.data || []).length > 0 ? (
            (auditData.data as any[]).map((log: any) => (
              <div key={log.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <Shield className="h-4 w-4 text-slate-400" />
                <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 rounded px-1 py-0.5 mr-1">{log.action}</span>
                  {log.resource}{log.resourceId ? `/${log.resourceId.slice(0, 8)}` : ''}
                </span>
                <span className="text-xs text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400">No recent activity</p>
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
