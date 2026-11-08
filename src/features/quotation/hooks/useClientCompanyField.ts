import { useEffect, useState } from 'react'

import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

interface ClientProfileBrief {
  razonSocial: string
}

export interface ClientCompanyField {
  /** Valor efectivo del campo "Cliente / Empresa". */
  readonly value: string
  /** true cuando el valor viene del perfil y el usuario todavía no lo editó. */
  readonly isAutoCompleted: boolean
  onChange: (value: string) => void
  /** Vuelve al valor autocompletado (se usa al cerrar el modal). */
  reset: () => void
}

/**
 * Autocompletado del campo "Cliente / Empresa" con la razón social del cliente
 * logueado (`GET /api/client/profile`).
 * Invariante: sólo aplica al rol `cliente`; para staff/admin el campo arranca vacío
 * y se completa a mano, como hasta ahora.
 */
export function useClientCompanyField(open: boolean): ClientCompanyField {
  const role = useAuthStore((s) => s.user?.role)
  const isClient = role === 'cliente'
  /** Razón social del perfil; null = todavía no se pidió. */
  const [company, setCompany] = useState<string | null>(null)
  /** Tipeo del usuario; null = campo sin tocar. */
  const [edited, setEdited] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !isClient || company !== null) return
    let cancelled = false
    api
      .get<{ profile: ClientProfileBrief }>('/api/client/profile')
      .then((res) => {
        if (!cancelled) setCompany(res?.profile?.razonSocial?.trim() ?? '')
      })
      .catch(() => {
        // Sin perfil (o backend caído): no bloquea el formulario.
        if (!cancelled) setCompany('')
      })
    return () => {
      cancelled = true
    }
  }, [open, isClient, company])

  const value = edited ?? company ?? ''

  return {
    value,
    isAutoCompleted: isClient && edited === null && value.length > 0,
    onChange: setEdited,
    reset: () => setEdited(null),
  }
}
