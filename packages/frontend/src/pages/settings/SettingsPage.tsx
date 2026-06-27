import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/auth';
import { Save, Lock, CheckCircle } from 'lucide-react';

export function SettingsPage() {
  const { user, login, accessToken, refreshToken } = useAuthStore();
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
    admin: 'bg-red-100 text-red-700',
    accountant: 'bg-blue-100 text-blue-700',
    manager: 'bg-purple-100 text-purple-700',
    auditor: 'bg-amber-100 text-amber-700',
    viewer: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your profile and security</p>
      </div>

      {/* Profile Section */}
      <div className="rounded-xl bg-white p-6 shadow-sm border">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile</h2>

        {profileMsg && (
          <div className={`mb-4 rounded-lg p-3 text-sm ${profileMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {profileMsg.text}
          </div>
        )}

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
            <div>
              <span className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${roleColors[user?.role || ''] || ''}`}>
                {user?.role}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={profileMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {profileMutation.isPending ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>

      {/* Password Section */}
      <div className="rounded-xl bg-white p-6 shadow-sm border">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-gray-400" /> Change Password
        </h2>

        {passwordMsg && (
          <div className={`mb-4 rounded-lg p-3 text-sm ${passwordMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {passwordMsg.text}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Current Password</label>
            <input
              type="password"
              value={passwords.currentPassword}
              onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">New Password</label>
            <input
              type="password"
              value={passwords.newPassword}
              onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              placeholder="Min. 8 characters"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Confirm New Password</label>
            <input
              type="password"
              value={passwords.confirmPassword}
              onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              required
            />
          </div>

          <button
            type="submit"
            disabled={passwordMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-50"
          >
            <Lock className="h-4 w-4" />
            {passwordMutation.isPending ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
