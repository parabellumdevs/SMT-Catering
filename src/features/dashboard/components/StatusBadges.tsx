import { Badge, type BadgeVariant } from '@/components/ui/badge'
import type { EventStatus, PaymentStatus } from '@/types/domain'

/**
 * Mapeo de variantes de diseño para los estados del evento (AGENTS.md).
 * Invariante: El ciclo de vida operativo del evento está completamente desacoplado del estado de cobro.
 */
const eventStatus: Record<string, { variant: BadgeVariant; label: string }> = {
  Presupuestado: { variant: 'neutral', label: 'Presupuestado' },
  'Seña pendiente': { variant: 'warn', label: 'Seña pendiente' },
  'Señado / Confirmado': { variant: 'ok', label: 'Señado / Confirmado' },
  'En Producción': { variant: 'info', label: 'En Producción' },
  Completado: { variant: 'neutral', label: 'Completado' },
  Cancelado: { variant: 'danger', label: 'Cancelado' },
}

/**
 * Estados de cobro. Valores canónicos: SEÑA_PENDIENTE, SALDO_PENDIENTE, SALDADO.
 * El resto son alias de compatibilidad con registros existentes.
 */
const paymentStatus: Record<string, { variant: BadgeVariant; label: string }> = {
  SEÑA_PENDIENTE: { variant: 'warn', label: 'Seña pendiente' },
  SALDO_PENDIENTE: { variant: 'info', label: 'Saldo pendiente' },
  SALDADO: { variant: 'ok', label: 'Saldado' },
  // Compatibilidad
  'SEÑA PENDIENTE': { variant: 'warn', label: 'Seña pendiente' },
  'SALDO PENDIENTE': { variant: 'info', label: 'Saldo pendiente' },
  SEÑA_ABONADA: { variant: 'info', label: 'Seña abonada' },
  TOTALMENTE_SALDADO: { variant: 'ok', label: 'Saldado' },
}

/** ¿La seña todavía espera validación del administrador? (acepta ambas grafías) */
export function isDepositPending(status?: string): boolean {
  return status === 'SEÑA_PENDIENTE' || status === 'SEÑA PENDIENTE'
}

export function EventStatusBadge({ status }: { status?: EventStatus | string }) {
  const badge = (status && eventStatus[status]) || {
    variant: 'neutral' as BadgeVariant,
    label: status || 'Desconocido',
  }
  return <Badge variant={badge.variant}>{badge.label}</Badge>
}

export function PaymentStatusBadge({ status }: { status?: PaymentStatus | string }) {
  const badge = (status && paymentStatus[status]) || {
    variant: 'neutral' as BadgeVariant,
    label: status || 'Pendiente',
  }
  return <Badge variant={badge.variant}>{badge.label}</Badge>
}