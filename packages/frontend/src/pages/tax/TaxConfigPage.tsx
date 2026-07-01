import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useToastStore } from '../../stores/toast';
import { Receipt, Plus, Pencil, Trash2, X, Check } from 'lucide-react';

const TAX_TYPES = ['vat', 'income', 'withholding', 'other'] as const;

const typeLabels: Record<string, string> = {
  vat: 'VAT',
  income: 'Income',
  withholding: 'Withholding',
  other: 'Other',
};

const typeBadgeColors: Record<string, string> = {
  vat: 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300',
  income: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300',
  withholding: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
  other: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
};

interface TaxRate {
  id: string;
  name: string;
  code: string;
  rate: number;
  type: string;
  description: string | null;
  isActive: boolean;
}

export function TaxConfigPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['tax-rates'],
    queryFn: () => api.get('/tax-rates').then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tax-rates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rates'] });
      addToast(t('tax.deleted'), 'success');
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Delete failed', 'error'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.put(`/tax-rates/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rates'] });
    },
  });

  const rates: TaxRate[] = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">{t('tax.title')}</h1>
          <p className="page-subtitle">{t('tax.subtitle')}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> {t('tax.addRate')}
        </button>
      </div>

      {showCreate && (
        <TaxRateForm
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            addToast(t('tax.created'), 'success');
          }}
        />
      )}

      {editingId && (
        <TaxRateForm
          taxRate={rates.find((r) => r.id === editingId)}
          onClose={() => setEditingId(null)}
          onSuccess={() => {
            setEditingId(null);
            addToast(t('tax.updated'), 'success');
          }}
        />
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="table-header">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">{t('tax.code')}</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">{t('common.name')}</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">{t('tax.type')}</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 dark:text-slate-400">{t('tax.rate')}</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">{t('common.description')}</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 dark:text-slate-400">{t('common.status')}</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 dark:text-slate-400">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">{t('common.loading')}</td></tr>
            ) : rates.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">{t('tax.noRates')}</td></tr>
            ) : (
              rates.map((rate) => (
                <tr key={rate.id} className="table-row">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                      {rate.code}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-900 dark:text-white font-medium">{rate.name}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${typeBadgeColors[rate.type] || typeBadgeColors.other}`}>
                      {typeLabels[rate.type] || rate.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-900 dark:text-white">
                    {(rate.rate / 100).toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate">
                    {rate.description || '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleMutation.mutate({ id: rate.id, isActive: !rate.isActive })}
                      className={`badge cursor-pointer ${rate.isActive
                        ? 'bg-success-100 dark:bg-success-900/50 text-success-700 dark:text-success-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {rate.isActive ? t('common.active') : t('common.inactive')}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditingId(rate.id)}
                        className="rounded p-1.5 text-slate-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950/30 transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => { if (confirm(t('tax.confirmDelete'))) deleteMutation.mutate(rate.id); }}
                        className="rounded p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white font-display mb-3 flex items-center gap-2">
          <Receipt className="h-5 w-5 text-slate-400" /> {t('tax.infoTitle')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-4">
            <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-2">PPN (VAT)</h3>
            <p className="text-slate-500 dark:text-slate-400">Pajak Pertambahan Nilai — Indonesian VAT at 11% on most goods and services. Applied to sales invoices and purchase invoices.</p>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-4">
            <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-2">PPh 21</h3>
            <p className="text-slate-500 dark:text-slate-400">Income tax on employment, salaries, and honoraria. Progressive rates from 5% to 35% based on taxable income brackets.</p>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-4">
            <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-2">PPh 22</h3>
            <p className="text-slate-500 dark:text-slate-400">Withholding tax on imports and certain purchases. Rates vary from 0.5% to 7.5% depending on the type of transaction.</p>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-4">
            <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-2">PPh 23</h3>
            <p className="text-slate-500 dark:text-slate-400">Withholding tax on services, royalties, and dividends. Standard rate of 2% for services and 15% for dividends/royalties.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaxRateForm({ taxRate, onClose, onSuccess }: {
  taxRate?: TaxRate;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isEdit = !!taxRate;

  const [form, setForm] = useState({
    name: taxRate?.name || '',
    code: taxRate?.code || '',
    rate: taxRate ? (taxRate.rate / 100).toString() : '',
    type: taxRate?.type || 'vat',
    description: taxRate?.description || '',
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (data: any) => isEdit
      ? api.put(`/tax-rates/${taxRate!.id}`, data)
      : api.post('/tax-rates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rates'] });
      onSuccess();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Failed to save'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const rateValue = parseFloat(form.rate);
    if (isNaN(rateValue) || rateValue < 0) { setError('Rate must be a valid positive number'); return; }
    mutation.mutate({
      name: form.name,
      code: form.code,
      rate: Math.round(rateValue * 100),
      type: form.type,
      description: form.description || undefined,
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white font-display">
            {isEdit ? t('tax.editRate') : t('tax.addRate')}
          </h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <div className="error-box mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t('tax.code')}</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="input-field"
                placeholder="e.g. PPN"
                disabled={isEdit}
                required
              />
            </div>
            <div>
              <label className="label">{t('tax.type')}</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="input-field"
              >
                {TAX_TYPES.map((t) => (
                  <option key={t} value={t}>{typeLabels[t]}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">{t('common.name')}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-field"
              placeholder="e.g. PPN (Pajak Pertambahan Nilai)"
              required
            />
          </div>

          <div>
            <label className="label">{t('tax.ratePercent')}</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={form.rate}
                onChange={(e) => setForm({ ...form, rate: e.target.value })}
                className="input-field pr-8"
                placeholder="e.g. 11"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
            </div>
          </div>

          <div>
            <label className="label">{t('common.description')}</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-field"
              rows={2}
              placeholder="Optional description..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">{t('common.cancel')}</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              <Check className="h-4 w-4" />
              {mutation.isPending ? t('common.loading') : isEdit ? t('common.save') : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
