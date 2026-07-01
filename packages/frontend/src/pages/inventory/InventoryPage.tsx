import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useToastStore } from '../../stores/toast';
import { useCurrencyStore } from '../../stores/currency';
import { formatCurrency } from '../../lib/currency';
import { Package, Plus, Pencil, Trash2, X, Check, ArrowDownCircle, ArrowUpCircle, RefreshCw, AlertTriangle } from 'lucide-react';

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  unitCost: number;
  salePrice: number;
  stockQuantity: number;
  reorderLevel: number;
  costMethod: string;
  isActive: boolean;
}

interface InventoryTx {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  unitCost: number;
  totalCost: number;
  reference: string | null;
  notes: string | null;
  date: string;
}

const txTypeConfig = {
  in: { label: 'Stock In', icon: ArrowDownCircle, color: 'text-success-600 dark:text-success-400', badge: 'bg-success-100 dark:bg-success-900/50 text-success-700 dark:text-success-300' },
  out: { label: 'Stock Out', icon: ArrowUpCircle, color: 'text-red-600 dark:text-red-400', badge: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' },
  adjustment: { label: 'Adjustment', icon: RefreshCw, color: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300' },
};

export function InventoryPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'products' | 'transactions'>('products');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">{t('inventory.title')}</h1>
          <p className="page-subtitle">{t('inventory.subtitle')}</p>
        </div>
      </div>

      <SummaryCards />

      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {(['products', 'transactions'] as const).map((t2) => (
          <button
            key={t2}
            onClick={() => setTab(t2)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t2
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {t(`inventory.${t2}`)}
          </button>
        ))}
      </div>

      {tab === 'products' ? <ProductsTab /> : <TransactionsTab />}
    </div>
  );
}

function SummaryCards() {
  const { t } = useTranslation();
  const { currency } = useCurrencyStore();
  const { data } = useQuery({
    queryKey: ['inventory-summary'],
    queryFn: () => api.get('/inventory/summary').then((r) => r.data),
  });

  const cards = [
    { label: t('inventory.totalProducts'), value: data?.totalProducts || 0 },
    { label: t('inventory.activeProducts'), value: data?.activeProducts || 0 },
    { label: t('inventory.stockValue'), value: formatCurrency(Number(data?.totalStockValue || 0), currency), isCurrency: true },
    { label: t('inventory.lowStock'), value: data?.lowStockCount || 0, isAlert: (data?.lowStockCount || 0) > 0 },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="card p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{c.label}</p>
          <p className={`text-xl font-bold font-display ${c.isAlert ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
            {c.isAlert && <AlertTriangle className="inline h-4 w-4 mr-1 -mt-0.5" />}
            {c.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function ProductsTab() {
  const { t } = useTranslation();
  const { currency } = useCurrencyStore();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [txProductId, setTxProductId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.get('/inventory/products').then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/inventory/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
      addToast(t('inventory.productDeleted'), 'success');
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Delete failed', 'error'),
  });

  const prods: Product[] = data?.data || [];

  return (
    <>
      <div className="flex justify-end">
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> {t('inventory.addProduct')}
        </button>
      </div>

      {showCreate && (
        <ProductForm
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); addToast(t('inventory.productCreated'), 'success'); }}
        />
      )}
      {editingId && (
        <ProductForm
          product={prods.find((p) => p.id === editingId)}
          onClose={() => setEditingId(null)}
          onSuccess={() => { setEditingId(null); addToast(t('inventory.productUpdated'), 'success'); }}
        />
      )}
      {txProductId && (
        <TransactionForm
          productId={txProductId}
          productName={prods.find((p) => p.id === txProductId)?.name || ''}
          onClose={() => setTxProductId(null)}
          onSuccess={() => { setTxProductId(null); addToast(t('inventory.txRecorded'), 'success'); }}
        />
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="table-header">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">SKU</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">{t('common.name')}</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">{t('common.category')}</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 dark:text-slate-400">{t('inventory.stock')}</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 dark:text-slate-400">{t('inventory.unitCost')}</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 dark:text-slate-400">{t('inventory.salePrice')}</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 dark:text-slate-400">{t('common.status')}</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 dark:text-slate-400">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">{t('common.loading')}</td></tr>
            ) : prods.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">{t('inventory.noProducts')}</td></tr>
            ) : (
              prods.map((p) => {
                const lowStock = p.isActive && p.stockQuantity <= p.reorderLevel;
                return (
                  <tr key={p.id} className="table-row">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">{p.sku}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-900 dark:text-white font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{p.category || '—'}</td>
                    <td className={`px-4 py-3 text-right font-mono ${lowStock ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-slate-900 dark:text-white'}`}>
                      {lowStock && <AlertTriangle className="inline h-3 w-3 mr-1 -mt-0.5" />}
                      {p.stockQuantity}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-900 dark:text-white">{formatCurrency(p.unitCost, currency)}</td>
                    <td className="px-4 py-3 text-right text-slate-900 dark:text-white">{formatCurrency(p.salePrice, currency)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`badge ${p.isActive
                        ? 'bg-success-100 dark:bg-success-900/50 text-success-700 dark:text-success-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                        {p.isActive ? t('common.active') : t('common.inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setTxProductId(p.id)} className="rounded p-1.5 text-slate-400 hover:text-success-500 hover:bg-success-50 dark:hover:bg-success-950/30 transition-colors" title="Record transaction">
                          <Package className="h-4 w-4" />
                        </button>
                        <button onClick={() => setEditingId(p.id)} className="rounded p-1.5 text-slate-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950/30 transition-colors">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => { if (confirm(t('inventory.confirmDelete'))) deleteMutation.mutate(p.id); }} className="rounded p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function TransactionsTab() {
  const { t } = useTranslation();
  const { currency } = useCurrencyStore();

  const { data, isLoading } = useQuery({
    queryKey: ['inventory-transactions'],
    queryFn: () => api.get('/inventory/transactions').then((r) => r.data),
  });

  const txs: InventoryTx[] = data?.data || [];

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="table-header">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">{t('common.date')}</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">{t('inventory.product')}</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">{t('tax.type')}</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-500 dark:text-slate-400">{t('inventory.qty')}</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-500 dark:text-slate-400">{t('inventory.unitCost')}</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-500 dark:text-slate-400">{t('common.total')}</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">{t('inventory.reference')}</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">{t('common.loading')}</td></tr>
          ) : txs.length === 0 ? (
            <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">{t('inventory.noTransactions')}</td></tr>
          ) : (
            txs.map((tx) => {
              const cfg = txTypeConfig[tx.type];
              return (
                <tr key={tx.id} className="table-row">
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{new Date(tx.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded mr-1.5">{tx.productSku}</span>
                    <span className="text-slate-900 dark:text-white">{tx.productName}</span>
                  </td>
                  <td className="px-4 py-3"><span className={`badge ${cfg.badge}`}>{cfg.label}</span></td>
                  <td className={`px-4 py-3 text-right font-mono ${cfg.color}`}>
                    {tx.type === 'out' ? '-' : tx.type === 'in' ? '+' : ''}{tx.quantity}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900 dark:text-white">{formatCurrency(tx.unitCost, currency)}</td>
                  <td className="px-4 py-3 text-right text-slate-900 dark:text-white">{formatCurrency(tx.totalCost, currency)}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{tx.reference || '—'}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function ProductForm({ product, onClose, onSuccess }: {
  product?: Product;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isEdit = !!product;

  const [form, setForm] = useState({
    sku: product?.sku || '',
    name: product?.name || '',
    description: product?.description || '',
    category: product?.category || '',
    unitCost: product ? (product.unitCost / 100).toString() : '',
    salePrice: product ? (product.salePrice / 100).toString() : '',
    reorderLevel: product?.reorderLevel?.toString() || '0',
    costMethod: product?.costMethod || 'moving_average',
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (data: any) => isEdit
      ? api.put(`/inventory/products/${product!.id}`, data)
      : api.post('/inventory/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
      onSuccess();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Failed to save'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    mutation.mutate({
      sku: form.sku,
      name: form.name,
      description: form.description || undefined,
      category: form.category || undefined,
      unitCost: Math.round(parseFloat(form.unitCost || '0') * 100),
      salePrice: Math.round(parseFloat(form.salePrice || '0') * 100),
      reorderLevel: parseInt(form.reorderLevel || '0'),
      costMethod: form.costMethod,
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white font-display">
            {isEdit ? t('inventory.editProduct') : t('inventory.addProduct')}
          </h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X className="h-5 w-5" /></button>
        </div>
        {error && <div className="error-box mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">SKU</label>
              <input type="text" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="input-field" placeholder="e.g. PRD-001" disabled={isEdit} required />
            </div>
            <div>
              <label className="label">{t('common.category')}</label>
              <input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field" placeholder="e.g. Electronics" />
            </div>
          </div>
          <div>
            <label className="label">{t('common.name')}</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="label">{t('common.description')}</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">{t('inventory.unitCost')}</label>
              <input type="number" step="0.01" min="0" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="label">{t('inventory.salePrice')}</label>
              <input type="number" step="0.01" min="0" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="label">{t('inventory.reorderLevel')}</label>
              <input type="number" min="0" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} className="input-field" />
            </div>
          </div>
          <div>
            <label className="label">{t('inventory.costMethod')}</label>
            <select value={form.costMethod} onChange={(e) => setForm({ ...form, costMethod: e.target.value })} className="input-field max-w-xs">
              <option value="moving_average">Moving Average</option>
              <option value="fifo">FIFO</option>
            </select>
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

function TransactionForm({ productId, productName, onClose, onSuccess }: {
  productId: string;
  productName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    type: 'in',
    quantity: '',
    unitCost: '',
    reference: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/inventory/transactions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
      onSuccess();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Failed to record'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    mutation.mutate({
      productId,
      type: form.type,
      quantity: parseInt(form.quantity),
      unitCost: form.unitCost ? Math.round(parseFloat(form.unitCost) * 100) : undefined,
      reference: form.reference || undefined,
      notes: form.notes || undefined,
      date: form.date,
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white font-display">{t('inventory.recordTx')}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X className="h-5 w-5" /></button>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{productName}</p>
        {error && <div className="error-box mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t('tax.type')}</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-field">
                <option value="in">Stock In</option>
                <option value="out">Stock Out</option>
                <option value="adjustment">Adjustment</option>
              </select>
            </div>
            <div>
              <label className="label">{t('common.date')}</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input-field" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t('inventory.qty')}</label>
              <input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="label">{t('inventory.unitCost')}</label>
              <input type="number" step="0.01" min="0" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} className="input-field" placeholder="Use product default" />
            </div>
          </div>
          <div>
            <label className="label">{t('inventory.reference')}</label>
            <input type="text" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="input-field" placeholder="e.g. PO-2026-001" />
          </div>
          <div>
            <label className="label">{t('common.notes')}</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field" rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">{t('common.cancel')}</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              <Check className="h-4 w-4" />
              {mutation.isPending ? t('common.loading') : t('inventory.record')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
