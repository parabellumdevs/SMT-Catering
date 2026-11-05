/**
 * ComandaListPage — Módulo de comandas técnicas de cocina.
 */
import { Printer, Calendar } from 'lucide-react'
import { useParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { ComandaTicket } from '@/features/production/components/ComandaTicket'
import { useEvents } from '@/features/dashboard/hooks/useEventsSummary'
import { isWithinProductionWindow } from '@/lib/utils'

export function ComandaListPage() {
  const { data: events = [] } = useEvents()
  
  const windowed = events.filter(
    (e) => e.status !== 'Cancelado' && isWithinProductionWindow(e.eventDate),
  )

  const eventsByDate = windowed.reduce((acc, event) => {
    const dateKey = event.eventDate
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(event)
    return acc
  }, {} as Record<string, typeof windowed>)

  return (
    <>
      <div className="no-print">
        <PageHeader
          title="Comandas de cocina"
          description="Preparaciones, cantidades y restricciones de los próximos servicios."
        />
      </div>

      <div className="space-y-8">
        {Object.entries(eventsByDate).map(([date, dateEvents]) => {
          const formattedDate = new Date(date).toLocaleDateString('es-AR', {
            weekday: 'long',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }).toUpperCase()

          const isSingleEvent = dateEvents.length === 1

          return (
            <div key={date} className="rounded-2xl border border-gray-200/80 bg-gray-50/50 overflow-hidden shadow-sm">
              <div className="bg-brand px-6 py-3.5 text-white flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-md bg-white/10">
                    <Calendar className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold tracking-wide uppercase">{formattedDate}</h3>
                </div>
                <span className="text-xs bg-white/10 text-white/90 px-3 py-1 rounded-full font-medium backdrop-blur-sm border border-white/10">
                  {dateEvents.length} {dateEvents.length === 1 ? 'servicio' : 'servicios'}
                </span>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {dateEvents.map((e) => (
                  <div 
                    key={e.id}
                    className={isSingleEvent ? 'md:col-span-2' : 'md:col-span-1'}
                  >
                    <ComandaTicket event={e} />
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

export function ComandaDetailPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const { data: events = [] } = useEvents()
  const event = events.find((e) => e.id === eventId)

  if (!event) {
    return (
      <div className="no-print">
        <PageHeader title="Comanda no encontrada" description="Volvé al listado de comandas." />
      </div>
    )
  }

  return (
    <>
      <div className="no-print mb-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Imprimir
        </Button>
      </div>
      <ComandaTicket event={event} />
    </>
  )
}