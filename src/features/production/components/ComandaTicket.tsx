/**
 * ComandaTicket — Ficha de Comanda Técnica por Evento para Jefatura de Cocina.
 */
import { MapPin, Download, Users, Clock, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { stationById } from '@/lib/constants'
import { useEventStore } from '@/stores/eventStore'
import type { EventRecord } from '@/types/domain'
import { handleDownloadPdf } from './DownloadButton'
import { getOtherApprovedEventsOnSameDate } from '../utils/getApprovedEventsOnSameDate'

/** Helper para formatear restricciones de forma singular o plural según corresponda */
function formatEventRestrictions(event: EventRecord): string {
  const { dietary } = event
  const parts: string[] = []
  
  if (dietary.celiacos > 0) {
    parts.push(dietary.celiacos === 1 ? '1 celíaco' : `${dietary.celiacos} celíacos`)
  }
  if (dietary.vegetarianos > 0) {
    parts.push(dietary.vegetarianos === 1 ? '1 vegetariano' : `${dietary.vegetarianos} vegetarianos`)
  }
  if (dietary.veganos > 0) {
    parts.push(dietary.veganos === 1 ? '1 vegano' : `${dietary.veganos} veganos`)
  }
  if (dietary.hipertensos > 0) {
    parts.push(dietary.hipertensos === 1 ? '1 hipertenso' : `${dietary.hipertensos} hipertensos`)
  }
  if (dietary.alergias) {
    parts.push(`alergias: ${dietary.alergias}`)
  }
  if (event.kitchenNotes) {
    parts.push(event.kitchenNotes)
  }

  return parts.length > 0 ? parts.join(', ') : 'Sin restricciones registradas'
}

/** Formatea la hora quitando los segundos si los tuviera ("13:00:00" -> "13:00") */
function formatShortTime(timeStr?: string): string {
  if (!timeStr) return '13:00'
  return timeStr.slice(0, 5)
}


export function ComandaTicket({ event }: { readonly event: EventRecord }) {
  const { dietary } = event
  const events = useEventStore((state) => state.events)
  const sameDateApprovedEvents = getOtherApprovedEventsOnSameDate(event, events)
  const hasRestrictions =
    (dietary.celiacos && dietary.celiacos > 0) ||
    (dietary.vegetarianos && dietary.vegetarianos > 0) ||
    (dietary.veganos && dietary.veganos > 0) ||
    (dietary.hipertensos && dietary.hipertensos > 0) ||
    !!dietary.alergias ||
    !!event.kitchenNotes

  return (
    <div className="rounded-xl border border-gray-200 bg-white border-t-4 border-t-brand p-5 flex flex-col justify-between space-y-5 shadow-xs hover:shadow-md transition-shadow">
      {/* Cabecera estructurada */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            {/* ID de la comanda y etiqueta Empresa */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-md">
                {event.id}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Empresa
              </span>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 tracking-tight">
              {event.clientName}
            </h4>
          </div>
          
          <div className="flex gap-4 text-right">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                Invitados
              </span>
              <div className="flex items-center gap-1 text-sm font-semibold text-gray-800 tnum">
                <Users className="h-3.5 w-3.5 text-gray-400" />
                {event.guests}
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                Horario
              </span>
              <div className="flex items-center gap-1 text-sm font-semibold text-gray-800 tnum">
                <Clock className="h-3.5 w-3.5 text-gray-400" />
                {formatShortTime(event.startTime)} hs
              </div>
            </div>
          </div>
        </div>

        {/* Estaciones y Restricciones */}
        <div className="space-y-2">
          {sameDateApprovedEvents.length > 0 && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <div>
                <p className="font-bold">
                  Atención: hay {sameDateApprovedEvents.length + 1} eventos aprobados para producción en esta fecha.
                </p>
                <p>
                  También se realizarán:{' '}
                  {sameDateApprovedEvents
                    .map((sameDateEvent) => `${sameDateEvent.id} — ${sameDateEvent.clientName}`)
                    .join('; ')}
                </p>
              </div>
            </div>
          )}
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold text-gray-500 min-w-28 shrink-0">
              Estaciones:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {event.stationIds.map((id) => (
                <span key={id} className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                  {stationById(id).name}
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
              <span>{formatEventRestrictions(event)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer con ubicación y PDF */}
      <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-1.5 truncate text-gray-600">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-brand" />
          <span className="truncate">{event.locationAddress || 'Av. Corrientes 1234, CABA'}</span>
        </div>
        <Button 
          variant="brand" 
          size="sm" 
          className="gap-1.5 shrink-0 rounded-lg cursor-pointer"
          onClick={() => handleDownloadPdf(event, events)}
        >
          <Download className="h-3.5 w-3.5" />
          Descargar comanda
        </Button>
      </div>
    </div>
  )
}