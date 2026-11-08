import { Badge, type BadgeVariant } from '@/components/ui/badge'
import type { EventStatus, PaymentStatus } from '@/types/domain'

/**
 * Mapeo de variantes de diseño para los estados del evento (AGENTS.md).
 * Invariante: El ciclo de vida operativo del evento está completamente desacoplado del estado de cobro.
 */
const eventStatus: Record<string, { variant: BadgeVariant; label: string }> = {
  Presupuestado: { variant: 'neutral', label: 'Presupuestado' },
  'Señado / Confirmado': { variant: 'ok', label: 'Señado / Confirmado' },
  'En Producción': { variant: 'info', label: 'En Producción' },
  Completado: { variant: 'neutral', label: 'Completado' },
  Cancelado: { variant: 'danger', label: 'Cancelado' },
}

/**
 * Mapeo de variantes de diseño para los estados financieros de cobro (AGENTS.md).
 * Soporta estados simplificados y compatibilidad retroactiva con registros existentes en la BD.
 */
const paymentStatus: Record<string, { variant: BadgeVariant; label: string }> = {
  SALDO_PENDIENTE: { variant: 'info', label: 'Saldo pendiente' },
  SALDADO: { variant: 'ok', label: 'Saldado' },
  // Compatibilidad con registros existentes en PostgreSQL / migraciones previas
  SEÑA_ABONADA: { variant: 'info', label: 'Seña abonada' },
  SEÑA_PENDIENTE: { variant: 'warn', label: 'Seña pendiente' },
  TOTALMENTE_SALDADO: { variant: 'ok', label: 'Saldado' },
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
