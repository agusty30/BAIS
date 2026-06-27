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
          <h1 className="text-2xl font-bold text-gray-900">Chart of Accounts</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your account hierarchy</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Add Account
        </button>
      </div>

      <div className="rounded-xl bg-white shadow-sm border">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading accounts...</div>
        ) : (
          <div className="divide-y">
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
    asset: 'bg-blue-100 text-blue-700',
    liability: 'bg-red-100 text-red-700',
    equity: 'bg-purple-100 text-purple-700',
    revenue: 'bg-green-100 text-green-700',
    expense: 'bg-orange-100 text-orange-700',
  };

  return (
    <>
      <div className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50" style={{ paddingLeft: `${1.5 + level * 1.5}rem` }}>
        {account.children?.length > 0 && (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
        <span className="font-mono text-sm text-gray-500">{account.code}</span>
        <span className="flex-1 text-sm font-medium text-gray-900">{account.name}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeColors[account.type] || ''}`}>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Create Account</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Account Code</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              placeholder="e.g. 1110"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Account Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              placeholder="e.g. Petty Cash"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Account Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="asset">Asset</option>
              <option value="liability">Liability</option>
              <option value="equity">Equity</option>
              <option value="revenue">Revenue</option>
              <option value="expense">Expense</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Parent Account (optional)</label>
            <select
              value={form.parentId}
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">None (top-level)</option>
              {(flatAccounts?.data || []).map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {mutation.isPending ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
