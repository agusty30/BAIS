import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Plus, X, Save, Trash2 } from 'lucide-react';
import { useToastStore } from '../../stores/toast';

interface RoleData {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  isActive: boolean;
}

const PERMISSION_GROUPS: Record<string, { label: string; permissions: string[] }> = {
  accounts: {
    label: 'Accounts',
    permissions: ['accounts:create', 'accounts:read', 'accounts:update', 'accounts:delete'],
  },
  journal: {
    label: 'Journal',
    permissions: ['journal:create', 'journal:read', 'journal:update', 'journal:submit', 'journal:post', 'journal:void'],
  },
  approval: {
    label: 'Approvals',
    permissions: ['approval:view', 'approval:decide'],
  },
  reports: {
    label: 'Reports',
    permissions: ['reports:view', 'reports:export'],
  },
  audit: {
    label: 'Audit',
    permissions: ['audit:view', 'audit:verify'],
  },
  admin: {
    label: 'Admin',
    permissions: ['users:manage', 'roles:manage', 'periods:manage', 'workflows:manage'],
  },
  coso: {
    label: 'COSO',
    permissions: ['coso:view', 'coso:evaluate'],
  },
  pieces: {
    label: 'PIECES',
    permissions: ['pieces:view', 'pieces:manage'],
  },
  customers: {
    label: 'Customers',
    permissions: ['customers:read', 'customers:manage'],
  },
  vendors: {
    label: 'Vendors',
    permissions: ['vendors:read', 'vendors:manage'],
  },
  invoices: {
    label: 'Invoices',
    permissions: ['invoices:read', 'invoices:manage'],
  },
  payments: {
    label: 'Payments',
    permissions: ['payments:read', 'payments:manage'],
  },
  budget: {
    label: 'Budget',
    permissions: ['budget:read', 'budget:manage'],
  },
  ledger: {
    label: 'Ledger',
    permissions: ['ledger:read'],
  },
  settings: {
    label: 'Settings',
    permissions: ['settings:manage'],
  },
};

export function RolesPage() {
  const [selectedRole, setSelectedRole] = useState<RoleData | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  const { data, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get('/roles').then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setSelectedRole(null);
      addToast('Role deleted', 'success');
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Delete failed', 'error'),
  });

  const roles: RoleData[] = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Role Management</h1>
          <p className="page-subtitle">Configure permissions for each role</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          Create Role
        </button>
      </div>

      {isLoading ? (
        <div className="card p-8 text-center text-slate-500 dark:text-slate-400">Loading roles...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                  selectedRole?.id === role.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30 dark:border-primary-700'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900 dark:text-white capitalize">{role.name}</span>
                  {role.isSystem && (
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold">System</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{role.description}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{role.permissions.length} permissions</p>
              </button>
            ))}
          </div>

          <div className="lg:col-span-3">
            {selectedRole ? (
              <PermissionMatrix
                role={selectedRole}
                onDelete={() => deleteMutation.mutate(selectedRole.id)}
              />
            ) : (
              <div className="card p-8 text-center text-slate-500 dark:text-slate-400">
                Select a role to view and edit permissions
              </div>
            )}
          </div>
        </div>
      )}

      {showCreate && <CreateRoleModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function PermissionMatrix({ role, onDelete }: { role: RoleData; onDelete: () => void }) {
  const [permissions, setPermissions] = useState<Set<string>>(new Set(role.permissions));
  const [dirty, setDirty] = useState(false);
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  const updateMutation = useMutation({
    mutationFn: (perms: string[]) => api.put(`/roles/${role.id}`, { permissions: perms }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setDirty(false);
      addToast('Permissions updated', 'success');
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Update failed', 'error'),
  });

  const toggle = (perm: string) => {
    const next = new Set(permissions);
    if (next.has(perm)) next.delete(perm);
    else next.add(perm);
    setPermissions(next);
    setDirty(true);
  };

  const toggleGroup = (groupPerms: string[]) => {
    const allChecked = groupPerms.every((p) => permissions.has(p));
    const next = new Set(permissions);
    for (const p of groupPerms) {
      if (allChecked) next.delete(p);
      else next.add(p);
    }
    setPermissions(next);
    setDirty(true);
  };

  // Reset when role changes
  if (!dirty && role.permissions.length !== permissions.size || (!dirty && !role.permissions.every(p => permissions.has(p)))) {
    setPermissions(new Set(role.permissions));
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white capitalize">{role.name}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{role.description}</p>
        </div>
        <div className="flex gap-2">
          {!role.isSystem && (
            <button onClick={onDelete} className="btn-secondary text-red-600 dark:text-red-400">
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
          <button
            onClick={() => updateMutation.mutate(Array.from(permissions))}
            disabled={!dirty || updateMutation.isPending}
            className="btn-primary"
          >
            <Save className="h-4 w-4" />
            {updateMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(PERMISSION_GROUPS).map(([key, group]) => {
          const allChecked = group.permissions.every((p) => permissions.has(p));
          const someChecked = group.permissions.some((p) => permissions.has(p));

          return (
            <div key={key} className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div
                className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 cursor-pointer"
                onClick={() => toggleGroup(group.permissions)}
              >
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                  onChange={() => toggleGroup(group.permissions)}
                  className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{group.label}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">
                  {group.permissions.filter((p) => permissions.has(p)).length}/{group.permissions.length}
                </span>
              </div>
              <div className="px-4 py-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {group.permissions.map((perm) => {
                  const action = perm.split(':')[1];
                  return (
                    <label key={perm} className="flex items-center gap-2 cursor-pointer py-1">
                      <input
                        type="checkbox"
                        checked={permissions.has(perm)}
                        onChange={() => toggle(perm)}
                        className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-xs text-slate-600 dark:text-slate-400 capitalize">{action}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CreateRoleModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (data: { name: string; description: string; permissions: string[] }) =>
      api.post('/roles', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      addToast('Role created', 'success');
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Failed to create role'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Role name is required'); return; }
    mutation.mutate({ name: form.name.trim(), description: form.description.trim(), permissions: [] });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white font-display">Create Role</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="error-box">{error}</div>}

          <div>
            <label className="label">Role Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-field"
              placeholder="e.g. supervisor"
              required
            />
          </div>
          <div>
            <label className="label">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-field"
              placeholder="Brief role description"
            />
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Permissions can be configured after creation using the permission matrix.
          </p>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? 'Creating...' : 'Create Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
