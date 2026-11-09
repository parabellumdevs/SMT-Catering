import * as Dialog from '@radix-ui/react-dialog'
import { useMemo, useState } from 'react'
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isBefore,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertCircle, CalendarDays, ChevronLeft, ChevronRight, Clock, Loader2, Lock, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useEvents } from '@/features/dashboard/hooks/useEventsSummary'
import { api } from '@/lib/api'
import { MIN_BOOKING_DAYS_ADVANCE } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { EventRecord } from '@/types/domain'

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'] as const
const BOOKABLE_WEEKDAYS = new Set([5, 6, 0]) // Viernes (5), Sábado (6), Domingo (0)

interface ClientRescheduleModalProps {
  readonly event: EventRecord | null
  readonly allEvents?: readonly EventRecord[]
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onRescheduleSuccess: (eventId: string, newDate: string, newTime: string) => void
}

export function ClientRescheduleModal({
  event,
  allEvents = [],
  open,
  onOpenChange,
  onRescheduleSuccess,
}: ClientRescheduleModalProps) {
  const { data: globalEvents = [] } = useEvents()
  const [selectedDate, setSelectedDate] = useState<string>(event?.eventDate || '')
  const [newTime, setNewTime] = useState<string>(event?.startTime?.slice(0, 5) || '19:30')
  const [currentMonth, setCurrentMonth] = useState(() =>
    event ? startOfMonth(parseISO(event.eventDate)) : startOfMonth(new Date()),
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [today] = useState(() => startOfDay(new Date()))
  const minBookingDate = useMemo(() => addDays(today, MIN_BOOKING_DAYS_ADVANCE), [today])

  const selectedDateObj = useMemo(
    () => (selectedDate ? parseISO(selectedDate) : null),
    [selectedDate],
  )

  // Mapa de ocupación de fechas excluyendo el evento actual
  const dateOccupancyMap = useMemo(() => {
    const occupancy = new Map<string, number>()
    const sourceEvents = globalEvents.length > 0 ? globalEvents : allEvents
    sourceEvents.forEach((e) => {
      if (e.status === 'Cancelado' || e.id === event?.id) return
      const current = occupancy.get(e.eventDate) ?? 0
      occupancy.set(e.eventDate, current + (e.guests || 0))
    })
    return occupancy
  }, [globalEvents, allEvents, event])

  const daysInMonth = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    return eachDayOfInterval({
      start: startOfWeek(monthStart, { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 }),
    })
  }, [currentMonth])

  if (!event) return null

  const initialTime = event.startTime?.slice(0, 5) || '19:30'
  const hasChanged = selectedDate !== event.eventDate || newTime !== initialTime

  const handleConfirm = async () => {
    if (!selectedDate || !hasChanged) return
    try {
      setIsSubmitting(true)
      setErrorMessage(null)

      await api.patch(`/api/events/${event.id}`, {
        eventDate: selectedDate,
        startTime: newTime,
      })

      setIsSubmitting(false)
      onRescheduleSuccess(event.id, selectedDate, newTime)
      onOpenChange(false)
    } catch (err: unknown) {
      setIsSubmitting(false)
      const msg = err instanceof Error ? err.message : 'Error al reprogramar'
      setErrorMessage(msg)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl focus:outline-none">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-brand/10 text-brand">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <Dialog.Title className="text-lg font-bold text-gray-900 tracking-tight">
                  Reprogramar Fecha
                </Dialog.Title>
                <Dialog.Description className="text-xs text-gray-500">
                  Reserva {event.id} &bull; Fecha actual: {event.eventDate}
                </Dialog.Description>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              aria-label="Cerrar modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 pt-4">
            <p className="text-xs text-gray-500">
              Podés elegir una nueva fecha para el evento sin ningún recargo tarifario. Los eventos solo pueden realizarse días <strong>viernes, sábados o domingos</strong> con al menos <strong>14 días</strong> de antelación.
            </p>

            {/* Calendario interactivo */}
            <div className="rounded-xl border border-gray-200/80 bg-gray-50/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Seleccionar Nueva Fecha
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

              {/* Días de la semana */}
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-gray-400 mb-1">
                {WEEKDAYS.map((day) => <div key={day}>{day}</div>)}
              </div>

              {/* Grilla de días */}
              <div className="grid grid-cols-7 gap-1">
                {daysInMonth.map((day) => {
                  const isoDate = format(day, 'yyyy-MM-dd')
                  const isTooSoon = isBefore(day, minBookingDate)
                  const isWrongWeekday = !BOOKABLE_WEEKDAYS.has(getDay(day))
                  const totalOccupancy = dateOccupancyMap.get(isoDate) ?? 0

                  // Regla de concurrencia: si hay ocupantes y el evento supera 60 o el total supera 120
                  const isOverCapacity = totalOccupancy > 0 && (event.guests > 60 || totalOccupancy > 60)
                  const isDisabled = isTooSoon || isWrongWeekday || isOverCapacity
                  const isSelected = selectedDateObj ? isSameDay(day, selectedDateObj) : false
                  const isInMonth = isSameMonth(day, currentMonth)

                  return (
                    <button
                      key={isoDate}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setSelectedDate(isoDate)}
                      aria-pressed={isSelected}
                      className={cn(
                        'relative flex h-9 w-full flex-col items-center justify-center rounded-lg text-xs transition-all',
                        !isInMonth && 'opacity-25',
                        isSelected && 'bg-brand text-white font-semibold shadow-xs',
                        !isSelected && isOverCapacity && 'bg-red-50 text-red-500 border border-red-200 cursor-not-allowed',
                        !isSelected && !isOverCapacity && (isTooSoon || isWrongWeekday) && 'text-gray-300 cursor-not-allowed',
                        !isSelected && !isDisabled && isInMonth && 'text-gray-800 bg-white hover:bg-gray-100 border border-gray-200/60',
                      )}
                    >
                      <span className="tnum font-medium">{format(day, 'd')}</span>
                      {isOverCapacity && isInMonth && (
                        <Lock className="absolute bottom-1 h-2 w-2 text-red-500" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Horario */}
            <div>
              <label
                htmlFor="reschedule-time-input"
                className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5"
              >
                <Clock className="h-3.5 w-3.5" />
                Horario de Inicio
              </label>
              <Input
                id="reschedule-time-input"
                type="time"
                min="19:00"
                max="21:00"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full rounded-xl border-gray-200 h-10 px-3 text-sm"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Franja operativa: inicio entre 19:00 y 21:00 hs (3 hs de servicio, finalización máxima 00:00 hs).
              </p>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-100">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 mt-5">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-xl px-4"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting || !selectedDate || !hasChanged}
              className="rounded-xl bg-brand text-white hover:bg-brand-dark transition-colors shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Reprogramando...
                </>
              ) : (
                'Confirmar Reprogramación'
              )}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
