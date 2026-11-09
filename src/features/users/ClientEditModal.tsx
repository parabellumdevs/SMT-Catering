import { useState, type FormEvent } from 'react'
import { X, Building2, User, Mail, Phone, MapPin, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'

export interface ClientItem {
  id_cliente: number
  razon_social: string
  cuit: string
  nombre_completo: string
  cargo_responsable?: string
  email: string
  telefono?: string
  direccion_legal?: string
  fecha_aniversario?: string
  activo?: number
  fecha_creacion?: string
}

interface ClientEditModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  client: ClientItem | null
}

export function ClientEditModal({
  isOpen,
  onClose,
  onSuccess,
  client,
}: ClientEditModalProps) {
  const [razonSocial, setRazonSocial] = useState(client?.razon_social || '')
  const [cuit, setCuit] = useState(client?.cuit || '')
  const [nombreCompleto, setNombreCompleto] = useState(client?.nombre_completo || '')
  const [cargoResponsable, setCargoResponsable] = useState(client?.cargo_responsable || '')
  const [email, setEmail] = useState(client?.email || '')
  const [telefono, setTelefono] = useState(client?.telefono || '')
  const [direccionLegal, setDireccionLegal] = useState(client?.direccion_legal || '')
  const [activo, setActivo] = useState(client?.activo ?? 1)
  const [password, setPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen || !client) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.patch(`/api/users/clients/${client.id_cliente}`, {
        razonSocial,
        cuit,
        nombreCompleto,
        cargoResponsable,
        email,
        telefono,
        direccionLegal,
        activo,
        ...(password.trim() ? { password: password.trim() } : {}),
      })

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el cliente corporativo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-hairline bg-canvas p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 text-ink-mute hover:text-ink transition-colors rounded-full hover:bg-canvas-soft"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand/15 bg-brand/10 text-brand">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-ink">Editar Cliente Corporativo</h2>
            <p className="text-xs text-ink-mute">
              Modificá la información de la empresa y contacto B2B
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-state-danger-bg p-3 text-xs text-state-danger border border-state-danger/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="razonSocial" className="text-xs text-ink-secondary mb-1 block">
                Razón Social
              </Label>
              <Input
                id="razonSocial"
                required
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value)}
                className="w-full text-sm"
              />
            </div>
            <div>
              <Label htmlFor="cuit" className="text-xs text-ink-secondary mb-1 block">
                CUIT
              </Label>
              <Input
                id="cuit"
                required
                value={cuit}
                onChange={(e) => setCuit(e.target.value)}
                className="w-full text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nombreCompleto" className="text-xs text-ink-secondary mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-ink-mute" />
                Responsable
              </Label>
              <Input
                id="nombreCompleto"
                required
                value={nombreCompleto}
                onChange={(e) => setNombreCompleto(e.target.value)}
                className="w-full text-sm"
              />
            </div>
            <div>
              <Label htmlFor="cargoResponsable" className="text-xs text-ink-secondary mb-1 block">
                Cargo
              </Label>
              <Input
                id="cargoResponsable"
                value={cargoResponsable}
                onChange={(e) => setCargoResponsable(e.target.value)}
                placeholder="Ej: Gerente de RRHH"
                className="w-full text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email" className="text-xs text-ink-secondary mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-ink-mute" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-sm"
              />
            </div>
            <div>
              <Label htmlFor="telefono" className="text-xs text-ink-secondary mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-ink-mute" />
                Teléfono
              </Label>
              <Input
                id="telefono"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full text-sm"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="direccionLegal" className="text-xs text-ink-secondary mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-ink-mute" />
              Dirección Legal
            </Label>
            <Input
              id="direccionLegal"
              value={direccionLegal}
              onChange={(e) => setDireccionLegal(e.target.value)}
              className="w-full text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="clientEstado" className="text-xs text-ink-secondary mb-1 block">
                Estado de la Cuenta
              </Label>
              <select
                id="clientEstado"
                value={activo}
                onChange={(e) => setActivo(Number(e.target.value))}
                className="w-full text-sm rounded-md border border-hairline bg-canvas px-3 py-2 text-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
              >
                <option value={1}>Habilitado (Acceso activo)</option>
                <option value={0}>Inhabilitado (Acceso bloqueado)</option>
              </select>
            </div>
            <div>
              <Label htmlFor="clientPassword" className="text-xs text-ink-secondary mb-1 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-ink-mute" />
                Blanquear Clave (opcional)
              </Label>
              <Input
                id="clientPassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Dejar en blanco para conservar"
                className="w-full text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-hairline">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" variant="brand" disabled={loading}>
              {loading ? 'Guardando…' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
