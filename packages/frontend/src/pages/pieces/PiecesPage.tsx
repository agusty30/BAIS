import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { TrendingUp, TrendingDown, Minus, Plus } from 'lucide-react';

const METRICS_DEFINITION: Record<string, { name: string; unit: string; description: string }[]> = {
  performance: [
    { name: 'transaction_throughput', unit: 'tx/min', description: 'Journal entries processed per minute' },
    { name: 'report_generation_time', unit: 'ms', description: 'Time to generate financial reports' },
    { name: 'approval_response_time', unit: 'hours', description: 'Average time to respond to approval requests' },
  ],
  information: [
    { name: 'data_accuracy', unit: '%', description: 'Match rate between PostgreSQL and blockchain data' },
    { name: 'report_timeliness', unit: 'hours', description: 'Time from period close to report availability' },
    { name: 'audit_completeness', unit: '%', description: 'Percentage of actions with complete audit trail' },
  ],
  economics: [
    { name: 'cost_per_transaction', unit: 'USD', description: 'Average cost per journal entry processing' },
    { name: 'error_correction_cost', unit: 'USD', description: 'Cost of correcting entry errors' },
    { name: 'automation_savings', unit: '%', description: 'Reduction in manual processing effort' },
  ],
  control: [
    { name: 'unauthorized_access_blocked', unit: 'count', description: 'Number of unauthorized access attempts blocked' },
    { name: 'segregation_violations', unit: 'count', description: 'Number of segregation of duties violations caught' },
    { name: 'tamper_attempts_detected', unit: 'count', description: 'Blockchain integrity violations detected' },
  ],
  efficiency: [
    { name: 'approval_cycle_time', unit: 'hours', description: 'End-to-end approval workflow duration' },
    { name: 'automation_rate', unit: '%', description: 'Percentage of processes automated vs manual' },
    { name: 'reconciliation_time', unit: 'minutes', description: 'Time for periodic reconciliation checks' },
  ],
  service: [
    { name: 'system_uptime', unit: '%', description: 'System availability percentage' },
    { name: 'user_satisfaction', unit: 'score', description: 'User satisfaction rating (1-10)' },
    { name: 'error_rate', unit: '%', description: 'Percentage of failed operations' },
  ],
};

export function PiecesPage() {
  const [recording, setRecording] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['pieces-dashboard'],
    queryFn: () => api.get('/pieces/dashboard').then((r) => r.data),
  });

  const dimensions = data?.dimensions || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">PIECES Analysis</h1>
        <p className="page-subtitle">Performance, Information, Economics, Control, Efficiency, Service</p>
      </div>

      <div className="rounded-2xl bg-gradient-to-r from-success-500 to-emerald-600 p-6 text-white shadow-elevated">
        <p className="text-sm font-medium opacity-80">Overall System Score</p>
        <p className="mt-1 text-4xl font-bold font-display">{data?.overallScore || 0}%</p>
        <p className="mt-1 text-sm opacity-80">Across all 6 PIECES dimensions</p>
      </div>

      {isLoading ? (
        <div className="text-center text-slate-500 dark:text-slate-400 py-8">Loading...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dimensions.map((dim: any) => (
            <div key={dim.dimension} className="card p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 dark:text-white">{dim.label}</h3>
                {dim.trend === 'up' ? (
                  <TrendingUp className="h-5 w-5 text-success-500 dark:text-success-400" />
                ) : dim.trend === 'down' ? (
                  <TrendingDown className="h-5 w-5 text-red-500 dark:text-red-400" />
                ) : (
                  <Minus className="h-5 w-5 text-slate-400" />
                )}
              </div>

              <div className="mt-4">
                <span className="text-3xl font-bold text-slate-900 dark:text-white font-display">{dim.score}%</span>
                <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-700">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      dim.score >= 80 ? 'bg-success-500' :
                      dim.score >= 60 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${dim.score}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 space-y-1.5">
                {(dim.definitions || []).slice(0, 3).map((def: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 truncate mr-2">{def.description}</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 shrink-0">{def.unit}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setRecording(recording === dim.dimension ? null : dim.dimension)}
                className="mt-4 flex w-full items-center justify-center gap-1 rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/30 px-3 py-1.5 text-sm font-medium text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Record Metric
              </button>

              {recording === dim.dimension && (
                <RecordMetricForm
                  dimension={dim.dimension}
                  label={dim.label}
                  onClose={() => setRecording(null)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecordMetricForm({
  dimension,
  label,
  onClose,
}: {
  dimension: string;
  label: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const definitions = METRICS_DEFINITION[dimension] || [];
  const [selectedMetric, setSelectedMetric] = useState(definitions[0]?.name || '');
  const [value, setValue] = useState('');
  const [periodId, setPeriodId] = useState('');
  const [error, setError] = useState('');

  const selectedDef = definitions.find((d) => d.name === selectedMetric);

  const { data: periods } = useQuery({
    queryKey: ['fiscal-periods'],
    queryFn: () => api.get('/fiscal-periods').then((r) => r.data),
  });

  const mutation = useMutation({
    mutationFn: (payload: any) => api.post('/pieces/metrics', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pieces-dashboard'] });
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Failed to record metric'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!periodId) { setError('Select a fiscal period'); return; }
    if (!value || isNaN(Number(value))) { setError('Enter a valid numeric value'); return; }

    mutation.mutate({
      dimension,
      metricName: selectedMetric,
      value: Number(value),
      unit: selectedDef?.unit || '',
      periodId,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-4 space-y-3">
      {error && <div className="error-box !text-xs !p-2">{error}</div>}

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Metric</label>
        <select value={selectedMetric} onChange={(e) => setSelectedMetric(e.target.value)} className="input-field !py-1.5 !text-sm">
          {definitions.map((def) => (
            <option key={def.name} value={def.name}>{def.description}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Value ({selectedDef?.unit || ''})
          </label>
          <input type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)} className="input-field !py-1.5 !text-sm" placeholder="0" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Period</label>
          <select value={periodId} onChange={(e) => setPeriodId(e.target.value)} className="input-field !py-1.5 !text-sm">
            <option value="">Select...</option>
            {(periods?.data || []).map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="btn-secondary flex-1 !py-1.5 !text-xs">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1 !py-1.5 !text-xs">
          {mutation.isPending ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}
