import * as Dialog from '@radix-ui/react-dialog'
import { addDays, isBefore, parseISO, startOfDay } from 'date-fns'
import { AlertCircle, CalendarCheck, Loader2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type SubmitEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

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
import { api } from '@/lib/api'
import type { EventRecord, PaymentStatus } from '@/types/domain'

const PENDING_CHECKOUT_KEY = 'smt-pending-mercado-pago-checkout'

type PaymentMethod = 'transferencia' | 'factura' | 'tarjeta'
type CheckoutEventData = Omit<EventRecord, 'id'> & { extraIds: string[] }

interface PendingCheckout {
  eventData: CheckoutEventData
  initialPayment: InitialPayment
  externalReference?: string
  paymentId?: string
}

interface Props {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  /** Medio de pago elegido en el panel lateral (transferencia / factura / tarjeta). */
  readonly paymentMethodLabel?: string
  readonly paymentMethod: PaymentMethod
}

/** Modal de "Abonar Seña": resumen, monto inicial (50% / 100%) y datos de la reserva.
 * Cliente / Empresa se autocompleta con el perfil cuando el rol es `cliente`. */
export function ConfirmEventModal({
  open,
  onOpenChange,
  paymentMethodLabel,
  paymentMethod,
}: Props) {
  const location = useLocation()
  const navigate = useNavigate()
  const guests = useQuotationStore((s) => s.guests)
  const eventDate = useQuotationStore((s) => s.eventDate)
  const stationIds = useQuotationStore((s) => s.stationIds)
  const extraIds = useQuotationStore((s) => s.extraIds)
  const dietary = useQuotationStore((s) => s.dietary)
  const startTime = useQuotationStore((s) => s.startTime)
  const locationAddress = useQuotationStore((s) => s.locationAddress)
  const locationDistanceKm = useQuotationStore((s) => s.locationDistanceKm)
  const resetQuotation = useQuotationStore((s) => s.reset)
  const { totalCents, depositCents, insuranceCents } = useQuotationCalculator()
  const addEvent = useEventStore((s) => s.addEvent)
  const fetchEvents = useEventStore((s) => s.fetchEvents)

  const clientField = useClientCompanyField(open)
  const [kitchenNotes, setKitchenNotes] = useState('')
  const [initialPayment, setInitialPayment] = useState<InitialPayment>('deposit')
  const [createdEventId, setCreatedEventId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [today] = useState(() => startOfDay(new Date()))
  const handledReturn = useRef(false)
  const [pendingCheckout, setPendingCheckout] = useState<PendingCheckout | null>(() => {
    try {
      const saved = sessionStorage.getItem(PENDING_CHECKOUT_KEY)
      if (!saved) return null

      const parsed: unknown = JSON.parse(saved)
      if (
        typeof parsed === 'object'
        && parsed !== null
        && 'eventData' in parsed
        && 'initialPayment' in parsed
        && (parsed.initialPayment === 'deposit' || parsed.initialPayment === 'full')
        && typeof parsed.eventData === 'object'
        && parsed.eventData !== null
        && 'clientName' in parsed.eventData
        && typeof parsed.eventData.clientName === 'string'
        && (!('externalReference' in parsed) || typeof parsed.externalReference === 'string')
        && (!('paymentId' in parsed) || typeof parsed.paymentId === 'string')
      ) {
        return parsed as PendingCheckout
      }
    } catch (error) {
      console.error('No se pudo recuperar la cotización guardada para el pago:', error)
    }

    return null
  })

  const isTooSoon = Boolean(
    eventDate && isBefore(parseISO(eventDate), addDays(today, MIN_BOOKING_DAYS_ADVANCE)),
  )
  const initialCents = initialPayment === 'full' ? totalCents : depositCents
  const paymentStatus: PaymentStatus = initialPayment === 'full' ? 'SALDADO' : 'SALDO_PENDIENTE'
  let submitLabel = `Pagar seña (${DEPOSIT_PERCENT}%) y confirmar`
  if (isSubmitting) {
    submitLabel = 'Procesando…'
  } else if (pendingCheckout?.paymentId) {
    submitLabel = 'Reintentar confirmación'
  } else if (initialPayment === 'full') {
    submitLabel = 'Pagar total y confirmar'
  }

  useEffect(() => {
    if (!open || !pendingCheckout) return

    clientField.onChange(pendingCheckout.eventData.clientName)
    setKitchenNotes(pendingCheckout.eventData.kitchenNotes)
    setInitialPayment(pendingCheckout.initialPayment)
  }, [open, pendingCheckout])

  const confirmPaidEvent = useCallback(async (paymentId: string, externalReference: string) => {
    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      const result = await api.post<{ eventId: string }>('/api/payments/confirm', {
        paymentId,
        externalReference,
      })
      await fetchEvents()
      setCreatedEventId(result.eventId)
      resetQuotation()
      sessionStorage.removeItem(PENDING_CHECKOUT_KEY)
      setPendingCheckout(null)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'No se pudo verificar el pago de Mercado Pago.'
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }, [fetchEvents, resetQuotation])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const returnStatus = params.get('mp_status')
    if (!open || !returnStatus || handledReturn.current) return

    handledReturn.current = true
    const cleanReturnUrl = () => {
      void navigate(location.pathname, { replace: true })
    }

    if (returnStatus !== 'success') {
      setErrorMessage(
        returnStatus === 'pending'
          ? 'Mercado Pago todavía no confirmó el pago. No se creó la reserva.'
          : 'El pago no se completó. No se creó la reserva.',
      )
      cleanReturnUrl()
      return
    }

    const paymentId = params.get('payment_id') || params.get('collection_id')
    const externalReference = params.get('external_reference')
    if (!paymentId || !externalReference) {
      setErrorMessage('No se recibieron los datos necesarios para verificar el pago.')
      cleanReturnUrl()
      return
    }

    if (pendingCheckout) {
      const retryData = { ...pendingCheckout, paymentId, externalReference }
      sessionStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify(retryData))
      setPendingCheckout(retryData)
    }

    const verifyPayment = async () => {
      await confirmPaidEvent(paymentId, externalReference)
      cleanReturnUrl()
    }
    void verifyPayment()
  }, [open, location.pathname, location.search, navigate, pendingCheckout, confirmPaidEvent])

  const handleConfirm = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!clientField.value.trim() || !eventDate || isTooSoon || isSubmitting) return

    const eventData: Omit<EventRecord, 'id'> = {
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
      startTime,
      locationAddress,
      distanceKm: locationDistanceKm ?? undefined,
    }

    if (paymentMethod === 'tarjeta') {
      if (pendingCheckout?.paymentId && pendingCheckout.externalReference) {
        await confirmPaidEvent(pendingCheckout.paymentId, pendingCheckout.externalReference)
        return
      }

      setIsSubmitting(true)
      setErrorMessage(null)
      try {
        const checkout = await api.post<{
          initPoint: string
          externalReference: string
        }>('/api/payments/preference', {
          initialPayment,
          reservation: { ...eventData, extraIds },
        })

        if (!checkout.initPoint || !checkout.externalReference) {
          throw new Error('Mercado Pago no devolvió los datos para iniciar el pago.')
        }

        const pending: PendingCheckout = {
          eventData: { ...eventData, extraIds },
          initialPayment,
          externalReference: checkout.externalReference,
        }
        sessionStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify(pending))
        setPendingCheckout(pending)
        window.location.assign(checkout.initPoint)
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'No se pudo iniciar el pago.',
        )
        setIsSubmitting(false)
      }
      return
    }
    
    const newRecord = addEvent(eventData)
    setCreatedEventId(newRecord.id)
    resetQuotation()
  }

  const handleClose = () => {
    sessionStorage.removeItem(PENDING_CHECKOUT_KEY)
    setPendingCheckout(null)
    setCreatedEventId(null)
    clientField.reset()
    setKitchenNotes('')
    setInitialPayment('deposit')
    setErrorMessage(null)
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

                {errorMessage && (
                  <div
                    className="flex items-start gap-2 rounded-lg border border-state-danger/20 bg-state-danger-bg p-3 text-xs text-state-danger"
                    role="alert"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {isSubmitting && (
                  <output className="flex items-center gap-2 text-xs text-ink-mute">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {location.search.includes('mp_status=success')
                      ? 'Verificando el pago y creando la reserva…'
                      : 'Conectando con Mercado Pago…'}
                  </output>
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
                <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>Cancelar</Button>
                <Button type="submit" variant="borravino" className="h-11 px-6" disabled={!clientField.value.trim() || !eventDate || isTooSoon || isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {submitLabel}
                </Button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
