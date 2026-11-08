import * as React from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Settings } from 'lucide-react'

import { GradientMesh } from '@/components/layout/GradientMesh'
import { navItems, useNavLinkClass } from '@/components/layout/nav-items'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

/**
 * Shell responsive:
 * >1024px: sidebar fija borravina con íconos + labels (desktop)
 * 768-1024px: sidebar colapsada a solo íconos (tablet)
 * <768px: bottom navigation bar persistente (móvil)
 */
export function AppShell() {
  const location = useLocation()
  const linkClass = useNavLinkClass()
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const username = useAuthStore((s) => s.username)
  const userRole = useAuthStore((s) => s.user?.role)

  /** Filtra los accesos de la barra lateral según los permisos del rol activo (RBAC) */
  const visibleNavItems = React.useMemo(() => {
    if (!userRole) return navItems
    return navItems.filter((item) => !item.roles || item.roles.includes(userRole))
  }, [userRole])

  /** Cierra sesión y redirige a /login */
  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="relative min-h-dvh bg-canvas-soft">
      {/* Gradient Mesh atmosférico en el tercio superior */}
      <GradientMesh />

      {/* Sidebar desktop/tablet — Borravino corporativo */}
      <aside className="no-print fixed inset-y-0 left-0 z-20 hidden w-16 flex-col border-r border-brand-dark/20 bg-brand py-4 text-white md:flex md:w-16 lg:w-56 shadow-md">
        {/* Branding superior */}
        <div className="mb-6 flex h-10 items-center justify-center lg:justify-start lg:px-4">
          <span className="text-lg font-medium tracking-tight text-white">
            <span className="hidden lg:inline">SMT Catering</span>
            <span className="lg:hidden">SMT</span>
          </span>
        </div>

        {/* Links de navegación */}
        <nav className="flex flex-1 flex-col gap-1.5 px-2" aria-label="Navegación principal">
          {visibleNavItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass} title={label}>
              <Icon className="h-5 w-5 shrink-0" />
              <span className="hidden lg:inline">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Zona de usuario — pie de la sidebar */}
        <div className="mt-auto border-t border-white/15 px-2 pt-3">
          {username ? (
            <p className="mb-2 hidden truncate px-2 text-[11px] text-white/60 lg:block">
              {username}
            </p>
          ) : null}

          {/* Enlace a perfil en sidebar para rol cliente */}
          {userRole === 'cliente' && (
            <NavLink
              to="/perfil"
              className={({ isActive }) =>
                cn(
                  'mb-1 flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
                  isActive
                    ? 'bg-canvas-cream text-brand font-medium'
                    : 'text-white/80 hover:bg-white/10 hover:text-white',
                )
              }
              title="Mi perfil"
            >
              <Settings className="h-5 w-5 shrink-0" />
              <span className="hidden lg:inline">Mi perfil</span>
            </NavLink>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-red-300"
            title="Cerrar sesión"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="hidden lg:inline">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Contenido principal con barra de navegación superior */}
      <div className="pb-20 md:pb-0 md:pl-16 lg:pl-56">
        {/* Barra superior (header) */}
        <header className="no-print sticky top-0 z-10 flex h-14 items-center justify-between border-b border-hairline/60 bg-canvas/80 px-4 backdrop-blur-md md:px-8">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight text-ink md:hidden">SMT Catering</span>
          </div>

          <div className="flex items-center gap-3">
            {username && (
              <span className="text-xs font-light text-ink-mute">
                {username}
              </span>
            )}
            {userRole === 'cliente' && (
              <NavLink
                to="/perfil"
                className={({ isActive }) =>
                  cn(
                    'flex h-9 w-9 items-center justify-center rounded-full border transition-colors',
                    isActive
                      ? 'border-brand bg-brand text-white shadow-sm'
                      : 'border-hairline bg-canvas text-ink-secondary hover:border-brand/40 hover:text-brand',
                  )
                }
                title="Configuración de perfil"
              >
                <Settings className="h-4 w-4" />
              </NavLink>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 md:px-8">
          <ErrorBoundary resetKeys={[location.pathname]}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* Bottom nav — versión móvil */}
      <nav
        className="no-print fixed inset-x-0 bottom-0 z-20 flex border-t border-hairline bg-canvas md:hidden"
        aria-label="Navegación inferior"
      >
        {visibleNavItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors',
                isActive ? 'font-semibold text-brand' : 'text-ink-mute hover:text-ink',
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}

        {userRole === 'cliente' && (
          <NavLink
            to="/perfil"
            className={({ isActive }) =>
              cn(
                'flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors',
                isActive ? 'font-semibold text-brand' : 'text-ink-mute hover:text-ink',
              )
            }
          >
            <Settings className="h-5 w-5" />
            Perfil
          </NavLink>
        )}
      </nav>
    </div>
  )
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-display-lg font-light text-ink">{title}</h1>
        {description ? <p className="mt-1 text-sm text-ink-mute">{description}</p> : null}
      </div>
      {actions ? <div className="flex gap-2">{actions}</div> : null}
    </header>
  )
}