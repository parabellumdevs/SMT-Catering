/**
 * LoginPage — Página de inicio de sesión de SMT Catering (Split-Screen con Sello Institucional).
 */
import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { LogIn, Zap, Lock, Award, Mail, KeyRound } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/authStore'
import { ForgotPasswordModal } from '@/features/login/ForgotPasswordModal'
import { RegisterModal } from '@/features/login/RegisterModal'

// Importá tu logo (ajustá la ruta según dónde lo tengas guardado en src/ o public/)
import logoEmpresa from '@/assets/Logo empresa.jpeg' // o '/Logo empresa.jpeg' si está en public

export function LoginPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const login = useAuthStore((s) => s.login)

  const [usernameInput, setUsernameInput] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [showRegister, setShowRegister] = useState(false)

  /* Si ya está autenticado, redirigir al cotizador */
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const ok = await login(usernameInput.trim(), pass)
    if (!ok) {
      setError(true)
    }
  }

  return (
    <div className="flex min-h-dvh w-full flex-col lg:flex-row bg-white">
      {/* ========================================================= */}
      {/* PANEL IZQUIERDO: Branding, Título y Propuesta de Valor    */}
      {/* ========================================================= */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-brand p-12 text-white relative overflow-hidden">
        {/* Badge superior */}
        <div>
          <span className="inline-flex items-center rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium tracking-wide text-white/90 backdrop-blur-sm border border-white/10">
            + Servicio Empresarial Premium
          </span>
        </div>

        {/* Contenido Central */}
        <div className="my-auto max-w-lg space-y-4">
          <h1 className="text-4xl xl:text-5xl font-light tracking-tight leading-[1.1]">
            Cotizador <br />
            <span className="font-semibold">Empresarial</span>
          </h1>
          <p className="text-sm xl:text-base font-light text-white/80 leading-relaxed">
            Diseñá tu evento corporativo ideal con nuestra plataforma de cotización inteligente. Presupuesto en tiempo real, sin intermediarios.
          </p>
        </div>

        {/* Beneficios Inferiores */}
        <div className="grid grid-cols-1 gap-4 pt-8 border-t border-white/15 text-xs xl:text-sm text-white/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-white/10 text-white">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium text-white">Cotización instantánea</p>
              <p className="text-white/60 text-xs">Presupuesto detallado en minutos</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-white/10 text-white">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium text-white">Precio congelado</p>
              <p className="text-white/60 text-xs">La seña asegura tu tarifa actual</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-white/10 text-white">
              <Award className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium text-white">Chefs certificados</p>
              <p className="text-white/60 text-xs">Equipo de servicio profesional incluido</p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* PANEL DERECHO: Pestañas y Formulario de Autenticación     */}
      {/* ========================================================= */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-md space-y-8">
          
          {/* Pestañas de Navegación / Modos */}
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              className="flex-1 rounded-md bg-white py-2.5 text-xs font-semibold text-gray-900 shadow-sm transition-all"
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => setShowRegister(true)}
              className="flex-1 rounded-md py-2.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-all"
            >
              Registrarse
            </button>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-6 pt-2">
            {/* Campo Email Corporativo */}
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
                  onChange={(e) => {
                    setUsernameInput(e.target.value)
                    setError(false)
                  }}
                />
              </div>
            </div>

            {/* Campo Contraseña */}
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
                  onChange={(e) => {
                    setPass(e.target.value)
                    setError(false)
                  }}
                />
              </div>
            </div>

            {/* Mensaje de error inline */}
            {error && (
              <p role="alert" className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                Usuario o contraseña incorrectos, o servidor no disponible.
              </p>
            )}

            {/* CTA principal */}
            <Button
              type="submit"
              size="lg"
              className="w-full gap-2 bg-brand hover:bg-brand-dark text-white transition-colors py-6 shadow-md"
              disabled={!usernameInput.trim() || !pass}
            >
              <LogIn className="h-4 w-4" />
              Iniciar Sesión
            </Button>
          </form>

          {/* Enlace de registro inferior */}
          <p className="text-center text-xs text-gray-500">
            ¿No tenés cuenta?{' '}
            <button
              type="button"
              onClick={() => setShowRegister(true)}
              className="font-semibold text-brand hover:underline underline-offset-2"
            >
              Registrate aquí
            </button>
          </p>
        </div>
        {/* ===================================================== */}
        {/* SELLO / LOGO INFERIOR DERECHO                         */}
        {/* ===================================================== */}
        <div className="absolute bottom-6 right-6 z-10 pointer-events-none">
          <div className="bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-lg border border-white/20 opacity-85 hover:opacity-100 transition-opacity">
            <img 
              src={logoEmpresa} 
              alt="SMT Catering Sello" 
              className="h-12 w-auto object-contain"
            />
          </div>
        </div>
      </div>

      {/* Modales */}
      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
      {showRegister && (
        <RegisterModal
          onClose={() => setShowRegister(false)}
          onSuccess={() => setShowRegister(false)}
        />
      )}
    </div>
  )
}