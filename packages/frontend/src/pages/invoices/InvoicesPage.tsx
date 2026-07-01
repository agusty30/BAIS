import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { Plus, FileText, X, Pencil, Copy, Check, Send } from 'lucide-react';
import { formatCurrency, parseCurrencyInput } from '../../lib/currency';
import { useCurrencyStore } from '../../stores/currency';
import { CurrencySelector } from '../../components/CurrencySelector';
import { useToastStore } from '../../stores/toast';

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  sent: 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300',
  partially_paid: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
  paid: 'bg-success-100 dark:bg-success-900/50 text-success-700 dark:text-success-300',
  overdue: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
  cancelled: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500',
};

export function InvoicesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [amendingInvoice, setAmendingInvoice] = useState<any>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { currency } = useCurrencyStore();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const fc = (cents: number) => formatCurrency(cents, currency);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/invoices/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-summary'] });
      addToast(t('invoices.statusUpdated'), 'success');
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Status update failed', 'error'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', typeFilter, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      return api.get(`/invoices?${params}`).then((r) => r.data);
    },
  });

  const { data: arApSummary } = useQuery({
    queryKey: ['invoices-summary'],
    queryFn: () => api.get('/invoices/summary/ar-ap').then((r) => r.data),
  });


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">Accounts receivable and payable</p>
        </div>
        <div className="flex items-center gap-3">
          <CurrencySelector />
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="h-4 w-4" />
            New Invoice
          </button>
        </div>
      </div>

      {arApSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-4">
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Accounts Receivable</div>
            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white font-display">
              {fc(arApSummary.receivable?.totalOutstanding || 0)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{arApSummary.receivable?.count || 0} outstanding invoices</div>
          </div>
          <div className="card p-4">
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Accounts Payable</div>
            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white font-display">
              {fc(arApSummary.payable?.totalOutstanding || 0)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{arApSummary.payable?.count || 0} outstanding invoices</div>
          </div>
        </div>
      )}

      <div className="card p-4">
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[150px]">
            <label className="label">Type</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input-field">
              <option value="">All</option>
              <option value="receivable">Receivable (AR)</option>
              <option value="payable">Payable (AP)</option>
            </select>
          </div>
          <div className="min-w-[150px]">
            <label className="label">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field">
              <option value="">All</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Invoice #</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Due Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Paid</th>
              <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr><td colSpan={9} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">Loading...</td></tr>
            ) : (data?.data || []).length === 0 ? (
              <tr><td colSpan={9} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">No invoices found</td></tr>
            ) : (
              (data?.data || []).map((inv: any) => (
                <tr key={inv.id} className="table-row">
                  <td className="px-6 py-3 text-sm font-mono font-medium text-slate-900 dark:text-white">
                    {inv.invoiceNumber}
                    {inv.amendedFromId && <span className="ml-1 text-xs text-amber-500" title="Amendment">A</span>}
                  </td>
                  <td className="px-6 py-3 text-sm">
                    <span className={`badge ${inv.type === 'receivable' ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300' : 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300'}`}>
                      {inv.type === 'receivable' ? 'AR' : 'AP'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-300">{new Date(inv.date).toLocaleDateString()}</td>
                  <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-300">{new Date(inv.dueDate).toLocaleDateString()}</td>
                  <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-300 max-w-[200px] truncate">{inv.description}</td>
                  <td className="px-6 py-3 text-sm text-right font-mono text-slate-900 dark:text-white">{fc(inv.totalAmount)}</td>
                  <td className="px-6 py-3 text-sm text-right font-mono text-slate-900 dark:text-white">{fc(inv.paidAmount)}</td>
                  <td className="px-6 py-3 text-center">
                    <span className={`badge ${statusColors[inv.status] || ''}`}>{inv.status.replace('_', ' ')}</span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {inv.status === 'draft' && (
                        <>
                          <button onClick={() => setEditingInvoice(inv)} className="rounded p-1.5 text-slate-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950/30 transition-colors" title={t('common.edit')}>
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => statusMutation.mutate({ id: inv.id, status: 'sent' })} className="rounded p-1.5 text-slate-400 hover:text-success-500 hover:bg-success-50 dark:hover:bg-success-950/30 transition-colors" title={t('invoices.send')}>
                            <Send className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {inv.status !== 'draft' && inv.status !== 'cancelled' && (
                        <button onClick={() => setAmendingInvoice(inv)} className="rounded p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors" title={t('invoices.amend')}>
                          <Copy className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreate && <CreateInvoiceModal onClose={() => setShowCreate(false)} />}
      {editingInvoice && <EditInvoiceModal invoice={editingInvoice} onClose={() => setEditingInvoice(null)} />}
      {amendingInvoice && <AmendInvoiceModal invoice={amendingInvoice} onClose={() => setAmendingInvoice(null)} />}
    </div>
  );
}

function CreateInvoiceModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { currency } = useCurrencyStore();
  const addToast = useToastStore((s) => s.addToast);
  const [amountText, setAmountText] = useState('');
  const [form, setForm] = useState({
    type: 'receivable' as 'receivable' | 'payable',
    customerId: '',
    vendorId: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    totalAmount: 0,
    description: '',
  });
  const [error, setError] = useState('');

  const { data: customersList } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers').then((r) => r.data),
  });

  const { data: vendorsList } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => api.get('/vendors').then((r) => r.data),
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/invoices', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-summary'] });
      addToast('Invoice created');
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Failed to create invoice'),
  });

  const handleAmountChange = (text: string) => {
    setAmountText(text);
    setForm(prev => ({ ...prev, totalAmount: parseCurrencyInput(text, currency) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const totalAmount = parseCurrencyInput(amountText, currency);
    if (totalAmount <= 0) { setError('Amount must be greater than 0'); return; }
    const payload: any = {
      type: form.type,
      date: form.date,
      dueDate: form.dueDate,
      totalAmount,
      description: form.description,
    };
    if (form.type === 'receivable') payload.customerId = form.customerId || null;
    else payload.vendorId = form.vendorId || null;
    mutation.mutate(payload);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white font-display">New Invoice</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="error-box">{error}</div>}
          <div>
            <label className="label">Type *</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })} className="input-field">
              <option value="receivable">Receivable (AR)</option>
              <option value="payable">Payable (AP)</option>
            </select>
          </div>
          {form.type === 'receivable' ? (
            <div>
              <label className="label">Customer</label>
              <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} className="input-field">
                <option value="">Select customer...</option>
                {(customersList?.data || []).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="label">Vendor</label>
              <select value={form.vendorId} onChange={(e) => setForm({ ...form, vendorId: e.target.value })} className="input-field">
                <option value="">Select vendor...</option>
                {(vendorsList?.data || []).map((v: any) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date *</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="label">Due Date *</label>
              <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="input-field" required />
            </div>
          </div>
          <div>
            <label className="label">Amount ({currency}) *</label>
            <input type="text" inputMode="decimal" value={amountText} onChange={(e) => handleAmountChange(e.target.value)} className="input-field" placeholder={currency === 'IDR' ? '0' : '0.00'} required />
          </div>
          <div>
            <label className="label">Description *</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} required />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditInvoiceModal({ invoice, onClose }: { invoice: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { currency } = useCurrencyStore();
  const { t } = useTranslation();
  const addToast = useToastStore((s) => s.addToast);
  const [amountText, setAmountText] = useState(formatCurrency(invoice.totalAmount, currency).replace(/[^\d.,]/g, ''));
  const [form, setForm] = useState({
    date: new Date(invoice.date).toISOString().split('T')[0],
    dueDate: new Date(invoice.dueDate).toISOString().split('T')[0],
    description: invoice.description || '',
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (data: any) => api.put(`/invoices/${invoice.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-summary'] });
      addToast(t('invoices.updated'), 'success');
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Failed to update'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const totalAmount = parseCurrencyInput(amountText, currency);
    if (totalAmount <= 0) { setError('Amount must be greater than 0'); return; }
    mutation.mutate({
      date: form.date,
      dueDate: form.dueDate,
      totalAmount,
      description: form.description,
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white font-display">{t('invoices.editInvoice')}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X className="h-5 w-5" /></button>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 font-mono">{invoice.invoiceNumber}</p>
        {error && <div className="error-box mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t('common.date')} *</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="label">{t('invoices.dueDate')} *</label>
              <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="input-field" required />
            </div>
          </div>
          <div>
            <label className="label">{t('common.amount')} ({currency}) *</label>
            <input type="text" inputMode="decimal" value={amountText} onChange={(e) => setAmountText(e.target.value)} className="input-field" required />
          </div>
          <div>
            <label className="label">{t('common.description')} *</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} required />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">{t('common.cancel')}</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              <Check className="h-4 w-4" />
              {mutation.isPending ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AmendInvoiceModal({ invoice, onClose }: { invoice: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { currency } = useCurrencyStore();
  const { t } = useTranslation();
  const addToast = useToastStore((s) => s.addToast);
  const [amountText, setAmountText] = useState(formatCurrency(invoice.totalAmount, currency).replace(/[^\d.,]/g, ''));
  const [form, setForm] = useState({
    dueDate: new Date(invoice.dueDate).toISOString().split('T')[0],
    reason: '',
    description: '',
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (data: any) => api.post(`/invoices/${invoice.id}/amend`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-summary'] });
      addToast(t('invoices.amended'), 'success');
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Failed to amend'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const totalAmount = parseCurrencyInput(amountText, currency);
    if (totalAmount <= 0) { setError('Amount must be greater than 0'); return; }
    mutation.mutate({
      totalAmount,
      dueDate: form.dueDate,
      reason: form.reason || undefined,
      description: form.description || undefined,
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white font-display">{t('invoices.amendInvoice')}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X className="h-5 w-5" /></button>
        </div>
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 mb-4 text-sm text-amber-700 dark:text-amber-300">
          {t('invoices.amendWarning', { number: invoice.invoiceNumber })}
        </div>
        {error && <div className="error-box mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">{t('invoices.newAmount')} ({currency}) *</label>
            <input type="text" inputMode="decimal" value={amountText} onChange={(e) => setAmountText(e.target.value)} className="input-field" required />
          </div>
          <div>
            <label className="label">{t('invoices.newDueDate')}</label>
            <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="label">{t('invoices.reason')}</label>
            <input type="text" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="input-field" placeholder="e.g. Price adjustment, quantity change" />
          </div>
          <div>
            <label className="label">{t('common.description')}</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} placeholder="Optional new description" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">{t('common.cancel')}</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              <Copy className="h-4 w-4" />
              {mutation.isPending ? t('common.loading') : t('invoices.createAmendment')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
