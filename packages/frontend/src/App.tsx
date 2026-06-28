import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth';
import { MainLayout } from './components/layout/MainLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { AccountsPage } from './pages/accounts/AccountsPage';
import { JournalPage } from './pages/journal/JournalPage';
import { ApprovalsPage } from './pages/workflow/ApprovalsPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { AuditPage } from './pages/audit/AuditPage';
import { COSOPage } from './pages/coso/COSOPage';
import { PiecesPage } from './pages/pieces/PiecesPage';
import { UsersPage } from './pages/users/UsersPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { GeneralLedgerPage } from './pages/general-ledger/GeneralLedgerPage';
import { CustomersPage } from './pages/customers/CustomersPage';
import { VendorsPage } from './pages/vendors/VendorsPage';
import { InvoicesPage } from './pages/invoices/InvoicesPage';
import { PaymentsPage } from './pages/payments/PaymentsPage';
import { BudgetPage } from './pages/budget/BudgetPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/accounts" element={<AccountsPage />} />
                <Route path="/general-ledger" element={<GeneralLedgerPage />} />
                <Route path="/journal" element={<JournalPage />} />
                <Route path="/approvals" element={<ApprovalsPage />} />
                <Route path="/invoices" element={<InvoicesPage />} />
                <Route path="/payments" element={<PaymentsPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/vendors" element={<VendorsPage />} />
                <Route path="/budget" element={<BudgetPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/audit" element={<AuditPage />} />
                <Route path="/coso" element={<COSOPage />} />
                <Route path="/pieces" element={<PiecesPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </MainLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
