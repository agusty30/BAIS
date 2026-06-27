import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Target, CheckCircle, AlertCircle } from 'lucide-react';

const SYSTEM_CONTROLS: Record<string, string[]> = {
  control_environment: [
    'Role-based access control (RBAC) enforced',
    'Segregation of duties in approval workflows',
    'User authentication with strong passwords',
    'Defined organizational hierarchy for approvals',
  ],
  risk_assessment: [
    'Amount-based workflow routing for high-value transactions',
    'Anomaly detection flags on unusual entries',
    'Fiscal period controls prevent backdating',
    'Risk register maintained and reviewed',
  ],
  control_activities: [
    'Double-entry validation ensures balanced entries',
    'Blockchain immutability prevents tampering',
    'Multi-level approval for transactions above threshold',
    'Automatic posting only after full approval',
  ],
  information_communication: [
    'Complete audit trail for all financial actions',
    'Real-time notifications for pending approvals',
    'Dashboard provides current financial position',
    'Blockchain verification confirms data integrity',
  ],
  monitoring: [
    'PIECES KPIs tracked continuously',
    'Blockchain vs database reconciliation checks',
    'COSO compliance scoring with trend analysis',
    'Automated integrity verification reports',
  ],
};

const maturityLabels = ['', 'Initial', 'Developing', 'Defined', 'Managed', 'Optimized'];

export function COSOPage() {
  const [evaluating, setEvaluating] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['coso-matrix'],
    queryFn: () => api.get('/coso/matrix').then((r) => r.data),
  });

  const components = data?.components || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">COSO Internal Control Framework</h1>
        <p className="page-subtitle">Evaluate internal controls across the five COSO components</p>
      </div>

      <div className="rounded-2xl bg-gradient-to-r from-primary-600 to-primary-800 p-6 text-white shadow-elevated">
        <p className="text-sm font-medium opacity-80">Overall COSO Maturity Score</p>
        <p className="mt-1 text-4xl font-bold font-display">
          {(data?.overallScore || 0).toFixed(1)} / 5.0
        </p>
        <p className="mt-1 text-sm opacity-80">
          Level: {maturityLabels[Math.round(data?.overallScore || 0)] || 'Not Evaluated'}
        </p>
      </div>

      {isLoading ? (
        <div className="text-center text-slate-500 dark:text-slate-400 py-8">Loading...</div>
      ) : (
        <div className="space-y-4">
          {components.map((comp: any) => (
            <div key={comp.component} className="card p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{comp.label}</h3>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-4 w-8 rounded ${
                            level <= (comp.currentScore || 0) ? 'bg-success-500' : 'bg-slate-200 dark:bg-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {maturityLabels[comp.currentScore || 0] || 'Not Evaluated'}
                    </span>
                  </div>
                  {comp.lastEvaluatedAt && (
                    <p className="mt-1 text-xs text-slate-400">
                      Last evaluated: {new Date(comp.lastEvaluatedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">{comp.currentScore || 0}</span>
                  <button
                    onClick={() => setEvaluating(evaluating === comp.component ? null : comp.component)}
                    className="btn-secondary !py-1.5"
                  >
                    {evaluating === comp.component ? 'Cancel' : 'Evaluate'}
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {(comp.systemControls || []).map((control: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-success-500 dark:text-success-400" />
                    <span className="text-slate-600 dark:text-slate-400">{control}</span>
                  </div>
                ))}
              </div>

              {evaluating === comp.component && (
                <EvaluationForm
                  component={comp.component}
                  label={comp.label}
                  currentScore={comp.currentScore || 0}
                  onClose={() => setEvaluating(null)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EvaluationForm({
  component,
  label,
  currentScore,
  onClose,
}: {
  component: string;
  label: string;
  currentScore: number;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [score, setScore] = useState(currentScore || 3);
  const [periodId, setPeriodId] = useState('');
  const [error, setError] = useState('');

  const controls = SYSTEM_CONTROLS[component] || [];
  const [evidence, setEvidence] = useState(
    controls.map((control) => ({
      control,
      description: control,
      implemented: true,
      effectiveness: 'effective' as 'effective' | 'partially_effective' | 'ineffective',
    }))
  );

  const { data: periods } = useQuery({
    queryKey: ['fiscal-periods'],
    queryFn: () => api.get('/fiscal-periods').then((r) => r.data),
  });

  const mutation = useMutation({
    mutationFn: (payload: any) => api.post('/coso/evaluations', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coso-matrix'] });
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Failed to submit evaluation'),
  });

  const updateEvidence = (idx: number, field: string, value: any) => {
    const updated = [...evidence];
    updated[idx] = { ...updated[idx], [field]: value };
    setEvidence(updated);
  };

  const handleSubmit = () => {
    setError('');
    if (!periodId) { setError('Select a fiscal period'); return; }
    mutation.mutate({ component, score, evidence, periodId });
  };

  return (
    <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-6 space-y-4">
      <h4 className="font-medium text-slate-800 dark:text-white">Evaluate: {label}</h4>

      {error && <div className="error-box">{error}</div>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Fiscal Period</label>
          <select value={periodId} onChange={(e) => setPeriodId(e.target.value)} className="input-field">
            <option value="">Select period...</option>
            {(periods?.data || []).map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">
            Maturity Score: {score} — {maturityLabels[score]}
          </label>
          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={score}
            onChange={(e) => setScore(parseInt(e.target.value))}
            className="w-full mt-2 accent-primary-600"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            {maturityLabels.slice(1).map((l, i) => <span key={i}>{i + 1}</span>)}
          </div>
        </div>
      </div>

      <div>
        <label className="label mb-2">Control Evidence</label>
        <div className="space-y-3">
          {evidence.map((ev, idx) => (
            <div key={idx} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ev.implemented}
                    onChange={(e) => updateEvidence(idx, 'implemented', e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{ev.control}</span>
                </label>
              </div>
              {ev.implemented && (
                <div className="pl-6">
                  <select
                    value={ev.effectiveness}
                    onChange={(e) => updateEvidence(idx, 'effectiveness', e.target.value)}
                    className="input-field !py-1 !text-xs"
                  >
                    <option value="effective">Effective</option>
                    <option value="partially_effective">Partially Effective</option>
                    <option value="ineffective">Ineffective</option>
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button onClick={handleSubmit} disabled={mutation.isPending} className="btn-primary">
          {mutation.isPending ? 'Submitting...' : 'Submit Evaluation'}
        </button>
      </div>
    </div>
  );
}
