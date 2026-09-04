import { lazy, Suspense, type ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { RequireRole } from './components/auth/RequireRole'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ClientPortalPage, PortalStatePage } from './pages/PortalPage'

const AdminShell = lazy(async () => ({ default: (await import('./components/admin/AdminShell')).AdminShell }))
const AdminOverviewPage = lazy(async () => ({ default: (await import('./pages/admin/AdminOverviewPage')).AdminOverviewPage }))
const AdminClientsPage = lazy(async () => ({ default: (await import('./pages/admin/AdminClientsPage')).AdminClientsPage }))
const AdminOffersPage = lazy(async () => ({ default: (await import('./pages/admin/AdminOffersPage')).AdminOffersPage }))
const AdminBillingPage = lazy(async () => ({ default: (await import('./pages/admin/AdminBillingPage')).AdminBillingPage }))
const AdminMetaPage = lazy(async () => ({ default: (await import('./pages/admin/AdminMetaPage')).AdminMetaPage }))

function AdminSuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PortalStatePage kind="loading" />}>{children}</Suspense>
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireRole allowedRoles={['client']} />}>
          <Route path="/dashboard" element={<ClientPortalPage />} />
        </Route>
        <Route element={<RequireRole allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminSuspense><AdminShell /></AdminSuspense>}>
            <Route index element={<AdminSuspense><AdminOverviewPage /></AdminSuspense>} />
            <Route path="clients" element={<AdminSuspense><AdminClientsPage /></AdminSuspense>} />
            <Route path="offers" element={<AdminSuspense><AdminOffersPage /></AdminSuspense>} />
            <Route path="billing" element={<AdminSuspense><AdminBillingPage /></AdminSuspense>} />
            <Route path="meta" element={<AdminSuspense><AdminMetaPage /></AdminSuspense>} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  )
}
