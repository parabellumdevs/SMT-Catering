/**
 * ProfilePage — Pantalla de perfil y configuración personal para clientes.
 *
 *  - (Perfil & Configuración Personal [Cliente]):
 *  - Visualización y actualización de información de contacto (nombre, email, teléfono, razón social).
 *  - Formulario de cambio de contraseña con validación de contraseña actual y nueva contraseña.
 *
 * Accesible para usuarios con rol `cliente`.
 * Patrón visual: Cards con elevación sutil sobre canvas-soft, alineado a DESIGN.md.
 */
import { useState, useEffect, type FormEvent } from 'react'
import { Save, Lock, AlertCircle, CheckCircle2, Building2, ShieldCheck, Calendar } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/layout/AppShell'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'

interface ClientProfile {
  razonSocial: string
  cuit: string
  nombreCompleto: string
  cargoResponsable: string
  email: string
  telefono: string
  direccionLegal: string
  fechaAniversario?: string
}

interface StatusMessageProps {
  msg: { type: 'ok' | 'err'; text: string } | null
}

function StatusMessage({ msg }: StatusMessageProps) {
  if (!msg) return null
  return (
    <div
      className={`flex items-center gap-2 rounded-md p-3 text-sm ${msg.type === 'ok'
          ? 'border border-state-ok/20 bg-state-ok-bg text-state-ok'
          : 'border border-state-danger/20 bg-state-danger-bg text-state-danger'
        }`}
    >
      {msg.type === 'ok' ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 shrink-0" />
      )}
      <span>{msg.text}</span>
    </div>
  )
}

export function ProfilePage() {
  /* ─── Estado de datos personales ──────────────────────────────── */
  const [profile, setProfile] = useState<ClientProfile>({
    razonSocial: '',
    cuit: '',
    nombreCompleto: '',
    cargoResponsable: '',
    email: '',
    telefono: '',
    direccionLegal: '',
    fechaAniversario: '',
  })
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  /* ─── Estado de cambio de contraseña ──────────────────────────── */
  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [savingPass, setSavingPass] = useState(false)
  const [passMsg, setPassMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  /* ─── Cargar datos del perfil al montar ───────────────────────── */
  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<{ profile: ClientProfile }>('/api/client/profile')
        if (data?.profile) setProfile(data.profile)
      } catch (err: any) {
        setProfileMsg({ type: 'err', text: err?.message || 'No se pudieron cargar los datos del perfil.' })
      } finally {
        setLoadingProfile(false)
      }
    }
    load()
  }, [])

  /* ─── Guardar datos personales ────────────────────────────────── */
  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault()
    setProfileMsg(null)
    setSavingProfile(true)

    try {
      const res = await api.put<{ success: boolean; profile: ClientProfile }>('/api/client/profile', {
        razonSocial: profile.razonSocial.trim(),
        nombreCompleto: profile.nombreCompleto.trim(),
        cargoResponsable: profile.cargoResponsable.trim(),
        email: profile.email.trim(),
        telefono: profile.telefono.trim(),
        direccionLegal: profile.direccionLegal.trim(),
        fechaAniversario: profile.fechaAniversario?.trim() || undefined,
      })

      if (res?.profile) {
        setProfile(res.profile)
      }

      setProfileMsg({ type: 'ok', text: 'Datos personales y de empresa actualizados correctamente.' })

      // Sincronizar el store de autenticación con el nuevo nombre y email
      const store = useAuthStore.getState()
      if (store.user) {
        useAuthStore.setState({
          user: {
            ...store.user,
            fullName: profile.nombreCompleto.trim(),
            email: profile.email.trim(),
          },
          username: profile.nombreCompleto.trim(),
        })
      }
    } catch (err: any) {
      setProfileMsg({ type: 'err', text: err?.message || 'Error al guardar los datos del perfil.' })
    } finally {
      setSavingProfile(false)
    }
  }

  /* ─── Cambiar contraseña ──────────────────────────────────────── */
  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    setPassMsg(null)

    if (newPass.length < 6) {
      setPassMsg({ type: 'err', text: 'La nueva contraseña debe tener al menos 6 caracteres.' })
      return
    }
    if (newPass !== confirmPass) {
      setPassMsg({ type: 'err', text: 'Las nuevas contraseñas no coinciden.' })
      return
    }

    setSavingPass(true)
    try {
      await api.post('/api/client/change-password', {
        currentPassword: currentPass,
        newPassword: newPass,
      })
      setPassMsg({ type: 'ok', text: 'Contraseña actualizada con éxito.' })
      setCurrentPass('')
      setNewPass('')
      setConfirmPass('')
    } catch (err: any) {
      setPassMsg({ type: 'err', text: err?.message || 'Error al cambiar la contraseña.' })
    } finally {
      setSavingPass(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Perfil & Configuración"
        description="Administrá la información de contacto de tu empresa y tus credenciales de acceso."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ─── Card 1: Información de Contacto & Empresa ──────────── */}
        <section className="rounded-lg border border-hairline bg-canvas p-6 shadow-[rgba(0,55,112,0.08)_0_8px_24px,rgba(0,55,112,0.04)_0_2px_6px]">
          <div className="mb-5 flex items-center gap-2.5">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-medium text-ink">Información de la Empresa</h2>
          </div>

          {loadingProfile ? (
            <p className="py-8 text-center text-sm text-ink-mute">Cargando información del perfil…</p>
          ) : (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Razón Social */}
              <div className="space-y-1.5">
                <Label htmlFor="prof-razon">Razón Social</Label>
                <Input
                  id="prof-razon"
                  value={profile.razonSocial}
                  onChange={(e) => {
                    setProfile((p) => ({ ...p, razonSocial: e.target.value }))
                    setProfileMsg(null)
                  }}
                  placeholder="Razón Social o Nombre de Fantasía"
                  required
                />
              </div>

              {/* CUIT — dato fiscal de solo lectura */}
              <div className="space-y-1.5">
                <Label htmlFor="prof-cuit">CUIT</Label>
                <Input
                  id="prof-cuit"
                  value={profile.cuit}
                  disabled
                  className="bg-canvas-soft text-ink-mute"
                />
                <p className="text-[11px] text-ink-mute">
                  Identificador fiscal no modificable.
                </p>
              </div>

              {/* Nombre y Apellido del responsable */}
              <div className="space-y-1.5">
                <Label htmlFor="prof-nombre">Nombre del responsable</Label>
                <Input
                  id="prof-nombre"
                  value={profile.nombreCompleto}
                  onChange={(e) => {
                    setProfile((p) => ({ ...p, nombreCompleto: e.target.value }))
                    setProfileMsg(null)
                  }}
                  placeholder="Nombre y Apellido"
                  required
                />
              </div>

              {/* Cargo del responsable */}
              <div className="space-y-1.5">
                <Label htmlFor="prof-cargo">Cargo o área</Label>
                <Input
                  id="prof-cargo"
                  value={profile.cargoResponsable}
                  onChange={(e) => {
                    setProfile((p) => ({ ...p, cargoResponsable: e.target.value }))
                    setProfileMsg(null)
                  }}
                  placeholder="Ej: Director de Compras, Gerente de RRHH"
                />
              </div>

              {/* Email de contacto y acceso */}
              <div className="space-y-1.5">
                <Label htmlFor="prof-email">Email corporativo</Label>
                <Input
                  id="prof-email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => {
                    setProfile((p) => ({ ...p, email: e.target.value }))
                    setProfileMsg(null)
                  }}
                  placeholder="contacto@empresa.com"
                  required
                />
                <p className="text-[11px] text-ink-mute">
                  Se utiliza también para iniciar sesión en la plataforma.
                </p>
              </div>

              {/* Teléfono */}
              <div className="space-y-1.5">
                <Label htmlFor="prof-tel">Teléfono de contacto</Label>
                <Input
                  id="prof-tel"
                  value={profile.telefono}
                  onChange={(e) => {
                    setProfile((p) => ({ ...p, telefono: e.target.value }))
                    setProfileMsg(null)
                  }}
                  placeholder="+54 11 1234-5678"
                />
              </div>

              {/* Dirección Legal */}
              <div className="space-y-1.5">
                <Label htmlFor="prof-dir">Dirección legal o sede</Label>
                <Input
                  id="prof-dir"
                  value={profile.direccionLegal}
                  onChange={(e) => {
                    setProfile((p) => ({ ...p, direccionLegal: e.target.value }))
                    setProfileMsg(null)
                  }}
                  placeholder="Av. Leandro N. Alem 1000, CABA"
                />
              </div>

              {/* Fecha de Aniversario / Fundación */}
              <div className="space-y-1.5">
                <Label htmlFor="prof-aniversario">Fecha de aniversario o fundación</Label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-mute" />
                  <Input
                    id="prof-aniversario"
                    type="date"
                    className="pl-10"
                    value={profile.fechaAniversario || ''}
                    onChange={(e) => {
                      setProfile((p) => ({ ...p, fechaAniversario: e.target.value }))
                      setProfileMsg(null)
                    }}
                  />
                </div>
                <p className="text-[11px] text-ink-mute">
                  Permite acceder a promociones o beneficios exclusivos de aniversario empresarial.
                </p>
              </div>

              <StatusMessage msg={profileMsg} />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full gap-2"
                disabled={savingProfile || !profile.nombreCompleto.trim() || !profile.razonSocial.trim() || !profile.email.trim()}
              >
                <Save className="h-4 w-4" />
                {savingProfile ? 'Guardando cambios…' : 'Guardar datos de contacto'}
              </Button>
            </form>
          )}
        </section>

        {/* ─── Card 2: Actualización de Contraseña ─────────────────── */}
        <section className="rounded-lg border border-hairline bg-canvas p-6 shadow-[rgba(0,55,112,0.08)_0_8px_24px,rgba(0,55,112,0.04)_0_2px_6px]">
          <div className="mb-5 flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-medium text-ink">Seguridad & Contraseña</h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pass-current">Contraseña actual</Label>
              <Input
                id="pass-current"
                type="password"
                value={currentPass}
                onChange={(e) => {
                  setCurrentPass(e.target.value)
                  setPassMsg(null)
                }}
                placeholder="Ingresá tu contraseña actual"
                autoComplete="current-password"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pass-new">Nueva contraseña</Label>
              <Input
                id="pass-new"
                type="password"
                value={newPass}
                onChange={(e) => {
                  setNewPass(e.target.value)
                  setPassMsg(null)
                }}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                required
                minLength={6}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pass-confirm">Confirmar nueva contraseña</Label>
              <Input
                id="pass-confirm"
                type="password"
                value={confirmPass}
                onChange={(e) => {
                  setConfirmPass(e.target.value)
                  setPassMsg(null)
                }}
                placeholder="Repetí la nueva contraseña"
                autoComplete="new-password"
                required
                minLength={6}
              />
            </div>

            <StatusMessage msg={passMsg} />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full gap-2"
              disabled={savingPass || !currentPass || !newPass || !confirmPass}
            >
              <Lock className="h-4 w-4" />
              {savingPass ? 'Actualizando contraseña…' : 'Actualizar contraseña'}
            </Button>
          </form>
        </section>
      </div>
    </>
  )
}
