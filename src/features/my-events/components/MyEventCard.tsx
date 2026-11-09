import { Clock, CreditCard, Download, Eye, MapPin, RefreshCw, Trash2, Users, Utensils } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { EventStatusBadge, PaymentStatusBadge } from '@/features/dashboard/components/StatusBadges'
import { obtenerEstacionPorId, type EstacionId } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import type { EventRecord } from '@/types/domain'
import { generateReceiptPdf } from '../utils/generateReceiptPdf'

interface MyEventCardProps {
  readonly event: EventRecord
  readonly onOpenDetail: (event: EventRecord) => void
  readonly onOpenPayBalance: (event: EventRecord) => void
  readonly onOpenReschedule: (event: EventRecord) => void
  readonly onOpenCancel: (event: EventRecord) => void
}

export function MyEventCard({
  event,
  onOpenDetail,
  onOpenPayBalance,
  onOpenReschedule,
  onOpenCancel,
}: MyEventCardProps) {
  const outstandingBalanceCents = Math.max(0, event.totalCents - event.depositCents)
  const isCancelled = event.cancelled || event.status === 'Cancelado'
  const isCompleted = event.status === 'Completado'
  const isPendingBalance = event.paymentStatus === 'SALDO_PENDIENTE' && outstandingBalanceCents > 0 && !isCancelled

  // Formato de fecha
  let formattedDate = event.eventDate
  try {
    const parsed = parseISO(event.eventDate)
    formattedDate = format(parsed, "EEEE d 'de' MMMM, yyyy", { locale: es })
  } catch {
    formattedDate = event.eventDate
  }

  return (
    <div className={`rounded-2xl border bg-white shadow-xs transition-all hover:shadow-md ${
      isCancelled ? 'border-gray-200/60 opacity-80 bg-gray-50/50' : 'border-gray-100'
    }`}>
      {/* Encabezado de la tarjeta */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-5 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-brand bg-brand/10 px-2 py-0.5 rounded">
            {event.id}
          </span>
          <EventStatusBadge status={event.status} />
          <PaymentStatusBadge status={event.paymentStatus} />
        </div>
        <span className="text-xs font-medium text-gray-500 capitalize">
          {formattedDate}
        </span>
      </div>

      {/* Contenido principal */}
      <div className="p-5 space-y-4">
        {/* Grilla de metadatos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400 shrink-0" />
            <span>{event.startTime || '19:30'} a {event.endTime || '22:30'} hs ({event.durationHours || 3} hs)</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="font-semibold text-gray-800">{event.guests} comensales</span>
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="truncate" title={event.locationAddress}>
              {event.locationAddress || 'CABA'}{' '}
              {event.distanceKm ? `(${event.distanceKm} km)` : ''}
            </span>
          </div>
        </div>

        {/* Estaciones contratadas */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
            <Utensils className="h-3.5 w-3.5" />
            <span>Islas Gastronómicas</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {event.stationIds.map((sId) => {
              const station = obtenerEstacionPorId(sId as EstacionId)
              return (
                <span
                  key={sId}
                  className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700"
                >
                  {station.nombre}
                </span>
              )
            })}
          </div>
        </div>

        {/* Desglose financiero resumido */}
        <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-gray-500 block text-[11px]">Total Presupuestado</span>
            <span className="text-sm font-bold text-gray-900 tnum">{formatCurrency(event.totalCents)}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-[11px]">Seña Abonada</span>
            <span className="text-sm font-semibold text-emerald-700 tnum">{formatCurrency(event.depositCents)}</span>
          </div>
          <div className="text-right">
            <span className="text-gray-500 block text-[11px]">Saldo Pendiente</span>
            <span className={`text-base font-bold tnum ${outstandingBalanceCents > 0 && !isCancelled ? 'text-brand' : 'text-gray-400'}`}>
              {formatCurrency(outstandingBalanceCents)}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Acciones */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-t border-gray-100 bg-white rounded-b-2xl">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onOpenDetail(event)}
            className="rounded-xl gap-1.5 text-xs h-9 text-gray-700 border-gray-200 hover:bg-gray-50"
          >
            <Eye className="h-3.5 w-3.5" />
            Ver Detalle
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => generateReceiptPdf(event)}
            className="rounded-xl gap-1.5 text-xs h-9 text-gray-700 border-gray-200 hover:bg-gray-50"
            title="Descargar Comprobante PDF"
          >
            <Download className="h-3.5 w-3.5" />
            Comprobante
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón Pagar Saldo */}
          {isPendingBalance && (
            <Button
              type="button"
              size="sm"
              onClick={() => onOpenPayBalance(event)}
              className="rounded-xl gap-1.5 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Pagar Saldo
            </Button>
          )}

          {/* Botón Reprogramar */}
          {!isCancelled && !isCompleted && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onOpenReschedule(event)}
              className="rounded-xl gap-1.5 text-xs h-9 text-gray-700 border-gray-200 hover:bg-gray-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reprogramar
            </Button>
          )}

          {/* Botón Cancelar */}
          {!isCancelled && !isCompleted && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenCancel(event)}
              className="rounded-xl gap-1.5 text-xs h-9 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Cancelar
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
