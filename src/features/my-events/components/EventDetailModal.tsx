import * as Dialog from '@radix-ui/react-dialog'
import { Calendar, Clock, Download, MapPin, ShieldCheck, Users, Utensils, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { EventStatusBadge, PaymentStatusBadge } from '@/features/dashboard/components/StatusBadges'
import { obtenerEstacionPorId, type EstacionId } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import type { EventRecord } from '@/types/domain'
import { generateReceiptPdf } from '../utils/generateReceiptPdf'

interface EventDetailModalProps {
  readonly event: EventRecord | null
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

export function EventDetailModal({ event, open, onOpenChange }: EventDetailModalProps) {
  if (!event) return null

  const outstandingBalanceCents = Math.max(0, event.totalCents - event.depositCents)

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl focus:outline-none">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-mono text-xs font-bold text-brand bg-brand/10 px-2 py-0.5 rounded">
                  {event.id}
                </span>
                <EventStatusBadge status={event.status} />
                <PaymentStatusBadge status={event.paymentStatus} />
              </div>
              <Dialog.Title className="text-xl font-bold text-gray-900 tracking-tight">
                {event.clientName}
              </Dialog.Title>
              <Dialog.Description className="text-xs text-gray-500 mt-0.5">
                Detalle técnico y comercial de la reserva
              </Dialog.Description>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              aria-label="Cerrar modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-6 pt-5">
            {/* Grilla de Datos Clave */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/80 border border-gray-100">
                <div className="p-2 rounded-lg bg-white border border-gray-200 text-brand shadow-xs">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Fecha del Evento</p>
                  <p className="text-sm font-semibold text-gray-800">{event.eventDate}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/80 border border-gray-100">
                <div className="p-2 rounded-lg bg-white border border-gray-200 text-brand shadow-xs">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Horario de Servicio</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {event.startTime || '19:30'} a {event.endTime || '22:30'} hs ({event.durationHours || 3} hs)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/80 border border-gray-100">
                <div className="p-2 rounded-lg bg-white border border-gray-200 text-brand shadow-xs">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Cantidad de Comensales</p>
                  <p className="text-sm font-semibold text-gray-800">{event.guests} invitados</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/80 border border-gray-100">
                <div className="p-2 rounded-lg bg-white border border-gray-200 text-brand shadow-xs">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Lugar de Entrega</p>
                  <p className="text-sm font-semibold text-gray-800 truncate" title={event.locationAddress}>
                    {event.locationAddress || 'CABA'}
                  </p>
                  {event.distanceKm !== undefined && (
                    <p className="text-[11px] text-gray-500">Radio: {event.distanceKm} km</p>
                  )}
                </div>
              </div>
            </div>

            {/* Estaciones Gastronómicas */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Utensils className="h-4 w-4 text-brand" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Estaciones Gastronómicas Contratadas
                </h4>
              </div>
              <div className="space-y-2">
                {event.stationIds.map((sId) => {
                  const s = obtenerEstacionPorId(sId as EstacionId)
                  return (
                    <div
                      key={sId}
                      className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-white shadow-xs"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{s.nombre}</p>
                        <p className="text-xs text-gray-500">{s.descripcion}</p>
                      </div>
                      <span className="text-xs font-medium text-brand bg-brand/5 px-2.5 py-1 rounded-full border border-brand/10">
                        Incluida
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Restricciones Alimentarias */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Requerimientos y Restricciones
                </h4>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2.5 rounded-xl border border-gray-100 bg-gray-50/60">
                  <span className="block text-xs text-gray-500">Celíacos</span>
                  <span className="text-base font-bold text-gray-900">{event.dietary?.celiacos || 0}</span>
                </div>
                <div className="p-2.5 rounded-xl border border-gray-100 bg-gray-50/60">
                  <span className="block text-xs text-gray-500">Vegetarianos</span>
                  <span className="text-base font-bold text-gray-900">{event.dietary?.vegetarianos || 0}</span>
                </div>
                <div className="p-2.5 rounded-xl border border-gray-100 bg-gray-50/60">
                  <span className="block text-xs text-gray-500">Veganos</span>
                  <span className="text-base font-bold text-gray-900">{event.dietary?.veganos || 0}</span>
                </div>
                <div className="p-2.5 rounded-xl border border-gray-100 bg-gray-50/60">
                  <span className="block text-xs text-gray-500">Alergias</span>
                  <span className="text-xs font-medium text-gray-700 truncate block mt-1" title={event.dietary?.alergias || 'Ninguna'}>
                    {event.dietary?.alergias || 'Ninguna'}
                  </span>
                </div>
              </div>
            </div>

            {/* Desglose Financiero */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Presupuesto Total:</span>
                <span className="font-semibold text-gray-900 tnum">{formatCurrency(event.totalCents)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Seguro Contra Todo Riesgo (incluido):</span>
                <span className="font-medium text-gray-700 tnum">{formatCurrency(event.insuranceCents || 8000000)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Monto Abonado (Seña 50%):</span>
                <span className="font-semibold text-emerald-700 tnum">{formatCurrency(event.depositCents)}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex items-baseline justify-between">
                <div>
                  <span className="text-sm font-bold text-gray-900">Saldo Pendiente:</span>
                  <p className="text-[11px] text-gray-500">Vencimiento: hasta 24 hs antes del evento</p>
                </div>
                <span className="text-xl font-bold text-brand tnum">
                  {formatCurrency(outstandingBalanceCents)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-5 border-t border-gray-100 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => generateReceiptPdf(event)}
              className="gap-2 rounded-xl text-gray-700 border-gray-200 hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              Descargar Comprobante PDF
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              className="rounded-xl px-5"
            >
              Cerrar
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
