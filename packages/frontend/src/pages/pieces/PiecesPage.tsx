import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { TrendingUp, TrendingDown, Minus, Plus, X } from 'lucide-react';

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
        <h1 className="text-2xl font-bold text-gray-900">PIECES Analysis</h1>
        <p className="mt-1 text-sm text-gray-500">
          Performance, Information, Economics, Control, Efficiency, Service
        </p>
      </div>

      <div className="rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
        <p className="text-sm font-medium opacity-80">Overall System Score</p>
        <p className="mt-1 text-4xl font-bold">{data?.overallScore || 0}%</p>
        <p className="mt-1 text-sm opacity-80">Across all 6 PIECES dimensions</p>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-500 py-8">Loading...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dimensions.map((dim: any) => (
            <div key={dim.dimension} className="rounded-xl bg-white p-6 shadow-sm border">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{dim.label}</h3>
                {dim.trend === 'up' ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : dim.trend === 'down' ? (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                ) : (
                  <Minus className="h-5 w-5 text-gray-400" />
                )}
              </div>

              <div className="mt-4">
                <span className="text-3xl font-bold text-gray-900">{dim.score}%</span>
                <div className="mt-3 h-2 rounded-full bg-gray-100">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      dim.score >= 80 ? 'bg-green-500' :
                      dim.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${dim.score}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 space-y-1.5">
                {(dim.definitions || []).slice(0, 3).map((def: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 truncate mr-2">{def.description}</span>
                    <span className="font-medium text-gray-700 shrink-0">{def.unit}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setRecording(recording === dim.dimension ? null : dim.dimension)}
                className="mt-4 flex w-full items-center justify-center gap-1 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-100"
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
    <form onSubmit={handleSubmit} className="mt-4 border-t pt-4 space-y-3">
      {error && <div className="rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</div>}

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">Metric</label>
        <select
          value={selectedMetric}
          onChange={(e) => setSelectedMetric(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        >
          {definitions.map((def) => (
            <option key={def.name} value={def.name}>{def.description}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Value ({selectedDef?.unit || ''})
          </label>
          <input
            type="number"
            step="any"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            placeholder="0"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Period</label>
          <select
            value={periodId}
            onChange={(e) => setPeriodId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">Select...</option>
            {(periods?.data || []).map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="flex-1 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {mutation.isPending ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}
