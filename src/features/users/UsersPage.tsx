import { useEffect, useState, useMemo } from 'react'
import {
  Users,
  UserPlus,
  Shield,
  ChefHat,
  Building2,
  Search,
  Edit2,
  Trash2,
  Mail,
  Phone,
  Power,
  KeyRound,
  UserCheck,
  UserX,
} from 'lucide-react'

import { PageHeader } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { StaffModal, type StaffItem } from './StaffModal'
import { ClientEditModal, type ClientItem } from './ClientEditModal'
import { ClientPasswordModal } from './ClientPasswordModal'

export function UsersPage() {
  const currentAuthUser = useAuthStore((s) => s.user)
  const currentAuthRole = currentAuthUser?.role

  const [activeTab, setActiveTab] = useState<'staff' | 'clients' | 'client_users'>('staff')
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<'todos' | 'superadmin' | 'admin' | 'cocina'>('todos')
  const [clientStatusFilter, setClientStatusFilter] = useState<'todos' | 'activos' | 'inactivos'>('todos')

  const [staff, setStaff] = useState<StaffItem[]>([])
  const [clients, setClients] = useState<ClientItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modals state
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffItem | null>(null)

  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<ClientItem | null>(null)

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [passwordTargetClient, setPasswordTargetClient] = useState<ClientItem | null>(null)

  const reloadUsers = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get<{ staff: StaffItem[]; clients: ClientItem[] }>('/api/users')
      setStaff(res.staff || [])
      setClients(res.clients || [])
    } catch (err: any) {
      setError(err.message || 'Error al cargar la lista de usuarios.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    api
      .get<{ staff: StaffItem[]; clients: ClientItem[] }>('/api/users')
      .then((res) => {
        if (active) {
          setStaff(res.staff || [])
          setClients(res.clients || [])
          setLoading(false)
        }
      })
      .catch((err: any) => {
        if (active) {
          setError(err.message || 'Error al cargar la lista de usuarios.')
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [])

  // Filtrado de staff
  const filteredStaff = useMemo(() => {
    return staff.filter((u) => {
      const matchesSearch =
        u.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesRole = roleFilter === 'todos' || u.rol === roleFilter
      return matchesSearch && matchesRole
    })
  }, [staff, searchTerm, roleFilter])

  // Filtrado de empresas clientes
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const term = searchTerm.toLowerCase()
      return (
        c.razon_social.toLowerCase().includes(term) ||
        c.cuit.toLowerCase().includes(term) ||
        c.nombre_completo.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term)
      )
    })
  }, [clients, searchTerm])

  // Filtrado de usuarios clientes
  const filteredClientUsers = useMemo(() => {
    return clients.filter((c) => {
      const term = searchTerm.toLowerCase()
      const matchesSearch =
        c.nombre_completo.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term) ||
        c.razon_social.toLowerCase().includes(term) ||
        c.cuit.toLowerCase().includes(term)

      const isActivo = c.activo === 1 || c.activo === undefined
      const matchesStatus =
        clientStatusFilter === 'todos' ||
        (clientStatusFilter === 'activos' && isActivo) ||
        (clientStatusFilter === 'inactivos' && !isActivo)

      return matchesSearch && matchesStatus
    })
  }, [clients, searchTerm, clientStatusFilter])

  // Toggle rápido de estado activo/inactivo para staff
  const handleToggleStaffStatus = async (user: StaffItem) => {
    const newStatus = user.activo ? 0 : 1
    try {
      await api.patch(`/api/users/staff/${user.id_usuario}`, { activo: newStatus })
      setStaff((prev) =>
        prev.map((item) =>
          item.id_usuario === user.id_usuario ? { ...item, activo: newStatus } : item,
        ),
      )
    } catch (err: any) {
      alert(err.message || 'No se pudo cambiar el estado del usuario.')
    }
  }

  // Toggle rápido de estado habilitado/inhabilitado para cliente
  const handleToggleClientStatus = async (client: ClientItem) => {
    const currentActive = client.activo === 1 || client.activo === undefined
    const newStatus = currentActive ? 0 : 1
    const accion = newStatus === 1 ? 'habilitar' : 'inhabilitar'

    if (!confirm(`¿Estás seguro de ${accion} el acceso al portal para "${client.nombre_completo}" (${client.email})?`)) {
      return
    }

    try {
      await api.patch(`/api/users/clients/${client.id_cliente}`, { activo: newStatus })
      setClients((prev) =>
        prev.map((item) =>
          item.id_cliente === client.id_cliente ? { ...item, activo: newStatus } : item,
        ),
      )
    } catch (err: any) {
      alert(err.message || 'No se pudo cambiar el estado del usuario cliente.')
    }
  }

  // Eliminar staff (solo superadmin)
  const handleDeleteStaff = async (user: StaffItem) => {
    if (!confirm(`¿Estás seguro de eliminar permanentemente a "${user.nombre_completo}"?`)) {
      return
    }

    try {
      await api.delete(`/api/users/staff/${user.id_usuario}`)
      setStaff((prev) => prev.filter((item) => item.id_usuario !== user.id_usuario))
    } catch (err: any) {
      alert(err.message || 'No se pudo eliminar el colaborador.')
    }
  }

  // Los roles comparten el acento de marca; el estado conserva colores semánticos.
  const renderRoleBadge = (rol: string) => {
    switch (rol) {
      case 'superadmin':
        return (
          <span className="inline-flex items-center gap-1 rounded-pill border border-brand/20 bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
            <Shield className="w-3 h-3" />
            Superadmin
          </span>
        )
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 rounded-pill border border-brand/20 bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
            <Users className="w-3 h-3" />
            Administrador
          </span>
        )
      case 'cocina':
        return (
          <span className="inline-flex items-center gap-1 rounded-pill border border-brand/20 bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
            <ChefHat className="w-3 h-3" />
            Cocina / Jefe Prod.
          </span>
        )
      default:
        return <Badge variant="neutral">{rol}</Badge>
    }
  }

  return (
    <>
      <PageHeader
        title="Gestión de Usuarios"
        description="Administración de cuentas internas de staff y usuarios clientes corporativos B2B"
        actions={
          activeTab === 'staff' ? (
            <Button
              onClick={() => {
                setEditingStaff(null)
                setIsStaffModalOpen(true)
              }}
              variant="brand"
              className="flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Nuevo Colaborador
            </Button>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-6 rounded-xl bg-state-danger-bg p-4 text-sm text-state-danger border border-state-danger/20 flex items-center justify-between">
          <span>{error}</span>
          <Button variant="secondary" size="sm" onClick={reloadUsers}>
            Reintentar
          </Button>
        </div>
      )}

      {/* Selector de Pestañas */}
      <div className="flex border-b border-hairline mb-6 gap-6">
        <button
          type="button"
          onClick={() => {
            setActiveTab('staff')
            setSearchTerm('')
          }}
          className={`pb-3 text-sm font-medium flex items-center gap-2 transition-colors border-b-2 -mb-px ${
            activeTab === 'staff'
              ? 'border-brand text-brand font-semibold'
              : 'border-transparent text-ink-mute hover:text-ink'
          }`}
        >
          <Shield className="w-4 h-4" />
          Equipo Interno (Staff)
          <span className="ml-1 rounded-full bg-canvas-soft px-2 py-0.5 text-xs text-ink-secondary">
            {staff.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('clients')
            setSearchTerm('')
          }}
          className={`pb-3 text-sm font-medium flex items-center gap-2 transition-colors border-b-2 -mb-px ${
            activeTab === 'clients'
              ? 'border-brand text-brand font-semibold'
              : 'border-transparent text-ink-mute hover:text-ink'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Clientes Corporativos
          <span className="ml-1 rounded-full bg-canvas-soft px-2 py-0.5 text-xs text-ink-secondary">
            {clients.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('client_users')
            setSearchTerm('')
          }}
          className={`pb-3 text-sm font-medium flex items-center gap-2 transition-colors border-b-2 -mb-px ${
            activeTab === 'client_users'
              ? 'border-brand text-brand font-semibold'
              : 'border-transparent text-ink-mute hover:text-ink'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          Usuarios Clientes (Accesos)
          <span className="ml-1 rounded-full bg-canvas-soft px-2 py-0.5 text-xs text-ink-secondary">
            {clients.length}
          </span>
        </button>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute" />
          <Input
            placeholder={
              activeTab === 'staff'
                ? 'Buscar colaborador o email…'
                : activeTab === 'clients'
                ? 'Buscar por empresa, CUIT o contacto…'
                : 'Buscar usuario cliente, email o empresa…'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-sm w-full"
          />
        </div>

        {activeTab === 'staff' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-ink-mute whitespace-nowrap">Rol:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="text-xs rounded-lg border border-hairline bg-canvas px-3 py-2 text-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
            >
              <option value="todos">Todos los roles</option>
              <option value="superadmin">Superadmin</option>
              <option value="admin">Administrador</option>
              <option value="cocina">Cocina</option>
            </select>
          </div>
        )}

        {activeTab === 'client_users' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-ink-mute whitespace-nowrap">Estado:</span>
            <select
              value={clientStatusFilter}
              onChange={(e) => setClientStatusFilter(e.target.value as any)}
              className="text-xs rounded-lg border border-hairline bg-canvas px-3 py-2 text-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
            >
              <option value="todos">Todos los estados</option>
              <option value="activos">Habilitados</option>
              <option value="inactivos">Inhabilitados</option>
            </select>
          </div>
        )}
      </div>

      {/* Contenido según pestaña activa */}
      {loading ? (
        <div className="py-12 text-center text-ink-mute">Cargando directorio de usuarios…</div>
      ) : activeTab === 'staff' ? (
        /* TAB 1: EQUIPO INTERNO (STAFF) */
        filteredStaff.length === 0 ? (
          <div className="py-12 text-center text-ink-mute rounded-xl border border-hairline bg-canvas">
            No se encontraron colaboradores que coincidan con la búsqueda.
          </div>
        ) : (
          <div className="rounded-xl border border-hairline bg-canvas overflow-hidden shadow-sm">
            <Table>
              <THead>
                <TR>
                  <TH>Nombre y Apellido</TH>
                  <TH>Email de Acceso</TH>
                  <TH>Rol Asignado</TH>
                  <TH>Estado</TH>
                  <TH className="text-right">Acciones</TH>
                </TR>
              </THead>
              <TBody>
                {filteredStaff.map((user) => {
                  const isCurrentLogged = currentAuthUser?.id === user.id_usuario
                  return (
                    <TR key={user.id_usuario}>
                      <TD>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-brand text-xs font-semibold">
                            {user.nombre_completo.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-ink flex items-center gap-1.5">
                              {user.nombre_completo}
                              {isCurrentLogged && (
                                <span className="text-[10px] bg-canvas-soft px-1.5 py-0.5 rounded text-ink-mute">
                                  Tú
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </TD>
                      <TD>
                        <span className="text-xs text-ink-secondary font-mono">{user.email}</span>
                      </TD>
                      <TD>{renderRoleBadge(user.rol)}</TD>
                      <TD>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                              user.activo
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                user.activo ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                            />
                            {user.activo ? 'Activo' : 'Inactivo'}
                          </span>

                          {!isCurrentLogged && (
                            <button
                              type="button"
                              onClick={() => handleToggleStaffStatus(user)}
                              className="p-1 text-ink-mute hover:text-ink transition-colors rounded hover:bg-canvas-soft"
                              title={user.activo ? 'Desactivar acceso' : 'Activar acceso'}
                            >
                              <Power
                                className={`w-3.5 h-3.5 ${
                                  user.activo ? 'text-ink-mute' : 'text-brand'
                                }`}
                              />
                            </button>
                          )}
                        </div>
                      </TD>
                      <TD className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingStaff(user)
                              setIsStaffModalOpen(true)
                            }}
                            className="p-1.5 rounded-md text-ink-mute hover:text-brand hover:bg-brand/5 transition-colors"
                            title="Editar usuario"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {currentAuthRole === 'superadmin' && !isCurrentLogged && (
                            <button
                              type="button"
                              onClick={() => handleDeleteStaff(user)}
                              className="p-1.5 rounded-md text-ink-mute hover:text-state-danger hover:bg-state-danger-bg transition-colors"
                              title="Eliminar colaborador"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>
          </div>
        )
      ) : activeTab === 'clients' ? (
        /* TAB 2: CLIENTES CORPORATIVOS (EMPRESAS B2B) */
        filteredClients.length === 0 ? (
          <div className="py-12 text-center text-ink-mute rounded-xl border border-hairline bg-canvas">
            No se encontraron empresas clientes registradas.
          </div>
        ) : (
          <div className="rounded-xl border border-hairline bg-canvas overflow-hidden shadow-sm">
            <Table>
              <THead>
                <TR>
                  <TH>Empresa (B2B)</TH>
                  <TH>Contacto Responsable</TH>
                  <TH>Datos de Contacto</TH>
                  <TH>Dirección Legal</TH>
                  <TH className="text-right">Acciones</TH>
                </TR>
              </THead>
              <TBody>
                {filteredClients.map((client) => (
                  <TR key={client.id_cliente}>
                    <TD>
                      <div className="flex flex-col">
                        <span className="font-medium text-ink">{client.razon_social}</span>
                        <span className="text-xs text-ink-mute font-mono">CUIT: {client.cuit}</span>
                      </div>
                    </TD>
                    <TD>
                      <div className="flex flex-col">
                        <span className="text-ink">{client.nombre_completo}</span>
                        {client.cargo_responsable && (
                          <span className="text-xs text-ink-mute">{client.cargo_responsable}</span>
                        )}
                      </div>
                    </TD>
                    <TD>
                      <div className="flex flex-col text-xs">
                        <span className="text-ink flex items-center gap-1">
                          <Mail className="w-3 h-3 text-ink-mute" />
                          {client.email}
                        </span>
                        {client.telefono && (
                          <span className="text-ink-mute flex items-center gap-1">
                            <Phone className="w-3 h-3 text-ink-mute" />
                            {client.telefono}
                          </span>
                        )}
                      </div>
                    </TD>
                    <TD>
                      <span className="text-xs text-ink-mute line-clamp-2">
                        {client.direccion_legal || '—'}
                      </span>
                    </TD>
                    <TD className="text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingClient(client)
                          setIsClientModalOpen(true)
                        }}
                        className="p-1.5 rounded-md text-ink-mute hover:text-brand hover:bg-brand/5 transition-colors"
                        title="Editar datos de la empresa"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        )
      ) : (
        /* TAB 3: USUARIOS CLIENTES (ACCESOS Y PASSWORDS) */
        filteredClientUsers.length === 0 ? (
          <div className="py-12 text-center text-ink-mute rounded-xl border border-hairline bg-canvas">
            No se encontraron usuarios clientes que coincidan con la búsqueda.
          </div>
        ) : (
          <div className="rounded-xl border border-hairline bg-canvas overflow-hidden shadow-sm">
            <Table>
              <THead>
                <TR>
                  <TH>Usuario / Responsable</TH>
                  <TH>Empresa Asociada</TH>
                  <TH>Email de Acceso</TH>
                  <TH>Estado del Acceso</TH>
                  <TH className="text-right">Acciones de Cuenta</TH>
                </TR>
              </THead>
              <TBody>
                {filteredClientUsers.map((client) => {
                  const isActivo = client.activo === 1 || client.activo === undefined
                  return (
                    <TR key={client.id_cliente}>
                      <TD>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-brand text-xs font-semibold">
                            {client.nombre_completo.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-ink">{client.nombre_completo}</span>
                            {client.cargo_responsable && (
                              <span className="text-xs text-ink-mute">{client.cargo_responsable}</span>
                            )}
                          </div>
                        </div>
                      </TD>
                      <TD>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-ink">{client.razon_social}</span>
                          <span className="text-xs text-ink-mute font-mono">CUIT: {client.cuit}</span>
                        </div>
                      </TD>
                      <TD>
                        <span className="text-xs text-ink-secondary font-mono flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-ink-mute" />
                          {client.email}
                        </span>
                      </TD>
                      <TD>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full ${
                              isActivo
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {isActivo ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                            {isActivo ? 'Habilitado' : 'Inhabilitado'}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleToggleClientStatus(client)}
                            className="p-1 text-ink-mute hover:text-brand transition-colors rounded hover:bg-brand/5"
                            title={isActivo ? 'Inhabilitar acceso al cliente' : 'Habilitar acceso al cliente'}
                          >
                            <Power
                              className={`w-3.5 h-3.5 ${
                                isActivo ? 'text-ink-mute hover:text-state-danger' : 'text-brand'
                              }`}
                            />
                          </button>
                        </div>
                      </TD>
                      <TD className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setPasswordTargetClient(client)
                              setIsPasswordModalOpen(true)
                            }}
                            className="h-8 text-xs flex items-center gap-1.5 text-brand border-brand/20 hover:bg-brand/10"
                            title="Blanquear o cambiar contraseña"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            Reset Pass
                          </Button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingClient(client)
                              setIsClientModalOpen(true)
                            }}
                            className="p-1.5 rounded-md text-ink-mute hover:text-brand hover:bg-brand/5 transition-colors"
                            title="Editar usuario y empresa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>
          </div>
        )
      )}

      {/* Modal para Crear / Editar Staff */}
      {isStaffModalOpen && (
        <StaffModal
          key={editingStaff ? `staff-${editingStaff.id_usuario}` : 'staff-new'}
          isOpen={isStaffModalOpen}
          onClose={() => setIsStaffModalOpen(false)}
          onSuccess={reloadUsers}
          editingUser={editingStaff}
          currentAuthRole={currentAuthRole}
        />
      )}

      {/* Modal para Editar Cliente */}
      {isClientModalOpen && (
        <ClientEditModal
          key={editingClient ? `client-${editingClient.id_cliente}` : 'client-new'}
          isOpen={isClientModalOpen}
          onClose={() => setIsClientModalOpen(false)}
          onSuccess={reloadUsers}
          client={editingClient}
        />
      )}

      {/* Modal específico para Reset de Contraseña de Cliente */}
      {isPasswordModalOpen && (
        <ClientPasswordModal
          key={passwordTargetClient ? `pwd-${passwordTargetClient.id_cliente}` : 'pwd-new'}
          isOpen={isPasswordModalOpen}
          onClose={() => setIsPasswordModalOpen(false)}
          onSuccess={reloadUsers}
          client={passwordTargetClient}
        />
      )}
    </>
  )
}
