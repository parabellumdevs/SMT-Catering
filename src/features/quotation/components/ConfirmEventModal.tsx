import * as Dialog from '@radix-ui/react-dialog'
import { addDays, isBefore, parseISO, startOfDay } from 'date-fns'
import { CalendarCheck, X } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { DEPOSIT_PERCENT, MIN_BOOKING_DAYS_ADVANCE } from '@/lib/constants'
import { EventConfirmedView } from '@/features/quotation/components/EventConfirmedView'
import { PaymentAmountPicker, type InitialPayment } from '@/features/quotation/components/PaymentAmountPicker'
import { ReservationFields } from '@/features/quotation/components/ReservationFields'
import { ReservationSummary } from '@/features/quotation/components/ReservationSummary'
import { useClientCompanyField } from '@/features/quotation/hooks/useClientCompanyField'
import { useQuotationCalculator } from '@/features/quotation/hooks/useQuotationCalculator'
import { useEventStore } from '@/stores/eventStore'
import { useQuotationStore } from '@/stores/quotationStore'
import type { PaymentStatus } from '@/types/domain'

interface Props {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  /** Medio de pago elegido en el panel lateral (transferencia / factura / tarjeta). */
  readonly paymentMethodLabel?: string
}

/** Modal de "Abonar Seña": resumen, monto inicial (50% / 100%) y datos de la reserva.
 * Cliente / Empresa se autocompleta con el perfil cuando el rol es `cliente`. */
export function ConfirmEventModal({ open, onOpenChange, paymentMethodLabel }: Props) {
  const guests = useQuotationStore((s) => s.guests)
  const eventDate = useQuotationStore((s) => s.eventDate)
  const stationIds = useQuotationStore((s) => s.stationIds)
  const dietary = useQuotationStore((s) => s.dietary)
  const resetQuotation = useQuotationStore((s) => s.reset)
  const { totalCents, depositCents, insuranceCents } = useQuotationCalculator()
  const addEvent = useEventStore((s) => s.addEvent)

  const clientField = useClientCompanyField(open)
  const [kitchenNotes, setKitchenNotes] = useState('')
  const [initialPayment, setInitialPayment] = useState<InitialPayment>('deposit')
  const [createdEventId, setCreatedEventId] = useState<string | null>(null)
  const [today] = useState(() => startOfDay(new Date()))

  const isTooSoon = Boolean(
    eventDate && isBefore(parseISO(eventDate), addDays(today, MIN_BOOKING_DAYS_ADVANCE)),
  )
  const initialCents = initialPayment === 'full' ? totalCents : depositCents
  const paymentStatus: PaymentStatus = initialPayment === 'full' ? 'SALDADO' : 'SALDO_PENDIENTE'

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientField.value.trim() || !eventDate || isTooSoon) return
    const newRecord = addEvent({
      clientName: clientField.value.trim(),
      eventDate,
      guests,
      stationIds,
      status: 'Señado / Confirmado',
      paymentStatus,
      totalCents,
      depositCents: initialCents,
      insuranceCents,
      dietary,
      kitchenNotes: kitchenNotes.trim(),
      cancelled: false,
    })
    setCreatedEventId(newRecord.id)
    resetQuotation()
  }

  const handleClose = () => {
    setCreatedEventId(null)
    clientField.reset()
    setKitchenNotes('')
    setInitialPayment('deposit')
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-brand-dark/40 backdrop-blur-xs" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-hairline bg-canvas shadow-2 focus:outline-none">
          {createdEventId ? (
            <EventConfirmedView eventId={createdEventId} onClose={handleClose} />
          ) : (
            <form onSubmit={handleConfirm}>
              <header className="flex items-start justify-between gap-3 border-b border-hairline p-5 pb-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#581c25] text-white">
                    <CalendarCheck className="h-4 w-4" />
                  </span>
                  <div>
                    <Dialog.Title className="text-lg font-semibold text-ink">Pagar y Confirmar Reserva</Dialog.Title>
                    <p className="text-xs text-ink-mute">Elegí el monto a pagar y completá los datos del evento</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Cerrar"
                  className="rounded-full p-1.5 text-ink-mute transition-colors hover:bg-canvas-soft hover:text-ink"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>

              <div className="space-y-4 p-5">
                <ReservationSummary
                  eventDate={eventDate}
                  guests={guests}
                  totalCents={totalCents}
                  depositCents={depositCents}
                  paymentMethodLabel={paymentMethodLabel}
                />

                <PaymentAmountPicker
                  value={initialPayment}
                  onChange={setInitialPayment}
                  totalCents={totalCents}
                  depositCents={depositCents}
                />

                {isTooSoon && (
                  <p className="rounded-lg border border-state-danger/20 bg-state-danger-bg p-3 text-xs text-state-danger">
                    Antelación mínima obligatoria: {MIN_BOOKING_DAYS_ADVANCE} días.
                  </p>
                )}

                <ReservationFields
                  clientName={clientField.value}
                  kitchenNotes={kitchenNotes}
                  onClientNameChange={clientField.onChange}
                  onKitchenNotesChange={setKitchenNotes}
                  hint={clientField.isAutoCompleted ? 'Autocompletado desde tu perfil de empresa' : undefined}
                />
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-hairline p-5 pt-4 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" onClick={handleClose}>Cancelar</Button>
                <Button type="submit" variant="borravino" className="h-11 px-6" disabled={!clientField.value.trim() || !eventDate || isTooSoon}>
                  {initialPayment === 'full' ? 'Pagar total y confirmar' : `Pagar seña (${DEPOSIT_PERCENT}%) y confirmar`}
                </Button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
