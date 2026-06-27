import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { BarChart3, Download, CheckCircle, AlertTriangle } from 'lucide-react';

type ReportType = 'trial-balance' | 'income-statement' | 'balance-sheet';

function formatAmount(cents: number) {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
}

export function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [periodId, setPeriodId] = useState('');

  const { data: periods } = useQuery({
    queryKey: ['fiscal-periods'],
    queryFn: () => api.get('/fiscal-periods').then((r) => r.data),
  });

  const reports = [
    { id: 'trial-balance' as const, name: 'Trial Balance', description: 'All account balances for a period' },
    { id: 'income-statement' as const, name: 'Income Statement', description: 'Revenue and expenses summary' },
    { id: 'balance-sheet' as const, name: 'Balance Sheet', description: 'Assets, liabilities, and equity' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
        <p className="mt-1 text-sm text-gray-500">Generate and view financial statements</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Fiscal Period</label>
        <select
          value={periodId}
          onChange={(e) => setPeriodId(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        >
          <option value="">Select a period...</option>
          {(periods?.data || []).map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {reports.map((report) => (
          <button
            key={report.id}
            onClick={() => setSelectedReport(report.id)}
            disabled={!periodId}
            className={`rounded-xl border p-6 text-left transition-colors disabled:opacity-50 ${
              selectedReport === report.id
                ? 'border-primary-500 bg-primary-50'
                : 'bg-white hover:border-gray-300'
            }`}
          >
            <BarChart3 className={`h-8 w-8 ${selectedReport === report.id ? 'text-primary-600' : 'text-gray-400'}`} />
            <h3 className="mt-3 font-medium text-gray-900">{report.name}</h3>
            <p className="mt-1 text-sm text-gray-500">{report.description}</p>
          </button>
        ))}
      </div>

      {selectedReport && periodId && <ReportViewer type={selectedReport} periodId={periodId} />}
    </div>
  );
}

function ReportViewer({ type, periodId }: { type: ReportType; periodId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['report', type, periodId],
    queryFn: () => api.get(`/reports/${type}`, { params: { periodId } }).then((r) => r.data),
  });

  if (isLoading) return <div className="rounded-xl bg-white p-8 text-center text-gray-500 shadow-sm border">Generating report...</div>;
  if (error) return <div className="rounded-xl bg-red-50 p-6 text-red-700 border border-red-200">Failed to generate report</div>;
  if (!data) return null;

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 capitalize">{type.replace(/-/g, ' ')}</h2>
        <span className="text-xs text-gray-400">Generated {new Date(data.generatedAt).toLocaleString()}</span>
      </div>

      {type === 'trial-balance' && <TrialBalanceTable data={data} />}
      {type === 'income-statement' && <IncomeStatementTable data={data} />}
      {type === 'balance-sheet' && <BalanceSheetTable data={data} />}
    </div>
  );
}

function TrialBalanceTable({ data }: { data: any }) {
  return (
    <div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-4 py-2.5 text-left font-medium text-gray-500">Code</th>
            <th className="px-4 py-2.5 text-left font-medium text-gray-500">Account</th>
            <th className="px-4 py-2.5 text-left font-medium text-gray-500">Type</th>
            <th className="px-4 py-2.5 text-right font-medium text-gray-500">Debit</th>
            <th className="px-4 py-2.5 text-right font-medium text-gray-500">Credit</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {(data.rows || []).length === 0 ? (
            <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No balances for this period</td></tr>
          ) : (
            (data.rows as any[]).map((row: any, idx: number) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-gray-500">{row.accountCode}</td>
                <td className="px-4 py-2 text-gray-900">{row.accountName}</td>
                <td className="px-4 py-2 capitalize text-gray-500">{row.accountType}</td>
                <td className="px-4 py-2 text-right font-mono text-gray-900">{row.debitBalance ? formatAmount(row.debitBalance) : ''}</td>
                <td className="px-4 py-2 text-right font-mono text-gray-900">{row.creditBalance ? formatAmount(row.creditBalance) : ''}</td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot className="border-t-2 border-gray-300 bg-gray-50">
          <tr className="font-semibold">
            <td colSpan={3} className="px-4 py-3 text-gray-700">Totals</td>
            <td className="px-4 py-3 text-right font-mono text-gray-900">{formatAmount(data.totalDebits || 0)}</td>
            <td className="px-4 py-3 text-right font-mono text-gray-900">{formatAmount(data.totalCredits || 0)}</td>
          </tr>
          <tr>
            <td colSpan={5} className="px-4 py-2">
              {data.isBalanced ? (
                <span className="flex items-center gap-1 text-sm text-green-600"><CheckCircle className="h-4 w-4" /> Balanced</span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-red-600"><AlertTriangle className="h-4 w-4" /> Out of balance by {formatAmount(Math.abs((data.totalDebits || 0) - (data.totalCredits || 0)))}</span>
              )}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function IncomeStatementTable({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <ReportSection title="Revenue" accounts={data.revenue?.accounts} total={data.revenue?.total} />
      <ReportSection title="Expenses" accounts={data.expenses?.accounts} total={data.expenses?.total} />
      <div className="border-t-2 border-gray-300 pt-3">
        <div className="flex justify-between px-4">
          <span className="text-base font-bold text-gray-900">Net Income</span>
          <span className={`text-base font-bold font-mono ${(data.netIncome || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {formatAmount(data.netIncome || 0)}
          </span>
        </div>
      </div>
    </div>
  );
}

function BalanceSheetTable({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <ReportSection title="Assets" accounts={data.assets?.accounts} total={data.assets?.total} />
      <ReportSection title="Liabilities" accounts={data.liabilities?.accounts} total={data.liabilities?.total} />
      <ReportSection title="Equity" accounts={data.equity?.accounts} total={data.equity?.total} />
      <div className="border-t-2 border-gray-300 pt-3 space-y-1">
        <div className="flex justify-between px-4">
          <span className="text-sm font-semibold text-gray-700">Total Assets</span>
          <span className="text-sm font-mono font-semibold text-gray-900">{formatAmount(data.totalAssets || 0)}</span>
        </div>
        <div className="flex justify-between px-4">
          <span className="text-sm font-semibold text-gray-700">Total Liabilities + Equity</span>
          <span className="text-sm font-mono font-semibold text-gray-900">{formatAmount(data.totalLiabilitiesAndEquity || 0)}</span>
        </div>
        <div className="px-4 pt-1">
          {data.isBalanced ? (
            <span className="flex items-center gap-1 text-sm text-green-600"><CheckCircle className="h-4 w-4" /> Balanced</span>
          ) : (
            <span className="flex items-center gap-1 text-sm text-red-600"><AlertTriangle className="h-4 w-4" /> Not balanced</span>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportSection({ title, accounts, total }: { title: string; accounts?: any[]; total?: number }) {
  return (
    <div>
      <h3 className="mb-2 px-4 text-sm font-semibold uppercase tracking-wider text-gray-500">{title}</h3>
      {(accounts || []).length === 0 ? (
        <p className="px-4 text-sm text-gray-400">No accounts with balances</p>
      ) : (
        <div className="space-y-1">
          {(accounts || []).map((a: any, idx: number) => (
            <div key={idx} className="flex justify-between px-4 py-1 hover:bg-gray-50 rounded">
              <span className="text-sm text-gray-700">
                <span className="font-mono text-gray-400 mr-2">{a.code}</span>
                {a.name}
              </span>
              <span className="text-sm font-mono text-gray-900">{formatAmount(a.amount || 0)}</span>
            </div>
          ))}
          <div className="flex justify-between px-4 pt-1 border-t">
            <span className="text-sm font-medium text-gray-700">Total {title}</span>
            <span className="text-sm font-mono font-medium text-gray-900">{formatAmount(total || 0)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
