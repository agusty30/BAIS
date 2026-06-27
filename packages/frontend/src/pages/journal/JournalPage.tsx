import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { FileText, Plus, X, Send, CheckCircle, Trash2 } from 'lucide-react';

export function JournalPage() {
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['journal-entries'],
    queryFn: () => api.get('/journal-entries').then((r) => r.data),
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => api.post(`/journal-entries/${id}/submit`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['journal-entries'] }),
  });

  const postMutation = useMutation({
    mutationFn: (id: string) => api.post(`/journal-entries/${id}/post`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['journal-entries'] }),
  });

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    pending_approval: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-blue-100 text-blue-700',
    posted: 'bg-green-100 text-green-700',
    voided: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Journal Entries</h1>
          <p className="mt-1 text-sm text-gray-500">Create and manage journal entries</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          New Entry
        </button>
      </div>

      <div className="rounded-xl bg-white shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Entry #</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Date</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Description</th>
              <th className="px-6 py-3 text-right font-medium text-gray-500">Amount</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Blockchain</th>
              <th className="px-6 py-3 text-right font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : (data?.data || []).length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No journal entries yet</td></tr>
            ) : (
              (data?.data || []).map((entry: any) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-mono text-gray-900">{entry.entryNumber}</td>
                  <td className="px-6 py-3 text-gray-600">{new Date(entry.date).toLocaleDateString()}</td>
                  <td className="px-6 py-3 text-gray-900">{entry.description}</td>
                  <td className="px-6 py-3 text-right font-mono text-gray-900">
                    ${(entry.totalAmount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[entry.status] || ''}`}>
                      {entry.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    {entry.blockchainTxId ? (
                      <span className="text-xs font-mono text-green-600">{entry.blockchainTxId.slice(0, 12)}...</span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right">
                    {entry.status === 'draft' && (
                      <button
                        onClick={() => submitMutation.mutate(entry.id)}
                        disabled={submitMutation.isPending}
                        className="inline-flex items-center gap-1 rounded bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-700 hover:bg-yellow-100"
                      >
                        <Send className="h-3 w-3" /> Submit
                      </button>
                    )}
                    {entry.status === 'approved' && (
                      <button
                        onClick={() => postMutation.mutate(entry.id)}
                        disabled={postMutation.isPending}
                        className="inline-flex items-center gap-1 rounded bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                      >
                        <CheckCircle className="h-3 w-3" /> Post
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreate && <CreateJournalEntryModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

interface JournalLine {
  accountId: string;
  debitAmount: number;
  creditAmount: number;
  description: string;
}

function CreateJournalEntryModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: '',
    reference: '',
    fiscalPeriodId: '',
  });
  const [lines, setLines] = useState<JournalLine[]>([
    { accountId: '', debitAmount: 0, creditAmount: 0, description: '' },
    { accountId: '', debitAmount: 0, creditAmount: 0, description: '' },
  ]);

  const { data: accounts } = useQuery({
    queryKey: ['accounts-flat'],
    queryFn: () => api.get('/accounts?flat=true').then((r) => r.data),
  });

  const { data: periods } = useQuery({
    queryKey: ['fiscal-periods'],
    queryFn: () => api.get('/fiscal-periods').then((r) => r.data),
  });

  const mutation = useMutation({
    mutationFn: (payload: any) => api.post('/journal-entries', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to create journal entry');
    },
  });

  const totalDebit = lines.reduce((sum, l) => sum + l.debitAmount, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.creditAmount, 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const addLine = () => setLines([...lines, { accountId: '', debitAmount: 0, creditAmount: 0, description: '' }]);
  const removeLine = (idx: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, field: keyof JournalLine, value: any) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: value };
    setLines(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.fiscalPeriodId) { setError('Select a fiscal period'); return; }
    if (!form.description.trim()) { setError('Description is required'); return; }
    if (lines.some((l) => !l.accountId)) { setError('All lines must have an account'); return; }
    if (lines.some((l) => l.debitAmount === 0 && l.creditAmount === 0)) { setError('Each line must have a debit or credit'); return; }
    if (lines.some((l) => l.debitAmount > 0 && l.creditAmount > 0)) { setError('A line cannot have both debit and credit'); return; }
    if (!isBalanced) { setError('Total debits must equal total credits'); return; }

    mutation.mutate({ ...form, lines });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 pt-10 pb-10">
      <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">New Journal Entry</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Fiscal Period</label>
              <select
                value={form.fiscalPeriodId}
                onChange={(e) => setForm({ ...form, fiscalPeriodId: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                required
              >
                <option value="">Select period...</option>
                {(periods?.data || []).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              placeholder="e.g. Monthly rent payment"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Reference (optional)</label>
            <input
              type="text"
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              placeholder="e.g. INV-001"
            />
          </div>

          {/* Lines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Entry Lines</label>
              <button type="button" onClick={addLine} className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700">
                <Plus className="h-3 w-3" /> Add Line
              </button>
            </div>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Account</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 w-28">Debit ($)</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 w-28">Credit ($)</th>
                    <th className="px-3 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lines.map((line, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2">
                        <select
                          value={line.accountId}
                          onChange={(e) => updateLine(idx, 'accountId', e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none"
                        >
                          <option value="">Select account...</option>
                          {(accounts?.data || []).map((a: any) => (
                            <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.debitAmount ? (line.debitAmount / 100).toFixed(2) : ''}
                          onChange={(e) => updateLine(idx, 'debitAmount', Math.round(parseFloat(e.target.value || '0') * 100))}
                          className="w-full rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-primary-500 focus:outline-none"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.creditAmount ? (line.creditAmount / 100).toFixed(2) : ''}
                          onChange={(e) => updateLine(idx, 'creditAmount', Math.round(parseFloat(e.target.value || '0') * 100))}
                          className="w-full rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-primary-500 focus:outline-none"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        {lines.length > 2 && (
                          <button type="button" onClick={() => removeLine(idx)} className="text-gray-400 hover:text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t">
                  <tr>
                    <td className="px-3 py-2 text-sm font-medium text-gray-700">Totals</td>
                    <td className="px-3 py-2 text-right text-sm font-mono font-medium text-gray-900">
                      ${(totalDebit / 100).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right text-sm font-mono font-medium text-gray-900">
                      ${(totalCredit / 100).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {isBalanced ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : totalDebit > 0 || totalCredit > 0 ? (
                        <span className="text-xs text-red-500">!</span>
                      ) : null}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || !isBalanced}
              className="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {mutation.isPending ? 'Creating...' : 'Create Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
