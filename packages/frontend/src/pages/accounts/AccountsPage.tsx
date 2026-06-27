import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Plus, ChevronRight, X } from 'lucide-react';

export function AccountsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['accounts-tree'],
    queryFn: () => api.get('/accounts/tree').then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Chart of Accounts</h1>
          <p className="page-subtitle">Manage your account hierarchy</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          Add Account
        </button>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading accounts...</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {(data?.data || []).map((account: any) => (
              <AccountRow key={account.id} account={account} level={0} />
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateAccountModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function AccountRow({ account, level }: { account: any; level: number }) {
  const typeColors: Record<string, string> = {
    asset: 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300',
    liability: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
    equity: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300',
    revenue: 'bg-success-100 dark:bg-success-900/50 text-success-700 dark:text-success-300',
    expense: 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300',
  };

  return (
    <>
      <div className="flex items-center gap-3 px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors" style={{ paddingLeft: `${1.5 + level * 1.5}rem` }}>
        {account.children?.length > 0 && (
          <ChevronRight className="h-4 w-4 text-slate-400" />
        )}
        <span className="font-mono text-sm text-slate-500 dark:text-slate-400">{account.code}</span>
        <span className="flex-1 text-sm font-medium text-slate-900 dark:text-white">{account.name}</span>
        <span className={`badge ${typeColors[account.type] || ''}`}>
          {account.type}
        </span>
      </div>
      {account.children?.map((child: any) => (
        <AccountRow key={child.id} account={child} level={level + 1} />
      ))}
    </>
  );
}

function CreateAccountModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ code: '', name: '', type: 'asset', parentId: '' });
  const [error, setError] = useState('');

  const { data: flatAccounts } = useQuery({
    queryKey: ['accounts-flat'],
    queryFn: () => api.get('/accounts?flat=true').then((r) => r.data),
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      api.post('/accounts', { ...data, parentId: data.parentId || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts-tree'] });
      queryClient.invalidateQueries({ queryKey: ['accounts-flat'] });
      onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to create account');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^\d{4,10}$/.test(form.code)) {
      setError('Account code must be 4-10 digits');
      return;
    }
    if (!form.name.trim()) {
      setError('Account name is required');
      return;
    }
    mutation.mutate(form);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white font-display">Create Account</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="error-box">{error}</div>}

          <div>
            <label className="label">Account Code</label>
            <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="input-field" placeholder="e.g. 1110" required />
          </div>

          <div>
            <label className="label">Account Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="e.g. Petty Cash" required />
          </div>

          <div>
            <label className="label">Account Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-field">
              <option value="asset">Asset</option>
              <option value="liability">Liability</option>
              <option value="equity">Equity</option>
              <option value="revenue">Revenue</option>
              <option value="expense">Expense</option>
            </select>
          </div>

          <div>
            <label className="label">Parent Account (optional)</label>
            <select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} className="input-field">
              <option value="">None (top-level)</option>
              {(flatAccounts?.data || []).map((a: any) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
