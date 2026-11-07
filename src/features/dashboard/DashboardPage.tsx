import { useMemo, useState } from 'react'

import { PageHeader } from '@/components/layout/AppShell'
import { cn, daysUntil } from '@/lib/utils'
import { KpiGrid } from '@/features/dashboard/components/KpiGrid'
import { EventCards, EventTable } from '@/features/dashboard/components/EventTable'
import {
  summarizeEvents,
  useEvents,
} from '@/features/dashboard/hooks/useEventsSummary'

type EventTab = 'proximos' | 'pasados'

/**
 * Módulo 2 — Dashboard Centralizado de Eventos y Costos.
 */
export function DashboardPage() {
  const { data: events = [], isLoading } = useEvents()
  const [currentTab, setCurrentTab] = useState<EventTab>('proximos')

  // Filtrado exclusivo por pestaña (Próximos vs Pasados)
  const visible = useMemo(() => {
    return events.filter((e) => {
      const d = daysUntil(e.eventDate)
      return currentTab === 'proximos' ? d >= 0 : d < 0
    })
  }, [events, currentTab])

  const summary = useMemo(() => summarizeEvents(events), [events])

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

          {/* Switch de Pestañas (Próximos / Pasados) */}
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
          </div>
        </div>

        {/* Contenedor principal de la tabla / tarjetas */}
        {isLoading ? (
          <div className="rounded-2xl border border-gray-200/80 bg-white p-12 text-center">
            <p className="text-sm text-ink-mute" role="status">Cargando eventos…</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-gray-200/80 bg-white p-12 text-center">
            <p className="text-sm text-ink-mute">No hay eventos en esta sección.</p>
          </div>
        ) : (
          <>
            <EventTable events={visible} />
            <EventCards events={visible} />
          </>
        )}
      </div>
    </>
  )
}