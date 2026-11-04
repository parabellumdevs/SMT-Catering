/**
 * ComandaListPage — Módulo de comandas técnicas de cocina.
 * Diseño refinado: Cards en blanco puro con acento borravino y estructura moderna.
 */
import { Printer, Calendar, MapPin, Download, Users, Clock, AlertTriangle } from 'lucide-react'
import { useParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { ComandaTicket } from '@/features/production/components/ComandaTicket'
import { DownloadButton } from '@/features/production/components/DownloadButton'
import { useEvents } from '@/features/dashboard/hooks/useEventsSummary'
import { generateKitchenExport } from '@/features/production/utils/generateKitchenExport'
import { isWithinProductionWindow } from '@/lib/utils'

function formatEventRestrictions(event: any): string {
  const parts: string[] = []
  if (event.celiacos > 0) parts.push(event.celiacos === 1 ? '1 celíaco' : `${event.celiacos} celíacos`)
  if (event.vegetarianos > 0) parts.push(event.vegetarianos === 1 ? '1 vegetariano' : `${event.vegetarianos} vegetarianos`)
  if (event.veganos > 0) parts.push(event.veganos === 1 ? '1 vegano' : `${event.veganos} veganos`)
  if (event.alergias) parts.push(`alergias: ${event.alergias}`)
  if (event.observaciones) parts.push(event.observaciones)

  return parts.length > 0 ? parts.join(', ') : 'Sin restricciones registradas'
}

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
              {/* Header de la jornada */}
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

              {/* Grid de Cards */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {dateEvents.map((e: any) => {
                  const hasRestrictions =
                    (e.celiacos && e.celiacos > 0) ||
                    (e.vegetarianos && e.vegetarianos > 0) ||
                    (e.veganos && e.veganos > 0) ||
                    !!e.alergias

                  return (
                    <div 
                      key={e.id} 
                      className={`rounded-xl border border-gray-200 bg-white border-t-4 border-t-brand p-5 flex flex-col justify-between space-y-5 shadow-xs hover:shadow-md transition-shadow ${
                        isSingleEvent ? 'md:col-span-2' : 'md:col-span-1'
                      }`}
                    >
                      {/* Cabecera del evento */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                              Empresa
                            </span>
                            <h4 className="text-lg font-semibold text-gray-900 tracking-tight">
                              {e.clientName}
                            </h4>
                          </div>
                          
                          <div className="flex gap-4 text-right">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                                Invitados
                              </span>
                              <div className="flex items-center gap-1 text-sm font-semibold text-gray-800 tnum">
                                <Users className="h-3.5 w-3.5 text-gray-400" />
                                {e.guests}
                              </div>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                                Horario
                              </span>
                              <div className="flex items-center gap-1 text-sm font-semibold text-gray-800 tnum">
                                <Clock className="h-3.5 w-3.5 text-gray-400" />
                                {e.eventTime || '13:00'} hs
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Contenido: Islas + Restricciones */}
                        <div className="space-y-2">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-semibold text-gray-500 min-w-28 shrink-0">
                              Islas contratadas:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {(e.islas || ['Entrada', 'Parrilla', 'Dulce']).map((isla: string) => (
                                <span key={isla} className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                  {isla}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-start gap-2 pt-1">
                            <span className="text-xs font-semibold text-gray-500 min-w-28 shrink-0 pt-0.5">
                              Restricciones:
                            </span>
                            <div className={`flex items-start gap-1.5 px-2.5 py-1.5 rounded-md text-xs w-full ${
                              hasRestrictions 
                                ? 'bg-amber-50 text-amber-900 border border-amber-200/70 font-medium' 
                                : 'bg-gray-50 text-gray-500 border border-gray-100'
                            }`}>
                              {hasRestrictions && <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />}
                              <span>{formatEventRestrictions(e.dietary)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer de la tarjeta */}
                      <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-1.5 truncate text-gray-600">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-brand" />
                          <span className="truncate">{e.location || 'Av. Corrientes 1234, CABA'}</span>
                        </div>
                        <Button variant="brand" size="sm" className="gap-1.5 shrink-0 rounded-lg">
                          <Download className="h-3.5 w-3.5" />
                          Descargar comanda
                        </Button>
                      </div>
                    </div>
                  )
                })}
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