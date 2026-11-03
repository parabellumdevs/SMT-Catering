/**
 * LoginPage — Página de inicio de sesión y contenedor de accesos B2B.
 */
import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { LogIn, Zap, Lock, Award, Mail, KeyRound } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/stores/authStore'
import { ForgotPasswordModal } from '@/features/login/ForgotPasswordModal'
import { RegisterForm } from '@/features/login/RegisterForm' // 👈 Importamos el nuevo componente

import logoEmpresa from '@/assets/Logo empresa.jpeg'

export function LoginPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const login = useAuthStore((s) => s.login)

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')

  /* Estados Login */
  const [usernameInput, setUsernameInput] = useState('')
  const [pass, setPass] = useState('')
  const [loginError, setLoginError] = useState(false)

  const [showForgot, setShowForgot] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const ok = await login(usernameInput.trim(), pass)
    if (!ok) {
      setLoginError(true)
    }
  }

  return (
    <div className="flex min-h-dvh w-full flex-col lg:flex-row bg-white">
      {/* PANEL IZQUIERDO: Branding y Propuesta de Valor */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-brand p-12 text-white relative overflow-hidden">
        <div>
          <Badge variant="outline" className="bg-white/10 text-white/90 border-white/10 px-4 py-1.5 backdrop-blur-sm">
            + Servicio Empresarial Premium
          </Badge>
        </div>

        <div className="my-auto max-w-lg space-y-4">
          <h1 className="text-4xl xl:text-5xl font-light tracking-tight leading-[1.1]">
            Cotizador <br />
            <span className="font-semibold">Empresarial</span>
          </h1>
          <p className="text-sm xl:text-base font-light text-white/80 leading-relaxed">
            Diseñá tu evento corporativo ideal con nuestra plataforma de cotización inteligente. Presupuesto en tiempo real, sin intermediarios.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 pt-8 border-t border-white/15 text-xs xl:text-sm text-white/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-white/10 text-white"><Zap className="h-4 w-4" /></div>
            <div><p className="font-medium text-white">Cotización instantánea</p><p className="text-white/60 text-xs">Presupuesto detallado en minutos</p></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-white/10 text-white"><Lock className="h-4 w-4" /></div>
            <div><p className="font-medium text-white">Precio congelado</p><p className="text-white/60 text-xs">La seña asegura tu tarifa actual</p></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-white/10 text-white"><Award className="h-4 w-4" /></div>
            <div><p className="font-medium text-white">Chefs certificados</p><p className="text-white/60 text-xs">Equipo de servicio profesional incluido</p></div>
          </div>
        </div>
      </div>

      {/* PANEL DERECHO: Pestañas y Formularios */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-12 bg-white relative overflow-y-auto">
        <div className="w-full max-w-md space-y-6 my-auto py-8">
          
          {/* Pestañas de Navegación */}
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className={`flex-1 rounded-md py-2.5 text-xs font-semibold transition-all ${
                activeTab === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('register')}
              className={`flex-1 rounded-md py-2.5 text-xs font-semibold transition-all ${
                activeTab === 'register' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Registrarse
            </button>
          </div>

          {/* VISTA 1: LOGIN */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-5 pt-2">
              <div className="space-y-2">
                <Label htmlFor="login-user" className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Email Corporativo
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="login-user"
                    type="text"
                    placeholder="responsable@empresa.com"
                    autoComplete="username"
                    autoFocus
                    className="pl-10"
                    value={usernameInput}
                    onChange={(e) => { setUsernameInput(e.target.value); setLoginError(false) }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-pass" className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Contraseña
                  </Label>
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-xs font-normal text-gray-500 hover:text-brand hover:underline underline-offset-2 transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="login-pass"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="pl-10"
                    value={pass}
                    onChange={(e) => { setPass(e.target.value); setLoginError(false) }}
                  />
                </div>
              </div>

              {loginError && (
                <p role="alert" className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                  Usuario o contraseña incorrectos, o servidor no disponible.
                </p>
              )}

              <Button
                type="submit"
                variant="brand"
                size="lg"
                className="w-full gap-2 py-6 shadow-md"
                disabled={!usernameInput.trim() || !pass}
              >
                <LogIn className="h-4 w-4" />
                Iniciar Sesión
              </Button>

              <p className="text-center text-xs text-gray-500 pt-2">
                ¿No tenés cuenta?{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className="font-semibold text-brand hover:underline underline-offset-2"
                >
                  Registrate aquí
                </button>
              </p>
            </form>
          )}

          {/* VISTA 2: REGISTRO (Importado del archivo separado) */}
          {activeTab === 'register' && (
            <RegisterForm onSwitchToLogin={() => setActiveTab('login')} />
          )}

        </div>

        {/* Sello institucional */}
        <div className="absolute bottom-6 right-6 z-10 pointer-events-none hidden sm:block">
          <div className="bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-lg border border-white/20 opacity-85 hover:opacity-100 transition-opacity">
            <img src={logoEmpresa} alt="SMT Catering Sello" className="h-12 w-auto object-contain" />
          </div>
        </div>
      </div>

      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
    </div>
  )
}