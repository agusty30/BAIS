import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/auth';
import { useCurrencyStore } from '../../stores/currency';
import { CURRENCIES, EXCHANGE_RATE_DATE } from '../../lib/currency';
import type { CurrencyCode } from '../../lib/currency';
import { Save, Lock, DollarSign } from 'lucide-react';

export function SettingsPage() {
  const { user, login, accessToken, refreshToken } = useAuthStore();
  const { currency, setCurrency } = useCurrencyStore();
  const queryClient = useQueryClient();

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
      setProfileMsg({ type: 'success', text: 'Profile updated successfully' });
    },
    onError: (err: any) => setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Update failed' }),
  });

  const passwordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.post('/auth/change-password', data),
    onSuccess: () => {
      setPasswordMsg({ type: 'success', text: 'Password changed successfully' });
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
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your profile and security</p>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white font-display mb-4">Profile</h2>

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
          <DollarSign className="h-5 w-5 text-slate-400" /> Currency
        </h2>
        <div className="space-y-4">
          <div>
            <label className="label">Display Currency</label>
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
            <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">Exchange Rate</p>
            <p>1 USD = Rp {CURRENCIES.USD.rate.toLocaleString('id-ID')}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Rate snapshot: {EXCHANGE_RATE_DATE}</p>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white font-display mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-slate-400" /> Change Password
        </h2>

        {passwordMsg && (
          <div className={`mb-4 ${passwordMsg.type === 'success' ? 'success-box' : 'error-box'}`}>
            {passwordMsg.text}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input
              type="password"
              value={passwords.currentPassword}
              onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="label">New Password</label>
            <input
              type="password"
              value={passwords.newPassword}
              onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              className="input-field"
              placeholder="Min. 8 characters"
              required
            />
          </div>

          <div>
            <label className="label">Confirm New Password</label>
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
            {passwordMutation.isPending ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
