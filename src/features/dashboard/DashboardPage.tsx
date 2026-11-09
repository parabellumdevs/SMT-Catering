import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { PageHeader } from '@/components/layout/AppShell'
import { cn, daysUntil } from '@/lib/utils'
import { KpiGrid } from '@/features/dashboard/components/KpiGrid'
import { EventCards, EventTable } from '@/features/dashboard/components/EventTable'
import {
  summarizeEvents,
  useEvents,
} from '@/features/dashboard/hooks/useEventsSummary'
import { api } from '@/lib/api'

type EventTab = 'proximos' | 'pasados' | 'cancelados'
const EVENTS_PER_PAGE = 10

/**
 * Módulo 2 — Dashboard Centralizado de Eventos y Costos.
 */
export function DashboardPage() {
  const { data: events = [], isLoading, refetch } = useEvents()
  const [currentTab, setCurrentTab] = useState<EventTab>('proximos')
  const [currentPage, setCurrentPage] = useState(1)

  // Filtrado exclusivo por pestaña (Próximos / Pasados / Cancelados)
  const visible = useMemo(() => {
    return events.filter((e) => {
      const d = daysUntil(e.eventDate)
      const isCancelled = e.cancelled === true
      if (currentTab === 'cancelados') return isCancelled
      if (currentTab === 'proximos') return d >= 0 && !isCancelled
      if (currentTab === 'pasados') return d < 0 && !isCancelled
      return false
    })
  }, [events, currentTab])

  const sortedVisible = useMemo(
    () => [...visible].sort((a, b) => (
      currentTab === 'proximos'
        ? a.eventDate.localeCompare(b.eventDate)
        : b.eventDate.localeCompare(a.eventDate)
    )),
    [visible, currentTab],
  )
  const pageCount = Math.ceil(sortedVisible.length / EVENTS_PER_PAGE)
  const activePage = Math.min(
    currentPage,
    Math.max(1, pageCount),
  )
  const paginatedEvents = useMemo(
    () => sortedVisible.slice(
      (activePage - 1) * EVENTS_PER_PAGE,
      activePage * EVENTS_PER_PAGE,
    ),
    [sortedVisible, activePage],
  )
  const firstItem = sortedVisible.length === 0 ? 0 : (activePage - 1) * EVENTS_PER_PAGE + 1
  const lastItem = Math.min(activePage * EVENTS_PER_PAGE, sortedVisible.length)

  const summary = useMemo(() => summarizeEvents(events), [events])

  const handleRescheduleEvent = async (
    eventId: string,
    newDate: string,
    newTime: string,
  ) => {
    try {
      await api.patch(`/api/events/${eventId}`, {
        eventDate: newDate,
        startTime: `${newTime}:00`,
      })
      await refetch()
    } catch (error) {
      console.error('Fallo en la reprogramación:', error)
    }
  }

  const handleCancelEvent = async (
    eventId: string,
  ) => {
    try {
      await api.patch(`/api/events/${eventId}`, {
        cancelled: 1,
      })
      await refetch()
    } catch (error) {
      console.error('Fallo en la cancelacion:', error)
    }
  }

  const handlePayBalance = async (
    eventId: string,
  ) => {
    try {
      await api.patch(`/api/events/${eventId}`, {
        paymentStatus: 'SALDADO',
      })
      await refetch()
    } catch (error) {
      console.error('Fallo en el registro de saldo:', error)
      throw error
    }
  }

  return (
    <>
      <PageHeader
        title="Panel de Administración"
        description="Bienvenida, Ana. Aquí tienes el resumen de hoy."
      />

      <KpiGrid summary={summary} />

      {/* Sección de Gestión de Eventos con el switch a la derecha */}
      <div className="mt-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 tracking-tight">Gestión de Eventos</h2>
            <p className="text-xs text-gray-500 mt-0.5">Agenda completa y control de estado de pagos</p>
          </div>

          {/* Switch de Pestañas (Próximos / Pasados / Cancelados) */}
          <div className="flex items-center bg-gray-100/80 p-1 rounded-xl border border-gray-200/60">
            <button
              type="button"
              onClick={() => {
                setCurrentTab('proximos')
                setCurrentPage(1)
              }}
              className={cn(
                'px-4 py-1.5 text-xs font-semibold rounded-lg transition-all',
                currentTab === 'proximos'
                  ? 'bg-brand text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900',
              )}
            >
              Próximos Eventos
            </button>
            <button
              type="button"
              onClick={() => {
                setCurrentTab('pasados')
                setCurrentPage(1)
              }}
              className={cn(
                'px-4 py-1.5 text-xs font-semibold rounded-lg transition-all',
                currentTab === 'pasados'
                  ? 'bg-brand text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900',
              )}
            >
              Eventos Pasados
            </button>
            <button
              type="button"
              onClick={() => {
                setCurrentTab('cancelados')
                setCurrentPage(1)
              }}
              className={cn(
                'px-4 py-1.5 text-xs font-semibold rounded-lg transition-all',
                currentTab === 'cancelados'
                  ? 'bg-brand text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900',
              )}
            >
              Eventos Cancelados
            </button>
          </div>
        </div>

        {/* Contenedor principal de la tabla / tarjetas */}
        {isLoading && (
          <div className="rounded-2xl border border-gray-200/80 bg-white p-12 text-center">
            <output className="text-sm text-ink-mute">Cargando eventos…</output>
          </div>
        )}
        {!isLoading && visible.length === 0 && (
          <div className="rounded-2xl border border-gray-200/80 bg-white p-12 text-center">
            <p className="text-sm text-ink-mute">No hay eventos en esta sección.</p>
          </div>
        )}
        {!isLoading && visible.length > 0 && (
          <>
            <EventTable
              events={paginatedEvents}
              isNext={currentTab === 'proximos'}
              onReschedule={handleRescheduleEvent}
              onCancel={handleCancelEvent}
              onPayBalance={handlePayBalance}
            />
            <EventCards
              events={paginatedEvents}
              isNext={currentTab === 'proximos'}
              onReschedule={handleRescheduleEvent}
              onCancel={handleCancelEvent}
              onPayBalance={handlePayBalance}
            />
          </>
        )}
        {!isLoading && pageCount > 1 && (
          <nav
            aria-label="Paginación de eventos"
            className="flex flex-col gap-3 rounded-xl border border-gray-200/80 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-xs text-gray-500" aria-live="polite">
              Mostrando {firstItem}–{lastItem} de {sortedVisible.length} eventos
            </p>
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={activePage === 1}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </button>
              <span className="min-w-20 text-center text-xs font-medium text-gray-600">
                Página {activePage} de {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
                disabled={activePage === pageCount}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </nav>
        )}
      </div>
    </>
  )
}
