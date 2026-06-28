import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { CheckSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency } from '../../lib/currency';
import { useCurrencyStore } from '../../stores/currency';
import { CurrencySelector } from '../../components/CurrencySelector';
import { useToastStore } from '../../stores/toast';
import type { CurrencyCode } from '../../lib/currency';

export function ApprovalsPage() {
  const queryClient = useQueryClient();
  const { currency } = useCurrencyStore();
  const { data, isLoading } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: () => api.get('/workflows/pending').then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Approval Workflows</h1>
          <p className="page-subtitle">Review and approve pending transactions</p>
        </div>
        <CurrencySelector />
      </div>

      {isLoading ? (
        <div className="text-center text-slate-500 dark:text-slate-400 py-8">Loading...</div>
      ) : (data?.data || []).length === 0 ? (
        <div className="card p-12 text-center">
          <CheckSquare className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
          <p className="mt-4 text-slate-500 dark:text-slate-400">No pending approvals</p>
          <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">All journal entries have been reviewed</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(data?.data || []).map((item: any) => (
            <ApprovalCard key={item.workflow.id} item={item} queryClient={queryClient} currency={currency} />
          ))}
        </div>
      )}
    </div>
  );
}

function ApprovalCard({ item, queryClient, currency }: { item: any; queryClient: any; currency: CurrencyCode }) {
  const [comments, setComments] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const addToast = useToastStore((s) => s.addToast);

  const { data: entryDetails } = useQuery({
    queryKey: ['journal-entry-detail', item.journalEntry?.id],
    queryFn: () => api.get(`/journal-entries/${item.journalEntry?.id}`).then((r) => r.data),
    enabled: showDetails && !!item.journalEntry?.id,
  });

  const approveMutation = useMutation({
    mutationFn: () => api.post(`/workflows/${item.workflow.id}/approve`, { decision: 'approve', comments }),
    onSuccess: () => {
      addToast('Entry approved');
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
    },
    onError: (err: any) => setFeedback({ type: 'error', message: err.response?.data?.message || 'Approval failed' }),
  });

  const rejectMutation = useMutation({
    mutationFn: () => api.post(`/workflows/${item.workflow.id}/reject`, { decision: 'reject', comments }),
    onSuccess: () => {
      addToast('Entry rejected');
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
    },
    onError: (err: any) => setFeedback({ type: 'error', message: err.response?.data?.message || 'Rejection failed' }),
  });

  const isPending = approveMutation.isPending || rejectMutation.isPending;
  const fc = (cents: number) => formatCurrency(cents, currency);

  return (
    <div className="card p-6">
      {feedback && (
        <div className={`mb-3 ${feedback.type === 'success' ? 'success-box' : 'error-box'}`}>
          {feedback.message}
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium text-slate-900 dark:text-white">
            {item.journalEntry?.description || 'Journal Entry'}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Entry #{item.journalEntry?.entryNumber} &bull; Step {item.workflow.currentStep} of {item.workflow.totalSteps}
          </p>
          <p className="mt-1 text-lg font-semibold font-mono text-slate-900 dark:text-white">
            {fc(item.journalEntry?.totalAmount || 0)}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => approveMutation.mutate()} disabled={isPending} className="btn-success !py-2">Approve</button>
          <button onClick={() => setShowComments(true)} disabled={isPending} className="inline-flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/30 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 disabled:opacity-50 transition-colors">
            Reject
          </button>
        </div>
      </div>

      <button
        onClick={() => setShowDetails(!showDetails)}
        className="mt-3 flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
      >
        {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {showDetails ? 'Hide' : 'Show'} Entry Details
      </button>

      {showDetails && (
        <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="table-header">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-500 dark:text-slate-400">Account</th>
                <th className="px-4 py-2 text-right font-medium text-slate-500 dark:text-slate-400">Debit</th>
                <th className="px-4 py-2 text-right font-medium text-slate-500 dark:text-slate-400">Credit</th>
              </tr>
            </thead>
            <tbody>
              {entryDetails?.lines ? (
                entryDetails.lines.map((line: any, idx: number) => (
                  <tr key={idx} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                      <span className="font-mono text-xs text-slate-400 mr-1">{line.accountCode}</span>
                      {line.accountName}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-slate-900 dark:text-white">
                      {line.debitAmount > 0 ? fc(line.debitAmount) : ''}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-slate-900 dark:text-white">
                      {line.creditAmount > 0 ? fc(line.creditAmount) : ''}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={3} className="px-4 py-4 text-center text-slate-400">Loading details...</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showComments && (
        <div className="mt-4 space-y-2">
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Add comments (required for rejection)..."
            className="input-field"
            rows={2}
          />
          <div className="flex gap-2">
            <button onClick={() => rejectMutation.mutate()} disabled={isPending || !comments.trim()} className="btn-danger !py-1.5 !text-xs">Confirm Reject</button>
            <button onClick={() => setShowComments(false)} className="btn-secondary !py-1.5 !text-xs">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
