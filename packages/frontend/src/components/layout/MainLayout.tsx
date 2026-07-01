import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/auth';
import { useThemeStore } from '../../stores/theme';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  CheckSquare,
  BarChart3,
  Shield,
  ShieldCheck,
  Activity,
  Target,
  Users,
  LogOut,
  Menu,
  X,
  Blocks,
  Package,
  Settings,
  Sun,
  Moon,
  BookOpenCheck,
  Receipt,
  CreditCard,
  UserCircle,
  Store,
  Wallet,
  ChevronDown,
} from 'lucide-react';
import { NotificationBell } from '../NotificationBell';

interface NavSection {
  label: string;
  items: { key: string; href: string; icon: any }[];
}

const navSections: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { key: 'nav.dashboard', href: '/', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Financial',
    items: [
      { key: 'nav.chartOfAccounts', href: '/accounts', icon: BookOpen },
      { key: 'nav.journalEntries', href: '/journal', icon: FileText },
      { key: 'nav.approvals', href: '/approvals', icon: CheckSquare },
      { key: 'nav.budget', href: '/budget', icon: Wallet },
    ],
  },
  {
    label: 'Operations',
    items: [
      { key: 'nav.invoices', href: '/invoices', icon: Receipt },
      { key: 'nav.payments', href: '/payments', icon: CreditCard },
      { key: 'nav.customers', href: '/customers', icon: UserCircle },
      { key: 'nav.vendors', href: '/vendors', icon: Store },
      { key: 'nav.inventory', href: '/inventory', icon: Package },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { key: 'nav.generalLedger', href: '/general-ledger', icon: BookOpenCheck },
      { key: 'nav.reports', href: '/reports', icon: BarChart3 },
      { key: 'nav.auditTrail', href: '/audit', icon: Shield },
      { key: 'nav.blockchainExplorer', href: '/blockchain', icon: Blocks },
      { key: 'nav.cosoFramework', href: '/coso', icon: Target },
      { key: 'nav.piecesAnalysis', href: '/pieces', icon: Activity },
    ],
  },
];

const adminSection: NavSection = {
  label: 'Admin',
  items: [
    { key: 'nav.userManagement', href: '/users', icon: Users },
    { key: 'nav.roleManagement', href: '/roles', icon: ShieldCheck },
    { key: 'nav.taxConfig', href: '/tax', icon: Receipt },
  ],
};

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { t } = useTranslation();

  const sections = user?.role === 'admin'
    ? [...navSections, adminSection]
    : navSections;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-[#0f1d3d] transition-transform duration-200 lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 border-b border-white/10 px-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success-500/20">
              <Blocks className="h-5 w-5 text-success-400" />
            </div>
            <span className="text-xl font-bold text-white font-display tracking-tight">BAIS</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {sections.map((section) => (
              <div key={section.label} className="mb-4">
                {section.label !== 'Overview' && (
                  <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                    {section.label}
                  </div>
                )}
                {section.items.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.key}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                        isActive
                          ? 'bg-success-500/15 text-success-400'
                          : 'text-slate-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <item.icon className={`h-4 w-4 ${isActive ? 'text-success-400' : ''}`} />
                      {t(item.key)}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* User info */}
          <div className="border-t border-white/10 p-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { navigate('/settings'); setSidebarOpen(false); }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600/30 text-sm font-medium text-primary-300 hover:bg-primary-600/50 transition-colors"
                title="Settings"
              >
                {user?.fullName?.charAt(0) || 'U'}
              </button>
              <button
                onClick={() => { navigate('/settings'); setSidebarOpen(false); }}
                className="flex-1 min-w-0 text-left hover:opacity-80"
              >
                <p className="truncate text-sm font-medium text-white">{user?.fullName}</p>
                <p className="truncate text-xs text-slate-400 capitalize">{user?.role}</p>
              </button>
              <button
                onClick={logout}
                className="rounded p-1.5 text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-colors"
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
        <header className="flex h-16 items-center border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <NotificationBell />
            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>
            <div className="flex items-center gap-2 rounded-full bg-success-50 dark:bg-success-950/50 px-3 py-1 text-xs font-medium text-success-700 dark:text-success-400 border border-success-200 dark:border-success-800">
              <span className="h-2 w-2 rounded-full bg-success-500" />
              Blockchain: Mock
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
