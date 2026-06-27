import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { api } from '../api/client';
import { Blocks } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: tokens } = await api.post('/auth/login', { email, password });
      const { data: user } = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });
      login(user, tokens.accessToken, tokens.refreshToken);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-[#0f1d3d] to-slate-900 px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-900/20 via-transparent to-transparent" />

      <div className="relative w-full max-w-md animate-scale-in">
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-8 shadow-modal border border-slate-200 dark:border-slate-700">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-success-500/15 border border-success-500/20">
              <Blocks className="h-8 w-8 text-success-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display tracking-tight">BAIS</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Blockchain Accounting Information System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="error-box">{error}</div>
            )}

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="admin@bais.local"
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Demo Credentials</p>
            <div className="space-y-1 font-mono text-xs text-slate-600 dark:text-slate-400">
              <p><span className="font-semibold text-slate-700 dark:text-slate-300">Admin:</span> admin@bais.local / admin123!@#</p>
              <p><span className="font-semibold text-slate-700 dark:text-slate-300">Accountant:</span> accountant@bais.local / password123!</p>
              <p><span className="font-semibold text-slate-700 dark:text-slate-300">Manager:</span> manager@bais.local / password123!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
