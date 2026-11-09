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
  readonly isLoading: boolean
  readonly hasLoadError: boolean
  onChange: (value: string) => void
  /** Vuelve al valor autocompletado (se usa al cerrar el modal). */
  reset: () => void
}

/**
 * Autocompletado del campo "Cliente / Empresa" con la razón social del cliente
 * logueado (`GET /api/client/profile`). Se precarga mientras el cotizador está
 * montado para que el dato esté disponible al abrir el modal.
 * Invariante: sólo aplica al rol `cliente`; para staff/admin el campo arranca vacío
 * y se completa a mano, como hasta ahora.
 */
export function useClientCompanyField(): ClientCompanyField {
  const role = useAuthStore((s) => s.user?.role)
  const userId = useAuthStore((s) => s.user?.id)
  const isClient = role === 'cliente'
  /** Razón social del perfil; null = todavía no se pidió. */
  const [company, setCompany] = useState<string | null>(null)
  const [loadedForUserId, setLoadedForUserId] = useState<number | string | null>(null)
  /** Tipeo del usuario; null = campo sin tocar. */
  const [edited, setEdited] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoadError, setHasLoadError] = useState(false)

  useEffect(() => {
    if (!isClient || userId === undefined) {
      setCompany(null)
      setLoadedForUserId(null)
      setEdited(null)
      setIsLoading(false)
      setHasLoadError(false)
      return
    }
    if (loadedForUserId === userId) return

    let cancelled = false
    setCompany(null)
    setEdited(null)
    setIsLoading(true)
    setHasLoadError(false)
    api
      .get<{ profile: ClientProfileBrief }>('/api/client/profile')
      .then((res) => {
        if (!cancelled) {
          setCompany(res?.profile?.razonSocial?.trim() ?? '')
          setLoadedForUserId(userId)
        }
      })
      .catch((error: unknown) => {
        console.error('No se pudo cargar la razón social del perfil:', error)
        if (!cancelled) {
          setHasLoadError(true)
          setCompany('')
          setLoadedForUserId(userId)
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isClient, userId, loadedForUserId])

  const value = edited ?? company ?? ''

  return {
    value,
    isAutoCompleted: isClient && edited === null && value.length > 0,
    isLoading,
    hasLoadError,
    onChange: setEdited,
    reset: () => setEdited(null),
  }
}
