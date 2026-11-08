/**
 * App — Enrutador principal de la aplicación SMT Catering.
 *
 * Estructura de rutas:
 *  - /login → LoginPage (pública, sin AppShell).
 *  - / → Cotizador (protegida, dentro de AppShell).
 *  - /dashboard → Dashboard admin (protegida).
 *  - /comandas → Listado de comandas (protegida).
 *  - /comandas/:eventId → Detalle de comanda (protegida).
 *  - /tarifas → Gestión de tarifas (protegida).
 *  - /perfil → Perfil del cliente (protegida, solo rol cliente).
 *
 * Guardia de autenticación:
 *  El componente ProtectedRoute lee el estado de authStore.
 *  Si no hay sesión activa, redirige a /login preservando la URL
 *  original para posible redirect post-login.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { LoginPage } from '@/features/login/LoginPage'
import { QuotationPage } from '@/features/quotation/QuotationPage'
import { ComandaDetailPage, ComandaListPage } from '@/features/production/ComandasPage'
import { PricingPage } from '@/features/pricing/PricingPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { UsersPage } from '@/features/users/UsersPage'
import { useAuthStore } from '@/stores/authStore'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

/**
 * ProtectedRoute — Guardia de ruta que verifica autenticación.
 *
 * Si el usuario no tiene sesión activa (authStore.isAuthenticated === false),
 * lo redirige a /login. Usa <Outlet /> para renderizar las rutas hijas
 * envueltas en AppShell.
 */
function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

/**
 * AdminRoute — Guardia que restringe rutas exclusivas para Superadmin y Administradores.
 */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const role = useAuthStore((s) => s.user?.role)
  if (role && role !== 'superadmin' && role !== 'admin') {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
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

            {/* Rutas protegidas — requieren autenticación */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route index element={<QuotationPage />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="comandas" element={<ComandaListPage />} />
                <Route path="comandas/:eventId" element={<ComandaDetailPage />} />
                <Route path="tarifas" element={<PricingPage />} />
                <Route
                  path="usuarios"
                  element={
                    <AdminRoute>
                      <UsersPage />
                    </AdminRoute>
                  }
                />
                <Route path="perfil" element={<ProfilePage />} />
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
