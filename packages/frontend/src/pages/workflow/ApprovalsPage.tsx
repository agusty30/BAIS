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
        <h1 className="text-2xl font-bold text-gray-900">Approval Workflows</h1>
        <p className="mt-1 text-sm text-gray-500">Review and approve pending transactions</p>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-500 py-8">Loading...</div>
      ) : (data?.data || []).length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm border">
          <CheckSquare className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-gray-500">No pending approvals</p>
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
    <div className="rounded-xl bg-white p-6 shadow-sm border">
      {feedback && (
        <div className={`mb-3 rounded-lg p-3 text-sm ${feedback.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {feedback.message}
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium text-gray-900">
            {item.journalEntry?.description || 'Journal Entry'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Entry #{item.journalEntry?.entryNumber} &bull; Step {item.workflow.currentStep} of {item.workflow.totalSteps}
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            ${((item.journalEntry?.totalAmount || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => approveMutation.mutate()}
            disabled={isPending}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            Approve
          </button>
          <button
            onClick={() => setShowComments(true)}
            disabled={isPending}
            className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
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
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              onClick={() => rejectMutation.mutate()}
              disabled={isPending || !comments.trim()}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Confirm Reject
            </button>
            <button
              onClick={() => setShowComments(false)}
              className="rounded-lg border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
