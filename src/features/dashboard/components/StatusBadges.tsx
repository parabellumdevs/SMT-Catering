import { Badge, type BadgeVariant } from '@/components/ui/badge'
import type { EventStatus, PaymentStatus } from '@/types/domain'

/**
 * Mapeo de variantes de diseño para los estados del evento (AGENTS.md).
 * Invariante: El ciclo de vida operativo del evento está completamente desacoplado del estado de cobro.
 */
const eventStatus: Record<EventStatus, { variant: BadgeVariant; label: string }> = {
  Presupuestado: { variant: 'neutral', label: 'Presupuestado' },
  'Señado / Confirmado': { variant: 'ok', label: 'Señado / Confirmado' },
  'En Producción': { variant: 'info', label: 'En Producción' },
  Completado: { variant: 'neutral', label: 'Completado' },
  Cancelado: { variant: 'danger', label: 'Cancelado' },
}

/**
 * Mapeo de variantes de diseño para los estados financieros de cobro (AGENTS.md).
 * Invariante: Avisar saldo pendiente 7 días antes de la fecha del evento.
 */
const paymentStatus: Record<PaymentStatus, { variant: BadgeVariant; label: string }> = {
  SALDO_PENDIENTE: { variant: 'info', label: 'Saldo pendiente' },
  SALDADO: { variant: 'ok', label: 'Saldado' },
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const { variant, label } = eventStatus[status]
  return <Badge variant={variant}>{label}</Badge>
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { variant, label } = paymentStatus[status]
  return <Badge variant={variant}>{label}</Badge>
}
