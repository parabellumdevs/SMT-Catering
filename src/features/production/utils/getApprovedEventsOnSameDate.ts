import type { EventRecord } from '@/types/domain'

function isApprovedForProduction(event: EventRecord): boolean {
  if (event.cancelled || event.status === 'Cancelado') return false

  return event.status === 'Señado / Confirmado'
    || event.status === 'En Producción'
    || event.paymentStatus === 'SALDO_PENDIENTE'
    || event.paymentStatus === 'SALDADO'
}

export function getOtherApprovedEventsOnSameDate(
  event: EventRecord,
  events: readonly EventRecord[],
): EventRecord[] {
  if (!isApprovedForProduction(event)) return []

  return events.filter((candidate) =>
    candidate.id !== event.id
    && candidate.eventDate === event.eventDate
    && isApprovedForProduction(candidate),
  )
}
