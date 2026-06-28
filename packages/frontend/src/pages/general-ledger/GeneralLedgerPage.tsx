import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { BookOpenCheck, Download } from 'lucide-react';
import { formatCurrency } from '../../lib/currency';
import { useCurrencyStore } from '../../stores/currency';
import { CurrencySelector } from '../../components/CurrencySelector';

export function GeneralLedgerPage() {
  const [accountId, setAccountId] = useState('');
  const [periodId, setPeriodId] = useState('');
  const { currency } = useCurrencyStore();

  const { data: accounts } = useQuery({
    queryKey: ['accounts-flat'],
    queryFn: () => api.get('/accounts?flat=true').then((r) => r.data),
  });

  const { data: periods } = useQuery({
    queryKey: ['fiscal-periods'],
    queryFn: () => api.get('/fiscal-periods').then((r) => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['general-ledger', accountId, periodId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (accountId) params.set('accountId', accountId);
      if (periodId) params.set('periodId', periodId);
      params.set('limit', '100');
      return api.get(`/general-ledger?${params}`).then((r) => r.data);
    },
  });

  const fc = (cents: number) => formatCurrency(cents, currency);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">General Ledger</h1>
          <p className="page-subtitle">Complete record of all financial transactions</p>
        </div>
        <div className="flex items-center gap-3">
          <CurrencySelector />
          <BookOpenCheck className="h-5 w-5 text-primary-500" />
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {data?.total || 0} entries
          </span>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="label">Account</label>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="input-field">
              <option value="">All Accounts</option>
              {(accounts?.data || []).map((a: any) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="label">Fiscal Period</label>
            <select value={periodId} onChange={(e) => setPeriodId(e.target.value)} className="input-field">
              <option value="">All Periods</option>
              {(periods?.data || []).map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Entry #</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Account</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Debit</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Credit</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">Loading...</td></tr>
            ) : (data?.data || []).length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">No ledger entries found</td></tr>
            ) : (
              (data?.data || []).map((entry: any) => (
                <tr key={entry.id} className="table-row">
                  <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {new Date(entry.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3 text-sm font-mono text-slate-500 dark:text-slate-400">{entry.entryNumber}</td>
                  <td className="px-6 py-3 text-sm">
                    <span className="font-mono text-slate-500 dark:text-slate-400">{entry.accountCode}</span>
                    <span className="ml-2 text-slate-900 dark:text-white">{entry.accountName}</span>
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-300 max-w-[200px] truncate">{entry.description}</td>
                  <td className="px-6 py-3 text-sm text-right font-mono text-slate-900 dark:text-white">{fc(entry.debitAmount)}</td>
                  <td className="px-6 py-3 text-sm text-right font-mono text-slate-900 dark:text-white">{fc(entry.creditAmount)}</td>
                  <td className="px-6 py-3 text-sm text-right font-mono font-medium text-slate-900 dark:text-white">{fc(entry.runningBalance)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
