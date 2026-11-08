import { useEffect, useRef, useState } from 'react'
import { AlertCircle, CircleDollarSign, Loader2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import type { EventRecord } from '@/types/domain'

interface PayBalanceDialogProps {
  readonly event: EventRecord
  readonly onClose: () => void
  readonly onConfirm: (eventId: string) => Promise<void> | void
}

/**
 * Modal de confirmación para asentar el pago del saldo pendiente.
 * Desglosa el total, la seña abonada y resalta el remanente.
 */
export function PayBalanceDialog({ event, onClose, onConfirm }: PayBalanceDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    dialog.showModal()
    return () => dialog.close()
  }, [])

  const outstandingBalanceCents = Math.max(0, event.totalCents - event.depositCents)

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true)
      setErrorMessage(null)
      await onConfirm(event.id)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar el cobro de saldo'
      setErrorMessage(msg)
      setIsSubmitting(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-0 flex h-full w-full max-h-none max-w-none items-center justify-center border-0 bg-black/40 backdrop-blur-xs p-4"
      aria-labelledby="pay-balance-title"
      onCancel={(e) => {
        e.preventDefault()
        if (!isSubmitting) onClose()
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
        {/* Encabezado */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 text-emerald-700">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CircleDollarSign className="h-5 w-5" />
            </div>
            <h3 id="pay-balance-title" className="font-semibold text-gray-900 text-base">
              Registrar Cobro de Saldo
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cerrar"
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-6 space-y-5">
          <div>
            <span className="text-[11px] font-mono font-bold text-brand bg-brand/10 px-2 py-0.5 rounded inline-block mb-1">
              {event.id}
            </span>
            <h4 className="text-lg font-bold text-gray-900 tracking-tight">
              {event.clientName}
            </h4>
            <p className="text-xs text-gray-500">
              Fecha: {event.eventDate} &bull; {event.guests} comensales
            </p>
          </div>

          {/* Cuadro de desglose financiero */}
          <div className="rounded-xl border border-gray-200/80 bg-gray-50/70 p-4 space-y-2.5">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Total presupuestado:</span>
              <span className="font-medium tnum text-gray-900">{formatCurrency(event.totalCents)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>Seña abonada (50%):</span>
              <span className="font-medium tnum text-emerald-700">{formatCurrency(event.depositCents)}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between items-baseline">
              <span className="text-sm font-semibold text-gray-900">Saldo pendiente:</span>
              <span className="text-xl font-bold text-brand tracking-tight tnum font-display">
                {formatCurrency(outstandingBalanceCents)}
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed">
            Al confirmar, el estado de pago del evento cambiará a{' '}
            <strong className="text-gray-800 font-semibold">SALDADO</strong> y se registrará
            la liquidación correspondiente del saldo en la base de datos.
          </p>

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-100">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50/80 border-t border-gray-100">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || outstandingBalanceCents <= 0}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirmar Pago
          </Button>
        </div>
      </div>
    </dialog>
  )
}
