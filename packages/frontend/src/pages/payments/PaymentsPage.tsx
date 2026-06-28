import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { CreditCard, X } from 'lucide-react';
import { formatCurrency, parseCurrencyInput } from '../../lib/currency';
import { useCurrencyStore } from '../../stores/currency';
import { CurrencySelector } from '../../components/CurrencySelector';

const methodLabels: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  check: 'Check',
  credit_card: 'Credit Card',
  other: 'Other',
};

export function PaymentsPage() {
  const [showRecord, setShowRecord] = useState(false);
  const { currency } = useCurrencyStore();
  const fc = (cents: number) => formatCurrency(cents, currency);

  const { data, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: () => api.get('/payments?limit=50').then((r) => r.data),
  });


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Payments</h1>
          <p className="page-subtitle">Record and track payment transactions</p>
        </div>
        <div className="flex items-center gap-3">
          <CurrencySelector />
          <button onClick={() => setShowRecord(true)} className="btn-primary">
            <CreditCard className="h-4 w-4" />
            Record Payment
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Invoice</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Method</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">Loading...</td></tr>
            ) : (data?.data || []).length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">No payments recorded yet</td></tr>
            ) : (
              (data?.data || []).map((p: any) => (
                <tr key={p.id} className="table-row">
                  <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-300">{new Date(p.date).toLocaleDateString()}</td>
                  <td className="px-6 py-3 text-sm font-mono text-slate-500 dark:text-slate-400">{p.invoiceId.slice(0, 8)}...</td>
                  <td className="px-6 py-3 text-sm text-right font-mono font-medium text-slate-900 dark:text-white">{fc(p.amount)}</td>
                  <td className="px-6 py-3 text-sm text-center">
                    <span className="badge bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {methodLabels[p.method] || p.method}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-300">{p.reference || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showRecord && <RecordPaymentModal onClose={() => setShowRecord(false)} />}
    </div>
  );
}

function RecordPaymentModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { currency } = useCurrencyStore();
  const [amountText, setAmountText] = useState('');
  const [form, setForm] = useState({
    invoiceId: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    method: 'bank_transfer',
    reference: '',
  });
  const [error, setError] = useState('');

  const { data: invoicesList } = useQuery({
    queryKey: ['invoices-unpaid'],
    queryFn: () => api.get('/invoices?limit=100').then((r) => r.data),
  });

  const unpaidInvoices = (invoicesList?.data || []).filter((i: any) => !['paid', 'cancelled'].includes(i.status));

  const mutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/payments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-summary'] });
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Failed to record payment'),
  });

  const handleAmountChange = (text: string) => {
    setAmountText(text);
    setForm(prev => ({ ...prev, amount: parseCurrencyInput(text, currency) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.invoiceId) { setError('Select an invoice'); return; }
    const amount = parseCurrencyInput(amountText, currency);
    if (amount <= 0) { setError('Amount must be positive'); return; }
    mutation.mutate({ ...form, amount });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white font-display">Record Payment</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="error-box">{error}</div>}
          <div>
            <label className="label">Invoice *</label>
            <select value={form.invoiceId} onChange={(e) => setForm({ ...form, invoiceId: e.target.value })} className="input-field" required>
              <option value="">Select invoice...</option>
              {unpaidInvoices.map((inv: any) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} — {formatCurrency(inv.totalAmount - inv.paidAmount, currency)} remaining
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Amount ({currency}) *</label>
              <input type="text" inputMode="decimal" value={amountText} onChange={(e) => handleAmountChange(e.target.value)} className="input-field" placeholder={currency === 'IDR' ? '0' : '0.00'} required />
            </div>
            <div>
              <label className="label">Date *</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input-field" required />
            </div>
          </div>
          <div>
            <label className="label">Payment Method *</label>
            <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className="input-field">
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="check">Check</option>
              <option value="credit_card">Credit Card</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Reference</label>
            <input type="text" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="input-field" placeholder="e.g. Transfer #12345" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
