import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, CircleDollarSign } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Table,
  TBody as TableBody,
  TD as TableCell,
  TH as TableHeaderCell,
  THead as TableHead,
  TR as TableRow,
} from '@/components/ui/table'
import { PaymentStatusBadge } from '@/features/dashboard/components/StatusBadges'
import { RescheduleEventDialog } from '@/features/dashboard/components/RescheduleEventDialog'
import { PayBalanceDialog } from '@/features/dashboard/components/PayBalanceDialog'
import { stationById } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import type { EventRecord } from '@/types/domain'

const EXTRA_LABELS: Record<string, string> = {
  'extra-barra': 'Barra de tragos',
}

interface EventTableProps {
  readonly events: EventRecord[]
  readonly isNext?: boolean
  readonly onReschedule?: (eventId: string, newDate: string, newTime: string) => void
  readonly onCancel: (eventId: string) => void
  readonly onPayBalance?: (eventId: string) => Promise<void> | void
}

function formatEventDate(isoDate: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${isoDate}T00:00:00`))
}

function formatEventTime(event: EventRecord): string {
  const time = 'eventTime' in event && typeof event.eventTime === 'string'
    ? event.eventTime
    : event.startTime

  return time ? time.slice(0, 5) : '13:00'
}

function getContactName(event: EventRecord): string {
  return 'contactName' in event && typeof event.contactName === 'string'
    ? event.contactName
    : 'Mariana Vidal'
}

function sortEvents(events: EventRecord[], isNext: boolean): EventRecord[] {
  return [...events].sort((a, b) => (
    isNext
    ? a.eventDate.localeCompare(b.eventDate)
    : b.eventDate.localeCompare(a.eventDate)
  ))
}

interface EventActionsProps {
  readonly event: EventRecord
  readonly isOpen: boolean
  readonly menuPosition: 'below' | 'above'
  readonly onToggle: () => void
  readonly onReschedule: (event: EventRecord) => void
  readonly onCancel: (eventId: string) => void
  readonly onPayBalance?: (event: EventRecord) => void
  readonly onClose: () => void
}

function EventActions({
  event,
  isOpen,
  menuPosition,
  onToggle,
  onReschedule,
  onCancel,
  onPayBalance,
  onClose,
}: EventActionsProps) {
  const role = useAuthStore((s) => s.user?.role)
  const canPayBalance = role === 'admin' && event.paymentStatus === 'SALDO_PENDIENTE' && !event.cancelled

  const positionClass = menuPosition === 'above'
    ? 'right-0 bottom-full mb-2'
    : 'right-0 mt-2'

  return (
    <div className="relative inline-block text-left">
      <Button
        variant="secondary"
        size="sm"
        className="rounded-lg"
        onClick={onToggle}
      >
        Acciones
      </Button>

      {isOpen && (
        <div className={`absolute ${positionClass} w-52 rounded-xl bg-white shadow-xl border border-gray-100 py-1.5 z-50 text-left`}>
          {canPayBalance && onPayBalance && (
            <button
              type="button"
              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-emerald-700 hover:bg-emerald-50 transition-colors font-medium text-left"
              onClick={() => {
                onClose()
                onPayBalance(event)
              }}
            >
              <CircleDollarSign className="h-3.5 w-3.5 text-emerald-600 shrink-0" />{' '}
              Pagar Saldo
            </button>
          )}
          <Link
            to={`/comandas/${event.id}`}
            className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            onClick={onClose}
          >
            <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />{' '}
            Ver Detalle
          </Link>
          <button
            type="button"
            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors font-medium text-left"
            onClick={() => onReschedule(event)}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-600 shrink-0" />{' '}
            Reprogramar Fecha
          </button>
          <button
            type="button"
            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors font-medium text-left border-t border-gray-100 mt-1 pt-2"
            onClick={() => onCancel(event.id)}
          >
            <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />{' '}
            Cancelar Evento
          </button>
        </div>
      )}
    </div>
  )
}

function StationBadges({ event }: { readonly event: EventRecord }) {
  const selectedIds = [...(event.stationIds ?? []), ...(event.extraIds ?? [])]
  const stations = selectedIds.length > 0
    ? selectedIds.map((id) => EXTRA_LABELS[id] ?? stationById(id).name)
    : ['Entrada', 'Parrilla', 'Dulce']

  return (
    <div className="flex flex-wrap gap-1.5">
      {stations.map((station) => (
        <span
          key={station}
          className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200/80"
        >
          {station}
        </span>
      ))}
    </div>
  )
}

export function EventTable({ events, isNext = false, onReschedule, onCancel, onPayBalance }: EventTableProps) {
  const sortedEvents = useMemo(() => sortEvents(events, isNext), [events, isNext])
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [rescheduleEvent, setRescheduleEvent] = useState<EventRecord | null>(null)
  const [payBalanceEvent, setPayBalanceEvent] = useState<EventRecord | null>(null)

  const handleOpenReschedule = (event: EventRecord) => {
    setRescheduleEvent(event)
    setOpenMenuId(null)
  }

  const handleOpenPayBalance = (event: EventRecord) => {
    setPayBalanceEvent(event)
    setOpenMenuId(null)
  }

  return (
    <>
      <div className="hidden md:block rounded-2xl border border-gray-200/80 bg-white overflow-visible shadow-sm pb-28">
        <Table>
          <TableHead className="bg-gray-50/60 border-b border-gray-100">
            <TableRow>
              <TableHeaderCell className="text-[11px] font-bold uppercase tracking-wider text-gray-400 py-4">Fecha &amp; Hora</TableHeaderCell>
              <TableHeaderCell className="text-[11px] font-bold uppercase tracking-wider text-gray-400 py-4">Empresa / Cliente</TableHeaderCell>
              <TableHeaderCell className="text-[11px] font-bold uppercase tracking-wider text-gray-400 py-4">Invitados</TableHeaderCell>
              <TableHeaderCell className="text-[11px] font-bold uppercase tracking-wider text-gray-400 py-4">Islas Seleccionadas</TableHeaderCell>
              <TableHeaderCell className="text-[11px] font-bold uppercase tracking-wider text-gray-400 py-4">Monto &amp; Estado</TableHeaderCell>
              {isNext && (
                <TableHeaderCell className="text-[11px] font-bold uppercase tracking-wider text-gray-400 py-4 text-right">
                  Acciones
                </TableHeaderCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedEvents.map((event, index) => {
              const isNearBottom = index >= sortedEvents.length - 2
              const currentMenuPosition = isNearBottom ? 'above' : 'below'
              return (
              <TableRow
                key={event.id}
                className="hover:bg-gray-50/40 transition-colors border-b border-gray-100/60 last:border-0 relative"
              >
                <TableCell className="whitespace-nowrap py-4 align-middle">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-gray-100/80 text-brand">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900 tnum block">
                        {formatEventDate(event.eventDate)}
                      </span>
                      <span className="text-xs text-gray-500 tnum">
                        {formatEventTime(event)} hs
                      </span>
                    </div>
                  </div>
                </TableCell>

                <TableCell className="py-4 align-middle">
                  <div>
                    <Link
                      to={`/comandas/${event.id}`}
                      className="font-semibold text-gray-900 hover:text-brand hover:underline block"
                    >
                      {event.clientName}
                    </Link>
                    <span className="text-xs text-gray-500">{getContactName(event)}</span>
                  </div>
                </TableCell>

                <TableCell className="py-4 align-middle">
                  <span className="font-semibold text-gray-800 tnum">{event.guests} pax</span>
                </TableCell>

                <TableCell className="py-4 align-middle">
                  <StationBadges event={event} />
                </TableCell>

                <TableCell className="py-4 align-middle">
                  <div className="space-y-1">
                    <span className="font-semibold text-gray-900 tnum block">
                      {formatCurrency(event.totalCents)}
                    </span>
                    <PaymentStatusBadge status={event.paymentStatus} />
                    {(event.paymentStatus === 'SALDO_PENDIENTE' ) && (
                    <span className="text-xs text-gray-500 tnum block">
                      Saldo: {formatCurrency(event.totalCents - event.depositCents)}
                    </span>
                  )}
                  </div>
                </TableCell>

                {isNext && (
                  <TableCell className="text-right py-4 align-middle relative">
                    <EventActions
                      event={event}
                      isOpen={openMenuId === event.id}
                      menuPosition={currentMenuPosition}
                      onToggle={() => setOpenMenuId(openMenuId === event.id ? null : event.id)}
                      onReschedule={handleOpenReschedule}
                      onPayBalance={handleOpenPayBalance}
                      onClose={() => setOpenMenuId(null)}
                      onCancel={() => onCancel(event.id)}
                    />
                  </TableCell>
                )}
              </TableRow>
)})}
          </TableBody>
        </Table>
      </div>

      {rescheduleEvent && (
        <RescheduleEventDialog
          key={rescheduleEvent.id}
          event={rescheduleEvent}
          events={events}
          onClose={() => setRescheduleEvent(null)}
          onReschedule={onReschedule}
        />
      )}

      {payBalanceEvent && (
        <PayBalanceDialog
          key={payBalanceEvent.id}
          event={payBalanceEvent}
          onClose={() => setPayBalanceEvent(null)}
          onConfirm={async (id) => {
            if (onPayBalance) {
              await onPayBalance(id)
            }
          }}
        />
      )}
    </>
  )
}

/** Tarjetas para móvil (<768px). */
export function EventCards({ events, isNext = false, onReschedule, onCancel, onPayBalance }: EventTableProps) {
  const sortedEvents = useMemo(() => sortEvents(events, isNext), [events, isNext])
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [rescheduleEvent, setRescheduleEvent] = useState<EventRecord | null>(null)
  const [payBalanceEvent, setPayBalanceEvent] = useState<EventRecord | null>(null)

  const handleOpenReschedule = (event: EventRecord) => {
    setRescheduleEvent(event)
    setOpenMenuId(null)
  }

  const handleOpenPayBalance = (event: EventRecord) => {
    setPayBalanceEvent(event)
    setOpenMenuId(null)
  }

  return (
    <>
      <div className="space-y-4 md:hidden">
        {sortedEvents.map((event) => (
          <div
            key={event.id}
            className="rounded-xl border border-gray-200 bg-white border-t-4 border-t-brand p-4 shadow-xs space-y-3 relative"
          >
            <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-2.5">
              <div>
                <span className="text-[10px] font-mono font-bold text-brand bg-brand/10 px-2 py-0.5 rounded mb-1 inline-block">
                  {event.id}
                </span>
                <Link to={`/comandas/${event.id}`} className="block">
                  <h4 className="font-semibold text-gray-900 hover:text-brand hover:underline">
                    {event.clientName}
                  </h4>
                </Link>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-gray-800 tnum block">
                  {formatEventDate(event.eventDate)}
                </span>
                <span className="text-xs text-gray-500 tnum">{formatEventTime(event)} hs</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 font-medium">{event.guests} comensales</span>
              <span className="font-semibold text-gray-900 tnum">
                {formatCurrency(event.totalCents)}
              </span>
            </div>

            <div className="py-1">
              <StationBadges event={event} />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <PaymentStatusBadge status={event.paymentStatus} />
              {isNext && (
                <EventActions
                  event={event}
                  isOpen={openMenuId === event.id}
                  menuPosition="above"
                  onToggle={() => setOpenMenuId(openMenuId === event.id ? null : event.id)}
                  onReschedule={handleOpenReschedule}
                  onPayBalance={handleOpenPayBalance}
                  onClose={() => setOpenMenuId(null)}
                  onCancel={() => onCancel(event.id)}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {rescheduleEvent && (
        <RescheduleEventDialog
          key={rescheduleEvent.id}
          event={rescheduleEvent}
          events={events}
          onClose={() => setRescheduleEvent(null)}
          onReschedule={onReschedule}
        />
      )}

      {payBalanceEvent && (
        <PayBalanceDialog
          key={payBalanceEvent.id}
          event={payBalanceEvent}
          onClose={() => setPayBalanceEvent(null)}
          onConfirm={async (id) => {
            if (onPayBalance) {
              await onPayBalance(id)
            }
          }}
        />
      )}
    </>
  )
}
