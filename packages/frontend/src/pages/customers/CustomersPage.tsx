import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Plus, Search, X } from 'lucide-react';
import { formatCurrency, parseCurrencyInput } from '../../lib/currency';
import { useCurrencyStore } from '../../stores/currency';
import { useToastStore } from '../../stores/toast';

export function CustomersPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const { currency } = useCurrencyStore();

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      return api.get(`/customers?${params}`).then((r) => r.data);
    },
  });

  const fc = (cents: number) => formatCurrency(cents, currency);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">Manage accounts receivable contacts</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          Add Customer
        </button>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Phone</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Credit Limit</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Balance</th>
              <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">Loading...</td></tr>
            ) : (data?.data || []).length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">No customers found</td></tr>
            ) : (
              (data?.data || []).map((c: any) => (
                <tr key={c.id} className="table-row">
                  <td className="px-6 py-3 text-sm font-medium text-slate-900 dark:text-white">{c.name}</td>
                  <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-300">{c.email || '-'}</td>
                  <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-300">{c.phone || '-'}</td>
                  <td className="px-6 py-3 text-sm text-right font-mono text-slate-900 dark:text-white">{fc(c.creditLimit)}</td>
                  <td className="px-6 py-3 text-sm text-right font-mono text-slate-900 dark:text-white">{fc(c.balance)}</td>
                  <td className="px-6 py-3 text-center">
                    <span className={`badge ${c.isActive ? 'bg-success-100 dark:bg-success-900/50 text-success-700 dark:text-success-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreate && <CreateCustomerModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function CreateCustomerModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { currency } = useCurrencyStore();
  const addToast = useToastStore((s) => s.addToast);
  const [creditLimitText, setCreditLimitText] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', taxId: '', creditLimit: 0 });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/customers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      addToast('Customer added');
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Failed to create customer'),
  });

  const handleCreditLimitChange = (text: string) => {
    setCreditLimitText(text);
    setForm(prev => ({ ...prev, creditLimit: parseCurrencyInput(text, currency) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    mutation.mutate({ ...form, creditLimit: parseCurrencyInput(creditLimitText, currency) });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white font-display">Add Customer</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="error-box">{error}</div>}
          <div>
            <label className="label">Name *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" />
            </div>
          </div>
          <div>
            <label className="label">Address</label>
            <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-field" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tax ID</label>
              <input type="text" value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="label">Credit Limit ({currency})</label>
              <input type="text" inputMode="decimal" value={creditLimitText} onChange={(e) => handleCreditLimitChange(e.target.value)} className="input-field" placeholder={currency === 'IDR' ? '0' : '0.00'} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? 'Creating...' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
