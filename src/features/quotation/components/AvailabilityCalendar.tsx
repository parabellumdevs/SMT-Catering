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
import { Calendar, ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { MIN_BOOKING_DAYS_ADVANCE } from '@/lib/constants'
import { useEvents } from '@/features/dashboard/hooks/useEventsSummary'
import { cn } from '@/lib/utils'
import { useQuotationStore } from '@/stores/quotationStore'
import { CONCURRENT_GUEST_MAX } from '@shared/schemas/quotation.schema'

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'] as const

/** Días reservables (según date-fns getDay): viernes, sábado y domingo. */
const BOOKABLE_WEEKDAYS = new Set([5, 6, 0])

export function AvailabilityCalendar() {
  const eventDate = useQuotationStore((s) => s.eventDate)
  const guests = useQuotationStore((s) => s.guests)
  const setEventDate = useQuotationStore((s) => s.setEventDate)
  const { data: events = [], isLoaded } = useEvents()

  const [today] = useState(() => startOfDay(new Date()))
  const minBookingDate = useMemo(() => addDays(today, MIN_BOOKING_DAYS_ADVANCE), [today])
  const [currentMonth, setCurrentMonth] = useState(() =>
    eventDate ? parseISO(eventDate) : minBookingDate,
  )

  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, typeof events>()
    for (const event of events) {
      if (event.status === 'Cancelado' || event.cancelled) continue
      const dateEvents = grouped.get(event.eventDate) ?? []
      dateEvents.push(event)
      grouped.set(event.eventDate, dateEvents)
    }
    return grouped
  }, [events])

  useEffect(() => {
    if (!isLoaded || !eventDate) return

    const dateEvents = eventsByDate.get(eventDate) ?? []
    const canBookConcurrentEvent =
      dateEvents.length === 1
      && (dateEvents[0]?.guests ?? CONCURRENT_GUEST_MAX) <= CONCURRENT_GUEST_MAX
      && guests <= CONCURRENT_GUEST_MAX

    if (dateEvents.length > 0 && !canBookConcurrentEvent) {
      setEventDate(null)
    }
  }, [eventDate, eventsByDate, guests, isLoaded, setEventDate])

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    return eachDayOfInterval({
      start: startOfWeek(monthStart, { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 }),
    })
  }, [currentMonth])

  const selectedDateObj = useMemo(() => (eventDate ? parseISO(eventDate) : null), [eventDate])

  return (
    <section aria-labelledby="calendar-heading" className="rounded-lg border border-hairline bg-canvas p-5 shadow-1">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#581c25]" /> 
            <h2 id="calendar-heading" className="text-heading-lg font-light text-ink">Fecha del evento</h2>
          </div>
          <p className="mt-0.5 text-xs text-ink-mute">
            Antelación mínima: {MIN_BOOKING_DAYS_ADVANCE} días. Solo viernes, sábados y domingos. Se permite un segundo evento si ambos tienen {CONCURRENT_GUEST_MAX} invitados o menos.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setCurrentMonth((m) => subMonths(m, 1))} className="flex h-8 w-8 items-center justify-center rounded-pill border border-hairline text-ink-mute hover:bg-canvas-soft" aria-label="Mes anterior">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="w-32 text-center text-sm font-medium capitalize text-ink">
            {format(currentMonth, 'MMMM yyyy', { locale: es })}
          </span>
          <button type="button" onClick={() => setCurrentMonth((m) => addMonths(m, 1))} className="flex h-8 w-8 items-center justify-center rounded-pill border border-hairline text-ink-mute hover:bg-canvas-soft" aria-label="Mes siguiente">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-ink-mute">
        {WEEKDAYS.map((d) => <div key={d} className="py-1 font-medium">{d}</div>)}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1" role="grid">
        {days.map((day) => {
          const iso = format(day, 'yyyy-MM-dd')
          const isTooSoon = isBefore(day, minBookingDate)
          const dateEvents = eventsByDate.get(iso) ?? []
          const hasSingleSmallEvent =
            dateEvents.length === 1
            && (dateEvents[0]?.guests ?? CONCURRENT_GUEST_MAX) <= CONCURRENT_GUEST_MAX
          const canBookConcurrentEvent = hasSingleSmallEvent && guests <= CONCURRENT_GUEST_MAX
          const isConcurrentAvailable =
            dateEvents.length > 0
            && canBookConcurrentEvent
            && !isTooSoon
            && BOOKABLE_WEEKDAYS.has(getDay(day))
          const isBlocked = dateEvents.length > 0 && !canBookConcurrentEvent
          const isWrongWeekday = !BOOKABLE_WEEKDAYS.has(getDay(day))
          const isSelected = selectedDateObj ? isSameDay(day, selectedDateObj) : false
          const inMonth = isSameMonth(day, currentMonth)
          let availabilityTitle = 'Disponible'

          if (!isLoaded) {
            availabilityTitle = 'Consultando disponibilidad'
          } else if (isTooSoon) {
            availabilityTitle = `Requiere ${MIN_BOOKING_DAYS_ADVANCE}d de anticipación`
          } else if (isWrongWeekday) {
            availabilityTitle = 'Solo viernes, sábados y domingos'
          } else if (isConcurrentAvailable) {
            availabilityTitle = `Permite un segundo evento de hasta ${CONCURRENT_GUEST_MAX} invitados`
          } else if (hasSingleSmallEvent && guests > CONCURRENT_GUEST_MAX) {
            availabilityTitle = `Reducí los invitados a ${CONCURRENT_GUEST_MAX} o menos para reservar esta fecha`
          } else if (isBlocked) {
            availabilityTitle = 'Ocupada'
          }

          return (
            <button
              key={iso}
              type="button"
              disabled={!isLoaded || isTooSoon || isBlocked || isWrongWeekday}
              onClick={() => setEventDate(isSelected ? null : iso)}
              aria-pressed={isSelected}
              title={availabilityTitle}
              className={cn(
                'relative flex h-10 w-full flex-col items-center justify-center rounded-md text-sm transition-colors',
                !inMonth && 'opacity-25',
                isSelected && 'bg-[#581c25] text-white font-medium shadow-1', // 👈 Día seleccionado en borravino
                !isSelected && isBlocked && 'bg-state-danger-bg text-state-danger cursor-not-allowed',
                !isSelected && isConcurrentAvailable && 'border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100',
                !isSelected && !isBlocked && isTooSoon && 'text-ink-mute/40 cursor-not-allowed line-through decoration-hairline',
                !isSelected && isWrongWeekday && 'bg-canvas-soft text-ink-mute/40 cursor-not-allowed',
                isLoaded && !isSelected && !isBlocked && !isTooSoon && !isWrongWeekday && !isConcurrentAvailable && inMonth && 'text-ink hover:bg-canvas-soft',
                !isSelected && !isLoaded && 'cursor-wait text-ink-mute/40',
              )}
            >
              <span className="tnum">{format(day, 'd')}</span>
              {(isBlocked || !isLoaded) && inMonth && <Lock className="absolute bottom-1 h-2.5 w-2.5 text-state-danger opacity-75" />}
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-3 text-xs text-ink-mute">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#581c25]" /> Seleccionada</span> {/* 👈 Puntito de leyenda en borravino */}
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-state-danger" /> Ocupada</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-200" /> Permite un segundo evento de hasta {CONCURRENT_GUEST_MAX}</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-hairline" /> &lt;{MIN_BOOKING_DAYS_ADVANCE} días</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full border border-hairline" /> Disponible</span>
        </div>
        {selectedDateObj && (
          <span className="font-medium text-[#581c25]">{format(selectedDateObj, "EEEE d 'de' MMMM, yyyy", { locale: es })}</span> /* 👈 Texto de fecha seleccionada en borravino */
        )}
      </div>
    </section>
  )
}