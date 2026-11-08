import { useMemo, useState } from 'react'

import { PageHeader } from '@/components/layout/AppShell'
import { cn, daysUntil } from '@/lib/utils'
import { KpiGrid } from '@/features/dashboard/components/KpiGrid'
import { EventCards, EventTable } from '@/features/dashboard/components/EventTable'
import { isDepositPending } from '@/features/dashboard/components/StatusBadges'
import {
  summarizeEvents,
  useEvents,
} from '@/features/dashboard/hooks/useEventsSummary'
import { api } from '@/lib/api'

type EventTab = 'proximos' | 'pasados' | 'cancelados'

/**
 * Módulo 2 — Dashboard Centralizado de Eventos y Costos.
 */
export function DashboardPage() {
  const { data: events = [], isLoading, refetch } = useEvents()
  const [currentTab, setCurrentTab] = useState<EventTab>('proximos')

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

  const handleConfirmDeposit = async (eventId: string) => {
    const target = events.find((e) => e.id === eventId)
    if (target) {
      const now = new Date()
      // Otro evento vigente en la misma fecha: confirmado, o con seña pendiente dentro de su plazo.
      const conflict = events.find((e) => {
        if (e.id === eventId || e.eventDate !== target.eventDate) return false
        if (e.cancelled || e.status === 'Cancelado') return false
        if (isDepositPending(e.paymentStatus)) {
          return e.depositDueAt ? new Date(e.depositDueAt) > now : true
        }
        return true
      })
      if (conflict) {
        const fecha = target.eventDate.split('-').reverse().join('/')
        const seguir = window.confirm(
          `La fecha ${fecha} ya está ocupada por ${conflict.clientName} (${conflict.id}). ¿Confirmar la seña igual?`,
        )
        if (!seguir) return
      }
    }

    try {
      await api.patch(`/api/events/${eventId}`, {
        status: 'Señado / Confirmado',
        paymentStatus: 'SALDO_PENDIENTE',
      })
      await refetch()
    } catch (error) {
      console.error('Fallo al confirmar la seña:', error)
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
              onClick={() => setCurrentTab('proximos')}
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
              onClick={() => setCurrentTab('pasados')}
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
              onClick={() => setCurrentTab('cancelados')}
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
              events={visible}
              isNext={currentTab === 'proximos'}
              onReschedule={handleRescheduleEvent}
              onCancel={handleCancelEvent}
              onConfirmDeposit={handleConfirmDeposit}
            />
            <EventCards
              events={visible}
              isNext={currentTab === 'proximos'}
              onReschedule={handleRescheduleEvent}
              onCancel={handleCancelEvent}
              onConfirmDeposit={handleConfirmDeposit}
            />
          </>
        )}
      </div>
    </>
  )
}
