import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  CheckSquare,
  BarChart3,
  Shield,
  Activity,
  Target,
  Users,
  LogOut,
  Menu,
  X,
  Blocks,
  Settings,
} from 'lucide-react';
import { NotificationBell } from '../NotificationBell';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Chart of Accounts', href: '/accounts', icon: BookOpen },
  { name: 'Journal Entries', href: '/journal', icon: FileText },
  { name: 'Approvals', href: '/approvals', icon: CheckSquare },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Audit Trail', href: '/audit', icon: Shield },
  { name: 'COSO Framework', href: '/coso', icon: Target },
  { name: 'PIECES Analysis', href: '/pieces', icon: Activity },
];

const adminNavigation = [
  { name: 'User Management', href: '/users', icon: Users },
];

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const allNavItems = user?.role === 'admin'
    ? [...navigation, ...adminNavigation]
    : navigation;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-lg transition-transform duration-200 lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-2 border-b px-6">
            <Blocks className="h-8 w-8 text-primary-600" />
            <span className="text-xl font-bold text-gray-900">BAIS</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {allNavItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { navigate('/settings'); setSidebarOpen(false); }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-700 hover:bg-primary-200 transition-colors"
                title="Settings"
              >
                {user?.fullName?.charAt(0) || 'U'}
              </button>
              <button
                onClick={() => { navigate('/settings'); setSidebarOpen(false); }}
                className="flex-1 min-w-0 text-left hover:opacity-80"
              >
                <p className="truncate text-sm font-medium text-gray-900">{user?.fullName}</p>
                <p className="truncate text-xs text-gray-500 capitalize">{user?.role}</p>
              </button>
              <button
                onClick={logout}
                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center border-b bg-white px-4 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-auto flex items-center gap-4">
            <NotificationBell />
            <div className="flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Blockchain: Mock Mode
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
