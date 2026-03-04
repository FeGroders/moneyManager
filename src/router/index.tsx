import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage } from '@/pages/Login'
import { RegisterPage } from '@/pages/Register'
import { DashboardPage } from '@/pages/Dashboard'
import { AppLayout } from '@/layouts/AppLayout'
import { CategoriesPage } from '@/pages/Categories'
import { TransactionsPage } from '@/pages/Transactions'
import { WalletPage } from '@/pages/Wallet'
import { AccountDetailPage } from '@/pages/AccountDetail'

export function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Redireciona raiz para login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Rotas públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Rotas protegidas (com AppLayout) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/wallet" element={<WalletPage />} />
              <Route path="/wallet/:id" element={<AccountDetailPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
