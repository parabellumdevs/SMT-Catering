/**
 * App — Enrutador principal de la aplicación SMT Catering.
 *
 * Estructura de rutas:
 *  - /login → LoginPage (pública, sin AppShell).
 *  - / → Cotizador (protegida, dentro de AppShell).
 *  - /mis-eventos → Mis Eventos (protegida, solo rol cliente).
 *  - /dashboard → Dashboard admin (protegida).
 *  - /comandas → Listado de comandas (protegida).
 *  - /comandas/:eventId → Detalle de comanda (protegida).
 *  - /tarifas → Gestión de tarifas (protegida).
 *  - /usuarios → Directorio de usuarios (protegida, admin/superadmin).
 *  - /perfil → Perfil del cliente (protegida, solo rol cliente).
 *
 * Guardia de autenticación y autorización (RBAC):
 *  El componente RoleRoute lee el estado de authStore (isAuthenticated y user.role).
 *  Si no hay sesión activa, redirige a /login. Si el rol no tiene permiso para la
 *  ruta solicitada, redirige automáticamente a la pantalla de inicio de su rol.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import type { UserRole } from '@shared/types/roles'

import { AppShell } from '@/components/layout/AppShell'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { LoginPage } from '@/features/login/LoginPage'
import { MyEventsPage } from '@/features/my-events/MyEventsPage'
import { QuotationPage } from '@/features/quotation/QuotationPage'
import { ComandaDetailPage, ComandaListPage } from '@/features/production/ComandasPage'
import { PricingPage } from '@/features/pricing/PricingPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { MetricsPage } from '@/features/metrics/MetricsPage'
import { UsersPage } from '@/features/users/UsersPage'
import { useAuthStore } from '@/stores/authStore'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

/**
 * Devuelve la pantalla de inicio correspondiente a cada rol:
 * - cliente: / (Cotizador)
 * - cocina, admin, superadmin: /dashboard (Panel operativo de eventos)
 */
function getDefaultRouteForRole(role?: UserRole): string {
  if (role === 'cliente') return '/'
  if (role === 'cocina' || role === 'admin' || role === 'superadmin') return '/dashboard'
  return '/login'
}

/**
 * RoleRoute — Guardia unificado de autenticación y autorización por rol (RBAC).
 *
 * 1. Si no hay sesión activa (isAuthenticated === false) -> redirige a /login.
 * 2. Si el rol no está entre allowedRoles -> redirige al home del rol respectivo.
 * 3. Si está autorizado -> renderiza children o <Outlet />.
 */
interface RoleRouteProps {
  allowedRoles?: UserRole[]
  children?: React.ReactNode
}

function RoleRoute({ allowedRoles, children }: RoleRouteProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.user?.role)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    return <Navigate to={getDefaultRouteForRole(role)} replace />
  }

  return children ? <>{children}</> : <Outlet />
}

export default function App() {
  const checkSession = useAuthStore((s) => s.checkSession)

  useEffect(() => {
    checkSession()
  }, [checkSession])
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            {/* Ruta pública — Login (sin AppShell, pantalla completa) */}
            <Route path="login" element={<LoginPage />} />

            {/* Rutas protegidas — requieren autenticación y rol autorizado */}
            <Route element={<RoleRoute />}>
              <Route element={<AppShell />}>
                <Route
                  index
                  element={
                    <RoleRoute allowedRoles={['cliente', 'admin', 'superadmin']}>
                      <QuotationPage />
                    </RoleRoute>
                  }
                />
                <Route
                  path="mis-eventos"
                  element={
                    <RoleRoute allowedRoles={['cliente']}>
                      <MyEventsPage />
                    </RoleRoute>
                  }
                />
                <Route
                  path="dashboard"
                  element={
                    <RoleRoute allowedRoles={['admin', 'superadmin', 'cocina']}>
                      <DashboardPage />
                    </RoleRoute>
                  }
                />
                <Route
                  path="comandas"
                  element={
                    <RoleRoute allowedRoles={['cocina', 'admin', 'superadmin']}>
                      <ComandaListPage />
                    </RoleRoute>
                  }
                />
                <Route
                  path="comandas/:eventId"
                  element={
                    <RoleRoute allowedRoles={['cocina', 'admin', 'superadmin']}>
                      <ComandaDetailPage />
                    </RoleRoute>
                  }
                />
                <Route
                  path="tarifas"
                  element={
                    <RoleRoute allowedRoles={['admin', 'superadmin']}>
                      <PricingPage />
                    </RoleRoute>
                  }
                />
                <Route
                  path="metricas"
                  element={
                    <RoleRoute allowedRoles={['admin', 'superadmin']}>
                      <MetricsPage />
                    </RoleRoute>
                  }
                />
                <Route
                  path="usuarios"
                  element={
                    <RoleRoute allowedRoles={['admin', 'superadmin']}>
                      <UsersPage />
                    </RoleRoute>
                  }
                />
                <Route
                  path="perfil"
                  element={
                    <RoleRoute allowedRoles={['cliente']}>
                      <ProfilePage />
                    </RoleRoute>
                  }
                />
              </Route>
            </Route>

            {/* Fallback — redirige a inicio */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
