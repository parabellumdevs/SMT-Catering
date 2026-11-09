import { useState, type FormEvent } from 'react'
import { X, KeyRound, Sparkles, Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import type { ClientItem } from './ClientEditModal'

interface ClientPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  client: ClientItem | null
}

export function ClientPasswordModal({
  isOpen,
  onClose,
  onSuccess,
  client,
}: ClientPasswordModalProps) {
  const [password, setPassword] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen || !client) return null

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&'
    let pwd = ''
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setPassword(pwd)
    setCopied(false)
  }

  const handleCopy = () => {
    if (!password) return
    navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmed = password.trim()
    if (!trimmed || trimmed.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.')
      return
    }

    setLoading(true)
    try {
      await api.patch(`/api/users/clients/${client.id_cliente}`, {
        password: trimmed,
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Error al blanquear la contraseña.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-hairline bg-canvas p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 text-ink-mute hover:text-ink transition-colors rounded-full hover:bg-canvas-soft"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand border border-brand/20">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-ink">Resetear Contraseña</h2>
            <p className="text-xs text-ink-mute">
              Generar nueva clave de acceso para el usuario cliente
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-hairline bg-canvas-soft p-3 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-ink-mute">Usuario:</span>
            <span className="font-medium text-ink">{client.nombre_completo}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ink-mute">Email:</span>
            <span className="font-mono text-ink">{client.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ink-mute">Empresa:</span>
            <span className="text-ink">{client.razon_social}</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-state-danger-bg p-3 text-xs text-state-danger border border-state-danger/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="newPassword" className="text-xs text-ink-secondary">
                Nueva Contraseña
              </Label>
              <button
                type="button"
                onClick={generateRandomPassword}
                className="text-xs text-brand hover:underline flex items-center gap-1 font-medium"
              >
                <Sparkles className="w-3 h-3" />
                Generar aleatoria
              </button>
            </div>

            <div className="relative">
              <Input
                id="newPassword"
                type="text"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full text-sm font-mono pr-10"
              />
              {password && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink-mute hover:text-ink"
                  title="Copiar contraseña"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>
            {copied && (
              <p className="mt-1 text-xs text-emerald-600 font-medium">¡Contraseña copiada al portapapeles!</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-hairline">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" variant="brand" disabled={loading}>
              {loading ? 'Guardando…' : 'Establecer Contraseña'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
