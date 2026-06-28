import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Plus, X, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '../../lib/currency';
import { useCurrencyStore } from '../../stores/currency';
import { CurrencySelector } from '../../components/CurrencySelector';

export function BudgetPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [periodId, setPeriodId] = useState('');
  const { currency } = useCurrencyStore();
  const fc = (cents: number) => formatCurrency(cents, currency);

  const { data: periods } = useQuery({
    queryKey: ['fiscal-periods'],
    queryFn: () => api.get('/fiscal-periods').then((r) => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['budget', periodId],
    queryFn: () => {
      const params = periodId ? `?periodId=${periodId}` : '';
      return api.get(`/budget${params}`).then((r) => r.data);
    },
  });

  const { data: summary } = useQuery({
    queryKey: ['budget-summary', periodId],
    queryFn: () => {
      const params = periodId ? `?periodId=${periodId}` : '';
      return api.get(`/budget/summary${params}`).then((r) => r.data);
    },
  });

  const utilizationPct = summary?.totalBudget ? Math.round((summary.totalActual / summary.totalBudget) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Budget Management</h1>
          <p className="page-subtitle">Plan and track budget allocations</p>
        </div>
        <div className="flex items-center gap-3">
          <CurrencySelector />
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="h-4 w-4" />
            Set Budget
          </button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Budget</div>
            <div className="mt-1 text-xl font-bold text-slate-900 dark:text-white font-display">{fc(summary.totalBudget)}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Actual Spend</div>
            <div className="mt-1 text-xl font-bold text-slate-900 dark:text-white font-display">{fc(summary.totalActual)}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Variance</div>
            <div className={`mt-1 text-xl font-bold font-display flex items-center gap-1 ${summary.totalVariance >= 0 ? 'text-success-600 dark:text-success-400' : 'text-red-600 dark:text-red-400'}`}>
              {summary.totalVariance >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {fc(Math.abs(summary.totalVariance))}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Utilization</div>
            <div className="mt-1 text-xl font-bold text-slate-900 dark:text-white font-display">{utilizationPct}%</div>
            <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${utilizationPct > 100 ? 'bg-red-500' : utilizationPct > 80 ? 'bg-amber-500' : 'bg-success-500'}`}
                style={{ width: `${Math.min(utilizationPct, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="card p-4">
        <label className="label">Fiscal Period</label>
        <select value={periodId} onChange={(e) => setPeriodId(e.target.value)} className="input-field max-w-xs">
          <option value="">All Periods</option>
          {(periods?.data || []).map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Account</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Period</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Budget</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Actual</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Variance</th>
              <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Usage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">Loading...</td></tr>
            ) : (data?.data || []).length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">No budget items found</td></tr>
            ) : (
              (data?.data || []).map((item: any) => {
                const pct = item.budgetAmount ? Math.round((item.actualAmount / item.budgetAmount) * 100) : 0;
                return (
                  <tr key={item.id} className="table-row">
                    <td className="px-6 py-3 text-sm">
                      <span className="font-mono text-slate-500 dark:text-slate-400">{item.accountCode}</span>
                      <span className="ml-2 text-slate-900 dark:text-white">{item.accountName}</span>
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-300">{item.periodName}</td>
                    <td className="px-6 py-3 text-sm text-right font-mono text-slate-900 dark:text-white">{fc(item.budgetAmount)}</td>
                    <td className="px-6 py-3 text-sm text-right font-mono text-slate-900 dark:text-white">{fc(item.actualAmount)}</td>
                    <td className={`px-6 py-3 text-sm text-right font-mono ${item.variance >= 0 ? 'text-success-600 dark:text-success-400' : 'text-red-600 dark:text-red-400'}`}>
                      {fc(Math.abs(item.variance))}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${pct > 100 ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-success-500'}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 w-8 text-right">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showCreate && <SetBudgetModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function SetBudgetModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ accountId: '', fiscalPeriodId: '', budgetAmount: 0, notes: '' });
  const [error, setError] = useState('');

  const { data: accounts } = useQuery({
    queryKey: ['accounts-flat'],
    queryFn: () => api.get('/accounts?flat=true').then((r) => r.data),
  });

  const { data: periods } = useQuery({
    queryKey: ['fiscal-periods'],
    queryFn: () => api.get('/fiscal-periods').then((r) => r.data),
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/budget', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget'] });
      queryClient.invalidateQueries({ queryKey: ['budget-summary'] });
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Failed to set budget'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.accountId || !form.fiscalPeriodId) { setError('Account and period are required'); return; }
    mutation.mutate(form);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white font-display">Set Budget</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="error-box">{error}</div>}
          <div>
            <label className="label">Account *</label>
            <select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })} className="input-field" required>
              <option value="">Select account...</option>
              {(accounts?.data || []).map((a: any) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Fiscal Period *</label>
            <select value={form.fiscalPeriodId} onChange={(e) => setForm({ ...form, fiscalPeriodId: e.target.value })} className="input-field" required>
              <option value="">Select period...</option>
              {(periods?.data || []).map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Budget Amount (cents) *</label>
            <input type="number" value={form.budgetAmount} onChange={(e) => setForm({ ...form, budgetAmount: Number(e.target.value) })} className="input-field" min={0} required />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field" rows={2} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? 'Saving...' : 'Set Budget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
