import { useState, type FormEvent } from 'react'
import { X, UserPlus, Shield, KeyRound, Mail, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'

export interface StaffItem {
  id_usuario: number
  nombre_completo: string
  email: string
  rol: 'superadmin' | 'admin' | 'cocina'
  activo: number | boolean
  fecha_creacion?: string
}

interface StaffModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editingUser: StaffItem | null
  currentAuthRole?: string
}

export function StaffModal({
  isOpen,
  onClose,
  onSuccess,
  editingUser,
  currentAuthRole,
}: StaffModalProps) {
  const isEditing = Boolean(editingUser)

  const [nombreCompleto, setNombreCompleto] = useState(editingUser?.nombre_completo || '')
  const [email, setEmail] = useState(editingUser?.email || '')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState<'superadmin' | 'admin' | 'cocina'>(editingUser?.rol || 'admin')
  const [activo, setActivo] = useState(editingUser ? Boolean(editingUser.activo) : true)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isEditing && editingUser) {
        await api.patch(`/api/users/staff/${editingUser.id_usuario}`, {
          nombreCompleto,
          email,
          rol,
          activo: activo ? 1 : 0,
          ...(password.trim() ? { password: password.trim() } : {}),
        })
      } else {
        if (!password || password.length < 6) {
          setError('La contraseña inicial debe tener al menos 6 caracteres')
          setLoading(false)
          return
        }

        await api.post('/api/users/staff', {
          nombreCompleto,
          email,
          password: password.trim(),
          rol,
          activo: activo ? 1 : 0,
        })
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al guardar el usuario.')
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

        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand/15 bg-brand/10 text-brand">
            {isEditing ? <Shield className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-ink">
              {isEditing ? 'Editar Colaborador' : 'Nuevo Colaborador'}
            </h2>
            <p className="text-xs text-ink-mute">
              {isEditing
                ? 'Actualizá los datos de acceso y permisos del equipo'
                : 'Registrá un nuevo miembro de staff en el sistema'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-state-danger-bg p-3 text-xs text-state-danger border border-state-danger/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nombreCompleto" className="text-xs text-ink-secondary mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-ink-mute" />
              Nombre Completo
            </Label>
            <Input
              id="nombreCompleto"
              required
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              placeholder="Ej: Sofía Martínez"
              className="w-full text-sm"
            />
          </div>

          <div>
            <Label htmlFor="email" className="text-xs text-ink-secondary mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-ink-mute" />
              Correo Electrónico
            </Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sofia@smtcatering.com"
              className="w-full text-sm"
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-xs text-ink-secondary mb-1 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-ink-mute" />
              {isEditing ? 'Nueva Contraseña (opcional)' : 'Contraseña de Acceso'}
            </Label>
            <Input
              id="password"
              type="password"
              required={!isEditing}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEditing ? 'Dejar en blanco para no modificar' : 'Mínimo 6 caracteres'}
              className="w-full text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rol" className="text-xs text-ink-secondary mb-1 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-ink-mute" />
                Rol Operativo
              </Label>
              <select
                id="rol"
                value={rol}
                onChange={(e) => setRol(e.target.value as any)}
                className="w-full rounded-md border border-hairline bg-canvas px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
              >
                <option value="cocina">Chef / Cocina</option>
                <option value="admin">Administrador (Socia)</option>
                {currentAuthRole === 'superadmin' && (
                  <option value="superadmin">Superadmin</option>
                )}
              </select>
            </div>

            <div>
              <Label className="text-xs text-ink-secondary mb-1 block">Estado de Cuenta</Label>
              <div className="flex items-center h-10 gap-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={activo}
                    onChange={(e) => setActivo(e.target.checked)}
                    className="h-4 w-4 rounded border-hairline text-brand focus:ring-brand"
                  />
                  <span>{activo ? 'Activo' : 'Inactivo'}</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-hairline">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" variant="brand" disabled={loading}>
              {loading ? 'Guardando…' : isEditing ? 'Guardar Cambios' : 'Crear Colaborador'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
