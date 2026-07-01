import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/auth';
import { useCurrencyStore } from '../../stores/currency';
import { CURRENCIES, EXCHANGE_RATE_DATE } from '../../lib/currency';
import type { CurrencyCode } from '../../lib/currency';
import { Save, Lock, DollarSign, Globe, Building2, Plus, X, Trash2 } from 'lucide-react';
import { useToastStore } from '../../stores/toast';

export function SettingsPage() {
  const { user, login, accessToken, refreshToken } = useAuthStore();
  const { currency, setCurrency } = useCurrencyStore();
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const profileMutation = useMutation({
    mutationFn: (data: { fullName: string }) => api.patch('/auth/me', data),
    onSuccess: (res) => {
      if (user && accessToken && refreshToken) {
        login({ ...user, fullName: res.data.fullName }, accessToken, refreshToken);
      }
      setProfileMsg({ type: 'success', text: t('settings.profileUpdated') });
    },
    onError: (err: any) => setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Update failed' }),
  });

  const passwordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.post('/auth/change-password', data),
    onSuccess: () => {
      setPasswordMsg({ type: 'success', text: t('settings.passwordChanged') });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (err: any) => setPasswordMsg({ type: 'error', text: err.response?.data?.message || 'Password change failed' }),
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    if (!fullName.trim()) { setProfileMsg({ type: 'error', text: 'Name is required' }); return; }
    profileMutation.mutate({ fullName: fullName.trim() });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (passwords.newPassword.length < 8) { setPasswordMsg({ type: 'error', text: 'New password must be at least 8 characters' }); return; }
    if (passwords.newPassword !== passwords.confirmPassword) { setPasswordMsg({ type: 'error', text: 'Passwords do not match' }); return; }
    passwordMutation.mutate({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
  };

  const roleColors: Record<string, string> = {
    admin: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
    accountant: 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300',
    manager: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300',
    auditor: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
    viewer: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="page-title">{t('settings.title')}</h1>
        <p className="page-subtitle">{t('settings.subtitle')}</p>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white font-display mb-4">{t('settings.profile')}</h2>

        {profileMsg && (
          <div className={`mb-4 ${profileMsg.type === 'success' ? 'success-box' : 'error-box'}`}>
            {profileMsg.text}
          </div>
        )}

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-500 dark:text-slate-400"
            />
          </div>

          <div>
            <label className="label">Full Name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field" />
          </div>

          <div>
            <label className="label">Role</label>
            <div>
              <span className={`badge capitalize ${roleColors[user?.role || ''] || ''}`}>
                {user?.role}
              </span>
            </div>
          </div>

          <button type="submit" disabled={profileMutation.isPending} className="btn-primary">
            <Save className="h-4 w-4" />
            {profileMutation.isPending ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white font-display mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-slate-400" /> {t('settings.currency')}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="label">{t('settings.displayCurrency')}</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              className="input-field max-w-xs"
            >
              {Object.values(CURRENCIES).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} — {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-sm text-slate-600 dark:text-slate-400">
            <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">{t('settings.exchangeRates')}</p>
            {Object.values(CURRENCIES).filter(c => c.code !== 'IDR').map(c => (
              <p key={c.code}>1 {c.code} = Rp {c.rate.toLocaleString('id-ID')}</p>
            ))}
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t('settings.rateSnapshot')}: {EXCHANGE_RATE_DATE}</p>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white font-display mb-4 flex items-center gap-2">
          <Globe className="h-5 w-5 text-slate-400" /> {t('settings.language')}
        </h2>
        <div>
          <label className="label">{t('settings.selectLanguage')}</label>
          <select
            value={i18n.language}
            onChange={(e) => {
              i18n.changeLanguage(e.target.value);
              localStorage.setItem('bais-language', e.target.value);
            }}
            className="input-field max-w-xs"
          >
            <option value="en">English</option>
            <option value="id">Bahasa Indonesia</option>
          </select>
        </div>
      </div>

      <BankAccountsSection />

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white font-display mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-slate-400" /> {t('settings.changePassword')}
        </h2>

        {passwordMsg && (
          <div className={`mb-4 ${passwordMsg.type === 'success' ? 'success-box' : 'error-box'}`}>
            {passwordMsg.text}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="label">{t('settings.currentPassword')}</label>
            <input
              type="password"
              value={passwords.currentPassword}
              onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="label">{t('settings.newPassword')}</label>
            <input
              type="password"
              value={passwords.newPassword}
              onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              className="input-field"
              placeholder={t('settings.minChars')}
              required
            />
          </div>

          <div>
            <label className="label">{t('settings.confirmPassword')}</label>
            <input
              type="password"
              value={passwords.confirmPassword}
              onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <button type="submit" disabled={passwordMutation.isPending} className="inline-flex items-center gap-2 rounded-xl bg-slate-800 dark:bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors">
            <Lock className="h-4 w-4" />
            {passwordMutation.isPending ? 'Changing...' : t('settings.changePassword')}
          </button>
        </form>
      </div>
    </div>
  );
}

function BankAccountsSection() {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', bankName: '', accountNumber: '', currency: 'IDR' });
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  const { data, isLoading } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => api.get('/settings/bank-accounts').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/settings/bank-accounts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      addToast('Bank account added', 'success');
      setShowAdd(false);
      setForm({ name: '', bankName: '', accountNumber: '', currency: 'IDR' });
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Failed to add'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/settings/bank-accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      addToast('Bank account removed', 'success');
    },
  });

  const accounts = data?.data || [];

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white font-display flex items-center gap-2">
          <Building2 className="h-5 w-5 text-slate-400" /> Bank Accounts
        </h2>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-secondary text-xs">
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={(e) => { e.preventDefault(); setError(''); createMutation.mutate(form); }}
          className="mb-4 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3"
        >
          {error && <div className="error-box text-xs">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Account Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="e.g. Operating Account" required />
            </div>
            <div>
              <label className="label">Bank</label>
              <input type="text" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} className="input-field" placeholder="e.g. BCA" required />
            </div>
            <div>
              <label className="label">Account Number</label>
              <input type="text" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} className="input-field" placeholder="1234567890" required />
            </div>
            <div>
              <label className="label">Currency</label>
              <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="input-field">
                <option value="IDR">IDR</option>
                <option value="USD">USD</option>
                <option value="SGD">SGD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary text-xs">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary text-xs">
              {createMutation.isPending ? 'Adding...' : 'Add Account'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>
      ) : accounts.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No bank accounts configured</p>
      ) : (
        <div className="space-y-2">
          {accounts.map((acct: any) => (
            <div key={acct.id} className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{acct.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{acct.bankName} — {acct.accountNumber} ({acct.currency})</p>
              </div>
              <button
                onClick={() => deleteMutation.mutate(acct.id)}
                className="rounded p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
