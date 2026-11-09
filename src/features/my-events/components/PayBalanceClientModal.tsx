import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'
import { AlertCircle, CheckCircle2, CircleDollarSign, Copy, CreditCard, Landmark, Loader2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import type { EventRecord } from '@/types/domain'

interface PayBalanceClientModalProps {
  readonly event: EventRecord | null
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onPaymentSuccess: (eventId: string) => void
}

export function PayBalanceClientModal({
  event,
  open,
  onOpenChange,
  onPaymentSuccess,
}: PayBalanceClientModalProps) {
  const [method, setMethod] = useState<'card' | 'transfer'>('card')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  if (!event) return null

  const outstandingBalanceCents = Math.max(0, event.totalCents - event.depositCents)

  const handleCopyAlias = () => {
    navigator.clipboard.writeText('SMT.CATERING.B2B')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePay = async () => {
    try {
      setIsSubmitting(true)
      setErrorMessage(null)

      await api.patch(`/api/events/${event.id}`, { paymentStatus: 'SALDADO' })

      setIsSubmitting(false)
      onPaymentSuccess(event.id)
      onOpenChange(false)
    } catch (err: unknown) {
      setIsSubmitting(false)
      const msg = err instanceof Error ? err.message : 'Error inesperado al procesar el pago'
      setErrorMessage(msg)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl focus:outline-none">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <CircleDollarSign className="h-5 w-5" />
              </div>
              <div>
                <Dialog.Title className="text-lg font-bold text-gray-900 tracking-tight">
                  Pagar Saldo Restante
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

          <div className="space-y-5 pt-5">
            {/* Resumen financiero */}
            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Total del servicio:</span>
                <span className="font-semibold text-gray-800 tnum">{formatCurrency(event.totalCents)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>Seña abonada previamente:</span>
                <span className="font-semibold text-emerald-700 tnum">{formatCurrency(event.depositCents)}</span>
              </div>
              <div className="border-t border-emerald-200/60 pt-2 flex items-baseline justify-between">
                <div>
                  <span className="text-sm font-bold text-gray-900">Total a Pagar Ahora:</span>
                  <p className="text-[11px] text-gray-500">Saldo pendiente de liquidación</p>
                </div>
                <span className="text-2xl font-bold text-emerald-700 tnum font-display">
                  {formatCurrency(outstandingBalanceCents)}
                </span>
              </div>
            </div>

            {/* Aviso de vencimiento */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-800 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Plazo límite de pago:</strong> El saldo del 50% debe encontrarse acreditado con una antelación mínima de <strong>24 horas antes</strong> del evento para garantizar la logística y el ingreso del personal de servicio.
              </p>
            </div>

            {/* Selector de medio de pago */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                Medio de Pago
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMethod('card')}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-left text-xs font-medium transition-all ${
                    method === 'card'
                      ? 'border-brand bg-brand/5 text-brand font-semibold shadow-xs'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <CreditCard className="h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-semibold">Tarjeta / Débito</p>
                    <p className="text-[10px] text-gray-400">Acreditación instantánea</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('transfer')}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-left text-xs font-medium transition-all ${
                    method === 'transfer'
                      ? 'border-brand bg-brand/5 text-brand font-semibold shadow-xs'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <Landmark className="h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-semibold">Transferencia</p>
                    <p className="text-[10px] text-gray-400">CBU / Alias oficial</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Detalles según medio */}
            {method === 'transfer' ? (
              <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Alias CBU:</span>
                  <div className="flex items-center gap-1 font-mono font-bold text-gray-800">
                    <span>SMT.CATERING.B2B</span>
                    <button
                      type="button"
                      onClick={handleCopyAlias}
                      className="p-1 rounded text-gray-400 hover:text-gray-600"
                      title="Copiar Alias"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    {copied && <span className="text-[10px] text-emerald-600 font-sans">¡Copiado!</span>}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">CUIT:</span>
                  <span className="font-mono text-gray-800">30-71234567-9</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Titular:</span>
                  <span className="text-gray-800 font-medium">SMT Catering S.A.</span>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50 text-xs text-gray-600 space-y-1">
                <p>Al confirmar serás redirigido a la pasarela segura integrada para abonar con tarjeta corporativa o débito automático.</p>
              </div>
            )}

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
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handlePay}
              disabled={isSubmitting || outstandingBalanceCents <= 0}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Procesando Pago...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirmar Pago ({formatCurrency(outstandingBalanceCents)})
                </>
              )}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
