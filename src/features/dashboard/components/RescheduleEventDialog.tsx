import { useEffect, useMemo, useRef, useState } from 'react'
import { addDays, addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, getDay, isBefore, isSameDay, isSameMonth, parseISO, startOfDay, startOfMonth, startOfWeek, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Lock, Users, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { MIN_BOOKING_DAYS_ADVANCE } from '@/lib/constants'
import type { EventRecord } from '@/types/domain'

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'] as const
const BOOKABLE_WEEKDAYS = new Set([5, 6, 0])
const MAX_GUESTS_PER_DAY = 60

interface RescheduleEventDialogProps {
  readonly event: EventRecord
  readonly events: readonly EventRecord[]
  readonly onClose: () => void
  readonly onReschedule?: (eventId: string, newDate: string, newTime: string) => void
}

export function RescheduleEventDialog({
  event,
  events,
  onClose,
  onReschedule,
}: RescheduleEventDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [selectedDate, setSelectedDate] = useState(event.eventDate)
  const [newTime, setNewTime] = useState(event.startTime?.slice(0, 5) || '13:00')
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(parseISO(event.eventDate)))
  const [today] = useState(() => startOfDay(new Date()))

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    dialog.showModal()
    return () => dialog.close()
  }, [])

  const minBookingDate = useMemo(
    () => addDays(today, MIN_BOOKING_DAYS_ADVANCE),
    [today],
  )
  const selectedDateObj = useMemo(
    () => (selectedDate ? parseISO(selectedDate) : null),
    [selectedDate],
  )
  const dateOccupancyMap = useMemo(() => {
    const occupancy = new Map<string, number>()

    events.forEach((currentEvent) => {
      if (currentEvent.status === 'Cancelado') return

      const currentGuests = occupancy.get(currentEvent.eventDate) ?? 0
      occupancy.set(currentEvent.eventDate, currentGuests + (currentEvent.guests || 0))
    })

    return occupancy
  }, [events])
  const daysInMonth = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)

    return eachDayOfInterval({
      start: startOfWeek(monthStart, { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 }),
    })
  }, [currentMonth])

  const handleConfirm = () => {
    if (selectedDate) {
      onReschedule?.(event.id, selectedDate, newTime)
    }

    onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-0 flex h-full w-full max-h-none max-w-none items-center justify-center border-0 bg-black/40 backdrop-blur-xs p-4"
      aria-labelledby="reschedule-event-title"
      onCancel={(cancelEvent) => {
        cancelEvent.preventDefault()
        onClose()
      }}
    >
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 id="reschedule-event-title" className="font-semibold text-gray-900 text-base">
            Reprogramar Fecha del Evento
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          <p className="text-xs text-gray-500">
            Seleccioná la nueva fecha y horario para el evento de{' '}
            <span className="font-semibold text-gray-800">{event.clientName}</span>.
          </p>

          <div className="rounded-xl border border-gray-200/80 bg-gray-50/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Calendario de Disponibilidad
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Mes anterior"
                  onClick={() => setCurrentMonth((month) => subMonths(month, 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-600 bg-white hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="w-28 text-center text-xs font-medium capitalize text-gray-900">
                  {format(currentMonth, 'MMMM yyyy', { locale: es })}
                </span>
                <button
                  type="button"
                  aria-label="Mes siguiente"
                  onClick={() => setCurrentMonth((month) => addMonths(month, 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-600 bg-white hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-gray-400 mb-1">
              {WEEKDAYS.map((day) => <div key={day}>{day}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {daysInMonth.map((day) => {
                const isoDate = format(day, 'yyyy-MM-dd')
                const isTooSoon = isBefore(day, minBookingDate)
                const isWrongWeekday = !BOOKABLE_WEEKDAYS.has(getDay(day))
                const totalGuests = dateOccupancyMap.get(isoDate) ?? 0
                const effectiveGuests = isoDate === event.eventDate
                  ? Math.max(0, totalGuests - (event.guests || 0))
                  : totalGuests
                const isFullyBooked = effectiveGuests >= MAX_GUESTS_PER_DAY
                const isSelected = selectedDateObj ? isSameDay(day, selectedDateObj) : false
                const isInMonth = isSameMonth(day, currentMonth)
                const isDisabled = isTooSoon || isFullyBooked || isWrongWeekday
                const showLock = isFullyBooked && isInMonth
                const showOccupancy = effectiveGuests > 0
                  && isInMonth
                  && !isWrongWeekday
                  && !isTooSoon

                return (
                  <button
                    key={isoDate}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => setSelectedDate(isoDate)}
                    aria-pressed={isSelected}
                    className={cn(
                      'relative flex h-10 w-full flex-col items-center justify-center rounded-lg text-xs transition-all',
                      !isInMonth && 'opacity-25',
                      isSelected && 'bg-brand text-white font-semibold shadow-xs',
                      !isSelected && isFullyBooked && 'bg-red-50 text-red-600 border border-red-200 cursor-not-allowed',
                      !isSelected && !isFullyBooked && isTooSoon && 'text-gray-300 cursor-not-allowed line-through',
                      !isSelected && !isFullyBooked && !isTooSoon && isWrongWeekday && 'text-gray-300 cursor-not-allowed',
                      !isSelected && !isFullyBooked && !isTooSoon && !isWrongWeekday && isInMonth && 'text-gray-800 bg-white hover:bg-gray-100 border border-gray-200/60',
                    )}
                  >
                    <span className="tnum font-medium">{format(day, 'd')}</span>
                    {showLock && (
                      <Lock className="absolute bottom-1 h-2 w-2 text-red-500" />
                    )}
                    {!showLock && showOccupancy && (
                      <span className="absolute bottom-0.5 text-[8px] font-mono text-gray-400 tnum flex items-center gap-0.5">
                        <Users className="h-1.5 w-1.5" />{' '}{effectiveGuests}p
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="reschedule-event-time"
              className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5"
            >
              Nuevo Horario
            </label>
            <Input
              id="reschedule-event-time"
              type="time"
              value={newTime}
              onChange={(change) => setNewTime(change.target.value)}
              className="w-full rounded-xl border-gray-200 h-11 px-3 text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <Button
              variant="secondary"
              onClick={onClose}
              className="rounded-xl px-5 h-10 border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedDate}
              className="rounded-xl px-6 h-10 bg-brand text-white hover:bg-brand-dark transition-colors shadow-sm disabled:opacity-50"
            >
              Confirmar Reprogramación
            </Button>
          </div>
        </div>
      </div>
    </dialog>
  )
}
