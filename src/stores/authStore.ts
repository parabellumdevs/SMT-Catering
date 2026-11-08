/**
 * Auth Store — Zustand store para gestión de autenticación conectado a la API.
 *
 * Arquitectura de Seguridad (docs/ISSUES.md):
 * - Backend: Autoridad central que valida credenciales y emite cookies HTTP-only de sesión.
 * - Frontend: Almacena { id, username, fullName, email, role } para renderizado y permisos de UI.
 */
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { api, setUnauthorizedHandler } from '@/lib/api'
import type { UserRole } from '@shared/types/roles'

export interface AuthUser {
  id: number | string
  username: string
  fullName?: string
  email?: string
  role?: UserRole
}

interface AuthState {
  isAuthenticated: boolean
  user: AuthUser | null
  username: string | null
  login: (user: string, pass: string) => Promise<boolean>
  logout: () => void
  checkSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      username: null,

      login: async (usernameOrEmail: string, pass: string): Promise<boolean> => {
        try {
          const res = await api.post<{ user: AuthUser }>('/api/auth/login', {
            usernameOrEmail,
            pass,
          })

          if (res?.user) {
            set({
              isAuthenticated: true,
              user: res.user,
              username: res.user.fullName || res.user.username,
            })
            return true
          }
        } catch {
          // Si el backend no está disponible o las credenciales fallan, no autentica
          return false
        }
        return false
      },

      logout: () => {
        api.post('/api/auth/logout').catch(() => {})
        set({ isAuthenticated: false, user: null, username: null })
      },

      checkSession: async () => {
        try {
          const res = await api.get<{ user: AuthUser | null }>('/api/auth/me')
          if (res?.user) {
            set({
              isAuthenticated: true,
              user: res.user,
              username: res.user.fullName || res.user.username,
            })
          } else {
            // Sesión nula (cookie inválida o expirada)
            set({ isAuthenticated: false, user: null, username: null })
          }
        } catch {
          // Sesión no válida, expirada o backend offline
          set({ isAuthenticated: false, user: null, username: null })
        }
      },
    }),
    {
      name: 'smt-auth',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)

// Interceptor reactivo: ante un 401 del backend, limpia el store de inmediato
setUnauthorizedHandler(() => {
  useAuthStore.getState().logout()
})
