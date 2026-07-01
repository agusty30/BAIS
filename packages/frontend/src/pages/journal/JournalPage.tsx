import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { FileText, Plus, X, Send, CheckCircle, Trash2 } from 'lucide-react';
import { formatCurrency, parseCurrencyInput, formatCurrencyInput } from '../../lib/currency';
import { useCurrencyStore } from '../../stores/currency';
import { CurrencySelector } from '../../components/CurrencySelector';
import { useToastStore } from '../../stores/toast';

export function JournalPage() {
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();
  const { currency } = useCurrencyStore();
  const { t } = useTranslation();

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
    draft: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    pending_approval: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
    approved: 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300',
    posted: 'bg-success-100 dark:bg-success-900/50 text-success-700 dark:text-success-300',
    voided: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">{t('journal.title')}</h1>
          <p className="page-subtitle">{t('journal.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <CurrencySelector />
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="h-4 w-4" />
            {t('journal.newEntry')}
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="table-header sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">Entry #</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">Description</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500 dark:text-slate-400">Amount</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">Blockchain</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500 dark:text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">Loading...</td></tr>
              ) : (data?.data || []).length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No journal entries yet</td></tr>
              ) : (
                (data?.data || []).map((entry: any) => (
                  <tr key={entry.id} className="table-row">
                    <td className="px-4 py-3 font-mono text-slate-900 dark:text-white">{entry.entryNumber}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{new Date(entry.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-slate-900 dark:text-white">{entry.description}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-900 dark:text-white">
                      {formatCurrency(entry.totalAmount, currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${statusColors[entry.status] || ''}`}>
                        {entry.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {entry.blockchainTxId ? (
                        <span className="text-xs font-mono text-success-600 dark:text-success-400">{entry.blockchainTxId.slice(0, 12)}...</span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {entry.status === 'draft' && (
                        <button
                          onClick={() => submitMutation.mutate(entry.id)}
                          disabled={submitMutation.isPending}
                          className="inline-flex items-center gap-1 rounded-lg bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                        >
                          <Send className="h-3 w-3" /> Submit
                        </button>
                      )}
                      {entry.status === 'approved' && (
                        <button
                          onClick={() => postMutation.mutate(entry.id)}
                          disabled={postMutation.isPending}
                          className="inline-flex items-center gap-1 rounded-lg bg-success-50 dark:bg-success-900/30 px-2.5 py-1 text-xs font-medium text-success-700 dark:text-success-300 hover:bg-success-100 dark:hover:bg-success-900/50 transition-colors"
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
  const { currency } = useCurrencyStore();
  const addToast = useToastStore((s) => s.addToast);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: '',
    reference: '',
    fiscalPeriodId: '',
  });
  const [lines, setLines] = useState<JournalLine[]>([
    { accountId: '', debitAmount: 0, creditAmount: 0, description: '' },
  ]);
  const [debitTexts, setDebitTexts] = useState<string[]>(['']);
  const [creditTexts, setCreditTexts] = useState<string[]>(['']);

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
      addToast('Journal entry created');
      onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to create journal entry');
    },
  });

  const totalDebit = lines.reduce((sum, l) => sum + l.debitAmount, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.creditAmount, 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const addLine = () => {
    setLines([...lines, { accountId: '', debitAmount: 0, creditAmount: 0, description: '' }]);
    setDebitTexts([...debitTexts, '']);
    setCreditTexts([...creditTexts, '']);
  };
  const removeLine = (idx: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== idx));
    setDebitTexts(debitTexts.filter((_, i) => i !== idx));
    setCreditTexts(creditTexts.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, field: keyof JournalLine, value: any) => {
    setLines(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const handleDebitChange = (idx: number, text: string) => {
    const updated = [...debitTexts];
    updated[idx] = text;
    setDebitTexts(updated);
    const cents = parseCurrencyInput(text, currency);
    setLines(prev => {
      const u = [...prev];
      u[idx] = { ...u[idx], debitAmount: cents };
      if (u.length === 1 && cents > 0) {
        u.push({ accountId: '', debitAmount: 0, creditAmount: cents, description: '' });
        updated.push('');
        setDebitTexts(updated);
        setCreditTexts(prev2 => {
          const c = [...prev2];
          c.push(formatCurrencyInput(cents, currency));
          return c;
        });
      } else if (u.length === 2 && idx === 0 && cents > 0) {
        u[1] = { ...u[1], creditAmount: cents };
        setCreditTexts(prev2 => {
          const c = [...prev2];
          c[1] = formatCurrencyInput(cents, currency);
          return c;
        });
      }
      return u;
    });
  };

  const handleCreditChange = (idx: number, text: string) => {
    const updated = [...creditTexts];
    updated[idx] = text;
    setCreditTexts(updated);
    const cents = parseCurrencyInput(text, currency);
    setLines(prev => {
      const u = [...prev];
      u[idx] = { ...u[idx], creditAmount: cents };
      if (u.length === 1 && cents > 0) {
        u.push({ accountId: '', debitAmount: cents, creditAmount: 0, description: '' });
        setCreditTexts(prev2 => [...prev2, '']);
        setDebitTexts(prev2 => {
          const d = [...prev2];
          d.push(formatCurrencyInput(cents, currency));
          return d;
        });
      } else if (u.length === 2 && idx === 0 && cents > 0) {
        u[1] = { ...u[1], debitAmount: cents };
        setDebitTexts(prev2 => {
          const d = [...prev2];
          d[1] = formatCurrencyInput(cents, currency);
          return d;
        });
      }
      return u;
    });
  };

  const handleDebitBlur = (idx: number) => {
    const cents = lines[idx].debitAmount;
    const updated = [...debitTexts];
    updated[idx] = formatCurrencyInput(cents, currency);
    setDebitTexts(updated);
  };

  const handleCreditBlur = (idx: number) => {
    const cents = lines[idx].creditAmount;
    const updated = [...creditTexts];
    updated[idx] = formatCurrencyInput(cents, currency);
    setCreditTexts(updated);
  };

  const currencyLabel = currency === 'IDR' ? 'Rp' : '$';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.description.trim()) { setError('Description is required'); return; }

    // Re-parse amounts from text inputs as safety net
    const finalLines = lines.map((line, idx) => ({
      ...line,
      debitAmount: parseCurrencyInput(debitTexts[idx] || '', currency),
      creditAmount: parseCurrencyInput(creditTexts[idx] || '', currency),
    }));

    if (finalLines.some((l) => !l.accountId)) { setError('All lines must have an account'); return; }
    if (finalLines.some((l) => l.debitAmount === 0 && l.creditAmount === 0)) { setError('Each line must have a debit or credit amount'); return; }
    if (finalLines.some((l) => l.debitAmount > 0 && l.creditAmount > 0)) { setError('A line cannot have both debit and credit'); return; }

    const td = finalLines.reduce((sum, l) => sum + l.debitAmount, 0);
    const tc = finalLines.reduce((sum, l) => sum + l.creditAmount, 0);
    if (td !== tc || td === 0) { setError(`Total debits (${formatCurrency(td, currency)}) must equal total credits (${formatCurrency(tc, currency)})`); return; }

    const payload: any = { date: form.date, description: form.description, reference: form.reference || undefined, lines: finalLines };
    if (form.fiscalPeriodId) payload.fiscalPeriodId = form.fiscalPeriodId;
    mutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 dark:bg-black/70 backdrop-blur-sm pt-10 pb-10">
      <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-modal border border-slate-200 dark:border-slate-700 animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white font-display">New Journal Entry</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="error-box">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="label">Fiscal Period (auto-detected)</label>
              <select value={form.fiscalPeriodId} onChange={(e) => setForm({ ...form, fiscalPeriodId: e.target.value })} className="input-field">
                <option value="">Auto-detect from date</option>
                {(periods?.data || []).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Description</label>
            <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" placeholder="e.g. Monthly rent payment" required />
          </div>

          <div>
            <label className="label">Reference (optional)</label>
            <input type="text" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="input-field" placeholder="e.g. INV-001" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Entry Lines</label>
              <button type="button" onClick={addLine} className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">
                <Plus className="h-3 w-3" /> Add Line
              </button>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="table-header">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-slate-400">Account</th>
                    <th className="px-3 py-2 text-right font-semibold text-slate-500 dark:text-slate-400 w-32">Debit ({currencyLabel})</th>
                    <th className="px-3 py-2 text-right font-semibold text-slate-500 dark:text-slate-400 w-32">Credit ({currencyLabel})</th>
                    <th className="px-3 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => (
                    <tr key={idx} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2">
                        <select value={line.accountId} onChange={(e) => updateLine(idx, 'accountId', e.target.value)} className="input-field !py-1">
                          <option value="">Select account...</option>
                          {(accounts?.data || []).map((a: any) => (
                            <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={debitTexts[idx]}
                          onChange={(e) => handleDebitChange(idx, e.target.value)}
                          onBlur={() => handleDebitBlur(idx)}
                          className="input-field !py-1 text-right font-mono"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={creditTexts[idx]}
                          onChange={(e) => handleCreditChange(idx, e.target.value)}
                          onBlur={() => handleCreditBlur(idx)}
                          className="input-field !py-1 text-right font-mono"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        {lines.length > 1 && (
                          <button type="button" onClick={() => removeLine(idx)} className="text-slate-400 hover:text-red-500 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="table-header border-t-2 border-slate-200 dark:border-slate-700">
                  <tr>
                    <td className="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300">Totals</td>
                    <td className="px-3 py-2 text-right text-sm font-mono font-medium text-slate-900 dark:text-white">{formatCurrency(totalDebit, currency)}</td>
                    <td className="px-3 py-2 text-right text-sm font-mono font-medium text-slate-900 dark:text-white">{formatCurrency(totalCredit, currency)}</td>
                    <td className="px-3 py-2 text-center">
                      {isBalanced ? (
                        <CheckCircle className="h-4 w-4 text-success-500" />
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
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? 'Creating...' : 'Create Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
