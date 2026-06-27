import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { CheckSquare } from 'lucide-react';

export function ApprovalsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: () => api.get('/workflows/pending').then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Approval Workflows</h1>
        <p className="page-subtitle">Review and approve pending transactions</p>
      </div>

      {isLoading ? (
        <div className="text-center text-slate-500 dark:text-slate-400 py-8">Loading...</div>
      ) : (data?.data || []).length === 0 ? (
        <div className="card p-12 text-center">
          <CheckSquare className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
          <p className="mt-4 text-slate-500 dark:text-slate-400">No pending approvals</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(data?.data || []).map((item: any) => (
            <ApprovalCard key={item.workflow.id} item={item} queryClient={queryClient} />
          ))}
        </div>
      )}
    </div>
  );
}

function ApprovalCard({ item, queryClient }: { item: any; queryClient: any }) {
  const [comments, setComments] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const approveMutation = useMutation({
    mutationFn: () => api.post(`/workflows/${item.workflow.id}/approve`, { decision: 'approve', comments }),
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Approved successfully' });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
    },
    onError: (err: any) => setFeedback({ type: 'error', message: err.response?.data?.message || 'Approval failed' }),
  });

  const rejectMutation = useMutation({
    mutationFn: () => api.post(`/workflows/${item.workflow.id}/reject`, { decision: 'reject', comments }),
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Rejected' });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
    },
    onError: (err: any) => setFeedback({ type: 'error', message: err.response?.data?.message || 'Rejection failed' }),
  });

  const isPending = approveMutation.isPending || rejectMutation.isPending;

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
            ${((item.journalEntry?.totalAmount || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => approveMutation.mutate()} disabled={isPending} className="btn-success !py-2">Approve</button>
          <button onClick={() => setShowComments(true)} disabled={isPending} className="inline-flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/30 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 disabled:opacity-50 transition-colors">
            Reject
          </button>
        </div>
      </div>

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
