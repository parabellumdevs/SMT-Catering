import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle, Loader2, X } from 'lucide-react'
import { differenceInDays, parseISO, startOfDay } from 'date-fns'

import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import type { EventRecord } from '@/types/domain'

interface CancelEventModalProps {
  readonly event: EventRecord | null
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onCancelSuccess: (eventId: string, message: string) => void
}

export function CancelEventModal({
  event,
  open,
  onOpenChange,
  onCancelSuccess,
}: CancelEventModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [today] = useState(() => startOfDay(new Date()))

  if (!event) return null

  // Cálculo de días restantes
  const eventDate = parseISO(event.eventDate)
  const daysUntil = differenceInDays(eventDate, today)
  const isRefundEligible = daysUntil >= 7

  const handleConfirmCancel = async () => {
    try {
      setIsSubmitting(true)
      setErrorMessage(null)

      const data = await api.patch<{ message?: string }>(`/api/events/${event.id}`, {
        status: 'Cancelado',
        cancelled: 1,
      })

      setIsSubmitting(false)
      onCancelSuccess(event.id, data?.message || 'Evento cancelado exitosamente.')
      onOpenChange(false)
    } catch (err: unknown) {
      setIsSubmitting(false)
      const msg = err instanceof Error ? err.message : 'Error inesperado al cancelar el evento'
      setErrorMessage(msg)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl focus:outline-none">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-100">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <Dialog.Title className="text-lg font-bold text-gray-900 tracking-tight">
                  Cancelar Reserva
                </Dialog.Title>
                <Dialog.Description className="text-xs text-gray-500">
                  Reserva {event.id} &bull; {event.eventDate}
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

          <div className="space-y-4 pt-5">
            <p className="text-sm text-gray-600">
              ¿Estás seguro de que deseas cancelar la reserva para el evento de{' '}
              <strong className="text-gray-900 font-semibold">{event.clientName}</strong> del día{' '}
              <strong className="text-gray-900 font-semibold">{event.eventDate}</strong>?
            </p>

            {/* Política de reintegro dinámica */}
            {isRefundEligible ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-semibold text-xs">
                  <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Reintegro del 100% de la seña ({daysUntil} días de antelación)</span>
                </div>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  Dado que la cancelación se solicita con <strong>más de 7 días corridos</strong> de antelación, corresponde el reintegro total de la seña abonada ({formatCurrency(event.depositCents)}).
                </p>
                <p className="text-[11px] text-emerald-600">
                  El importe será acreditado automáticamente al medio de pago emisor dentro de las 48 a 72 hs hábiles.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-semibold text-xs">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Sin reintegro de seña ({daysUntil <= 0 ? 'Mismo día o fecha pasada' : `Faltan solo ${daysUntil} días`})</span>
                </div>
                <p className="text-xs text-amber-700 leading-relaxed">
                  De acuerdo con las políticas oficiales de contratación de SMT Catering, las cancelaciones solicitadas con <strong>menos de 7 días</strong> de anticipación <strong>no son reembolsables</strong>, debido a los costos logísticos, materias primas y personal ya asignado.
                </p>
              </div>
            )}

            <div className="p-3 rounded-xl border border-gray-100 bg-gray-50 text-xs text-gray-500">
              <span className="font-medium text-gray-700 block mb-0.5">Atención:</span>
              Esta acción dará de baja la comanda de cocina y liberará la fecha en el calendario.
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-100">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-5 border-t border-gray-100 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-xl px-4"
            >
              Mantener Reserva
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleConfirmCancel}
              disabled={isSubmitting}
              className="rounded-xl gap-2 font-medium bg-red-600 hover:bg-red-700 shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cancelando...
                </>
              ) : (
                'Confirmar Cancelación'
              )}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
