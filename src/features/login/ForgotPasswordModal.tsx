/**
 * ForgotPasswordModal — Modal de recuperación de contraseña en dos pasos.
 *
 * Paso 1 — Solicitar reset:
 *   Captura el email del usuario y llama a POST /api/auth/forgot-password.
 *   El backend genera un código de 6 dígitos (válido 10 min) y lo envía por email.
 *
 * Paso 2 — Confirmar nueva contraseña:
 *   El usuario ingresa el código recibido y su nueva contraseña dos veces.
 *   Llama a POST /api/auth/reset-password. Al éxito vuelve al login.
 */
import { type FormEvent, useState } from 'react'
import { KeyRound, X, Mail, ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'

type Step = 'email' | 'token'

interface ForgotPasswordModalProps {
  onClose: () => void
}

export function ForgotPasswordModal({ onClose }: ForgotPasswordModalProps) {
  const [step, setStep] = useState<Step>('email')

  /* ─── Step 1: Solicitar email ─────────────────────────────────── */
  const [email, setEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailError, setEmailError] = useState('')

  const handleRequestReset = async (e: FormEvent) => {
    e.preventDefault()
    setEmailError('')
    setEmailLoading(true)
    try {
      await api.post('/api/auth/forgot-password', { email: email.trim() })
      setStep('token')
    } catch (err: any) {
      setEmailError(err?.message || 'No se pudo procesar la solicitud.')
    } finally {
      setEmailLoading(false)
    }
  }

  /* ─── Step 2: Confirmar token + nueva contraseña ─────────────── */
  const [token, setToken] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState('')
  const [resetSuccess, setResetSuccess] = useState(false)

  const handleConfirmReset = async (e: FormEvent) => {
    e.preventDefault()
    setResetError('')

    if (newPass !== confirmPass) {
      setResetError('Las contraseñas no coinciden.')
      return
    }
    if (newPass.length < 6) {
      setResetError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setResetLoading(true)
    try {
      await api.post('/api/auth/reset-password', {
        email: email.trim(),
        token: token.trim(),
        newPass,
        confirmPass,
      })
      setResetSuccess(true)
    } catch (err: any) {
      setResetError(err?.message || 'Token inválido o expirado.')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Recuperar contraseña"
    >
      {/* Card */}
      <div className="relative w-full max-w-sm rounded-lg border border-hairline bg-canvas p-8 shadow-[rgba(0,55,112,0.08)_0_8px_24px,rgba(0,55,112,0.04)_0_2px_6px]">
        {/* Cerrar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm p-1 text-ink-mute transition-colors hover:text-ink"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>

        {/* ─── Paso 1: Email ────────────────────────────────────────── */}
        {step === 'email' && (
          <>
            <div className="mb-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-[22px] font-light leading-[1.1] tracking-[-0.22px] text-ink">
                Recuperar contraseña
              </h2>
              <p className="mt-1.5 text-[14px] font-light text-ink-mute">
                Ingresá tu email y te enviaremos un código para restablecer tu contraseña.
              </p>
            </div>

            <form onSubmit={handleRequestReset} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="tu@empresa.com"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setEmailError('')
                  }}
                />
              </div>

              {emailError && (
                <p role="alert" className="text-sm text-state-danger">
                  {emailError}
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full gap-2"
                disabled={!email.trim() || emailLoading}
              >
                <Mail className="h-4 w-4" />
                {emailLoading ? 'Enviando…' : 'Enviar código'}
              </Button>
            </form>
          </>
        )}

        {/* ─── Paso 2: Token + nueva contraseña ────────────────────── */}
        {step === 'token' && !resetSuccess && (
          <>
            <div className="mb-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <KeyRound className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-[22px] font-light leading-[1.1] tracking-[-0.22px] text-ink">
                Ingresá el código
              </h2>
              <p className="mt-1.5 text-[14px] font-light text-ink-mute">
                Revisá tu correo electrónico (si no aparece en Recibidos, chequeá la carpeta de Spam) e ingresá el código.
              </p>
            </div>

            <form onSubmit={handleConfirmReset} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reset-token">Código de verificación (6 dígitos)</Label>
                <Input
                  id="reset-token"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  className="font-mono text-center text-lg font-semibold tracking-[6px]"
                  autoFocus
                  value={token}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                    setToken(val)
                    setResetError('')
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reset-new-pass">Nueva contraseña</Label>
                <Input
                  id="reset-new-pass"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  value={newPass}
                  onChange={(e) => {
                    setNewPass(e.target.value)
                    setResetError('')
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reset-confirm-pass">Confirmar contraseña</Label>
                <Input
                  id="reset-confirm-pass"
                  type="password"
                  placeholder="Repetí la contraseña"
                  autoComplete="new-password"
                  value={confirmPass}
                  onChange={(e) => {
                    setConfirmPass(e.target.value)
                    setResetError('')
                  }}
                />
              </div>

              {resetError && (
                <p role="alert" className="text-sm text-state-danger">
                  {resetError}
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full gap-2"
                disabled={!token.trim() || !newPass || !confirmPass || resetLoading}
              >
                <KeyRound className="h-4 w-4" />
                {resetLoading ? 'Guardando…' : 'Restablecer contraseña'}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setStep('email')
                  setResetError('')
                }}
                className="w-full text-center text-[13px] text-ink-mute underline-offset-2 hover:text-ink hover:underline"
              >
                ← Volver a ingresar el email
              </button>
            </form>
          </>
        )}

        {/* ─── Éxito ───────────────────────────────────────────────── */}
        {resetSuccess && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-state-ok-bg">
              <ShieldCheck className="h-6 w-6 text-state-ok" />
            </div>
            <h2 className="text-[22px] font-light leading-[1.1] tracking-[-0.22px] text-ink">
              ¡Contraseña actualizada!
            </h2>
            <p className="mt-2 text-[14px] font-light text-ink-mute">
              Ya podés iniciar sesión con tu nueva contraseña.
            </p>
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="mt-6 w-full"
              onClick={onClose}
            >
              Ir al login
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
