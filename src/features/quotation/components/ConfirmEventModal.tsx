import * as Dialog from '@radix-ui/react-dialog'
import { addDays, addHours, isBefore, parseISO, startOfDay } from 'date-fns'
import { AlertCircle, CalendarCheck, Check, CheckCircle2, Copy, FileText, Upload, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useQuotationCalculator } from '@/features/quotation/hooks/useQuotationCalculator'
import { formatCurrency } from '@/lib/utils'
import { useEventStore } from '@/stores/eventStore'
import { useQuotationStore } from '@/stores/quotationStore'
import { BANK_DETAILS, DEPOSIT_HOLD_HOURS, DEPOSIT_PERCENT, MIN_BOOKING_DAYS_ADVANCE } from '@/lib/constants'
import type { PaymentStatus } from '@/types/domain'

/** Tipos y tamaño permitidos para el comprobante (el servidor debe validar lo mismo). */
const RECEIPT_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const RECEIPT_MAX_BYTES = 2.5 * 1024 * 1024 // en base64 pesa ~3,4 MB: entra bajo el límite de 4,5 MB de Vercel
const RECEIPT_MAX_LABEL = '2,5 MB'

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

interface Props {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  /** Medio de pago elegido en el panel lateral (Transferencia Bancaria / Factura A / Tarjeta). */
  readonly paymentMethodLabel?: string
}

export function ConfirmEventModal({ open, onOpenChange, paymentMethodLabel }: Props) {
  const navigate = useNavigate()
  const guests = useQuotationStore((s) => s.guests)
  const eventDate = useQuotationStore((s) => s.eventDate)
  const stationIds = useQuotationStore((s) => s.stationIds)
  const dietary = useQuotationStore((s) => s.dietary)
  const resetQuotation = useQuotationStore((s) => s.reset)
  const { totalCents, depositCents, insuranceCents } = useQuotationCalculator()
  const addEvent = useEventStore((s) => s.addEvent)

  const [clientName, setClientName] = useState('')
  const [kitchenNotes, setKitchenNotes] = useState('')
  const [createdEventId, setCreatedEventId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [today] = useState(() => startOfDay(new Date()))

  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptError, setReceiptError] = useState<string | null>(null)
  const [copiedAlias, setCopiedAlias] = useState(false)

  const isTransfer = Boolean(paymentMethodLabel?.toLowerCase().includes('transferencia'))

  const isTooSoon = Boolean(
    eventDate && isBefore(parseISO(eventDate), addDays(today, MIN_BOOKING_DAYS_ADVANCE)),
  )

  /** Solo el alias se copia: el CBU se lee/transcribe, no tiene botón. */
  const handleCopyAlias = async () => {
    try {
      await navigator.clipboard.writeText(BANK_DETAILS.alias)
      setCopiedAlias(true)
      setTimeout(() => setCopiedAlias(false), 2000)
    } catch {
      /* Sin permiso de portapapeles: el alias queda visible para copiarlo a mano. */
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // permite volver a elegir el mismo archivo
    if (!file) return
    if (!RECEIPT_TYPES.includes(file.type)) {
      setReceiptFile(null)
      setReceiptError('El comprobante debe ser PDF, JPG o PNG.')
      return
    }
    if (file.size > RECEIPT_MAX_BYTES) {
      setReceiptFile(null)
      setReceiptError(`El archivo supera los ${RECEIPT_MAX_LABEL}. Probá con una captura más liviana o un PDF.`)
      return
    }
    setReceiptError(null)
    setReceiptFile(file)
  }

  const isSubmitDisabled =
    submitting || !clientName.trim() || !eventDate || isTooSoon || (isTransfer && !receiptFile)

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitDisabled) return

    setSubmitting(true)
    try {
      const receipt = isTransfer && receiptFile
        ? {
            name: receiptFile.name,
            mimeType: receiptFile.type,
            sizeBytes: receiptFile.size,
            dataUrl: await readAsDataUrl(receiptFile),
          }
        : undefined

      // El cliente nunca marca la seña como abonada: con transferencia queda pendiente
      // hasta que el administrador la confirme.
      const paymentStatus: PaymentStatus = isTransfer ? 'SEÑA PENDIENTE' : 'SALDO PENDIENTE'

      const newRecord = addEvent({
        clientName: clientName.trim(),
        eventDate,
        guests,
        stationIds,
        status: isTransfer ? 'Seña pendiente' : 'Señado / Confirmado',
        paymentStatus,
        totalCents,
        // Se guarda siempre el monto de la seña esperada (50%), para no perder cuánto se espera cobrar.
        depositCents,
        insuranceCents,
        dietary,
        kitchenNotes: kitchenNotes.trim(),
        cancelled: false,
        receipt,
        // La fecha queda bloqueada DEPOSIT_HOLD_HOURS mientras se valida la seña.
        depositDueAt: isTransfer ? addHours(new Date(), DEPOSIT_HOLD_HOURS).toISOString() : undefined,
      })
      setCreatedEventId(newRecord.id)
      resetQuotation()
    } catch {
      setReceiptError('No pudimos leer el archivo. Probá adjuntarlo de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setCreatedEventId(null)
    setClientName('')
    setKitchenNotes('')
    setReceiptFile(null)
    setReceiptError(null)
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-brand-dark/40 backdrop-blur-xs" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-hairline bg-canvas p-6 shadow-2">
          {createdEventId ? (
            <div className="py-4 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-state-ok" />
              <Dialog.Title className="mt-3 text-heading-lg font-light text-ink">
                {isTransfer ? `¡Comprobante enviado (#${createdEventId})!` : `¡Evento ${createdEventId} confirmado!`}
              </Dialog.Title>
              <p className="mt-2 text-sm text-ink-mute">
                {isTransfer
                  ? 'Tu seña está pendiente de validación. Una vez que administración la confirme, el evento quedará confirmado.'
                  : 'Incorporado al calendario, tablero y comandas de producción.'}
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button variant="primary" onClick={() => { handleClose(); navigate('/dashboard') }}>
                  Ver en Dashboard
                </Button>
                <Button variant="secondary" onClick={() => { handleClose(); navigate(`/comandas/${createdEventId}`) }}>
                  Ver Comanda Técnica
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleConfirm}>
              <div className="flex items-center justify-between border-b border-hairline pb-3">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5 text-primary" />
                  <Dialog.Title className="text-heading-lg font-light text-ink">
                    Confirmar Reserva
                  </Dialog.Title>
                </div>
                <button type="button" onClick={handleClose} className="text-ink-mute hover:text-ink">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Resumen de la reserva */}
              <div className="my-3 space-y-1.5 rounded-lg bg-canvas-soft p-3 text-xs text-ink-secondary">
                <div className="flex justify-between">
                  <span>Fecha:</span> <strong className="text-ink">{eventDate ?? 'Sin fecha'}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Comensales:</span> <strong className="text-ink tnum">{guests} pax</strong>
                </div>
                <div className="flex justify-between">
                  <span>Total:</span> <strong className="text-ink tnum">{formatCurrency(totalCents)}</strong>
                </div>
                <div className="flex justify-between border-t border-hairline pt-1 text-primary-deep">
                  <span>Seña ({DEPOSIT_PERCENT}%):</span> <strong className="tnum">{formatCurrency(depositCents)}</strong>
                </div>
              </div>

              {isTooSoon && (
                <p className="mb-2 text-xs text-state-danger">
                  Antelación mínima obligatoria: {MIN_BOOKING_DAYS_ADVANCE} días.
                </p>
              )}

              <div className="space-y-3">
                <div>
                  <Label htmlFor="clientName" className="mb-1 block text-xs">Cliente / Empresa *</Label>
                  <Input
                    id="clientName"
                    required
                    placeholder="Ej. TechCorp S.A."
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="kitchenNotes" className="mb-1 block text-xs">Notas de cocina / logística</Label>
                  <Input
                    id="kitchenNotes"
                    placeholder="Ej. Servicio a las 20:30hs"
                    value={kitchenNotes}
                    onChange={(e) => setKitchenNotes(e.target.value)}
                  />
                </div>

                {/* Bloque exclusivo de transferencia bancaria */}
                {isTransfer && (
                  <div className="space-y-3 rounded-lg border border-hairline bg-canvas-soft/80 p-3 pt-2.5">
                    <div className="flex items-start gap-2 rounded-md border border-amber-200/70 bg-amber-50 p-2.5 text-xs text-amber-900">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                      <span>
                        Una vez que administración <strong>confirme la seña</strong>, el evento quedará{' '}
                        <strong>confirmado</strong>. Mientras tanto la fecha queda reservada por {DEPOSIT_HOLD_HOURS} hs.
                      </span>
                    </div>

                    {/* Datos bancarios */}
                    <div className="space-y-1.5 text-xs">
                      <Label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-secondary">
                        Datos para transferir
                      </Label>

                      <div className="flex items-center justify-between border-b border-hairline/60 py-0.5">
                        <span className="text-ink-mute">Nombre:</span>
                        <strong className="font-medium text-ink">{BANK_DETAILS.accountName}</strong>
                      </div>

                      <div className="flex items-center justify-between border-b border-hairline/60 py-0.5">
                        <span className="text-ink-mute">CBU:</span>
                        <strong className="font-mono text-ink">{BANK_DETAILS.cbu}</strong>
                      </div>

                      <div className="flex items-center justify-between py-0.5">
                        <span className="text-ink-mute">Alias:</span>
                        <div className="flex items-center gap-1.5">
                          <strong className="font-mono text-ink">{BANK_DETAILS.alias}</strong>
                          <button
                            type="button"
                            onClick={handleCopyAlias}
                            className="p-0.5 text-ink-mute hover:text-primary"
                            title="Copiar alias"
                            aria-label="Copiar alias"
                          >
                            {copiedAlias ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Subir comprobante */}
                    <div className="space-y-1.5 border-t border-hairline pt-2">
                      <Label htmlFor="receipt-upload" className="block text-xs font-medium text-ink">
                        Comprobante de la transferencia (PDF, JPG o PNG, máx. {RECEIPT_MAX_LABEL}) *
                      </Label>

                      <input
                        id="receipt-upload"
                        type="file"
                        accept=".pdf,image/jpeg,image/png"
                        onChange={handleFileChange}
                        className="hidden"
                      />

                      <label
                        htmlFor="receipt-upload"
                        className="flex h-10 w-full cursor-pointer items-center justify-between rounded-md border border-dashed border-hairline bg-canvas px-3 text-xs text-ink-mute transition-colors hover:border-primary"
                      >
                        {receiptFile ? (
                          <div className="flex items-center gap-2 truncate font-medium text-ink">
                            <FileText className="h-4 w-4 shrink-0 text-primary" />
                            <span className="truncate">{receiptFile.name}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-ink-mute">
                            <Upload className="h-4 w-4 shrink-0" />
                            <span>Seleccionar comprobante...</span>
                          </div>
                        )}
                        <span className="shrink-0 rounded bg-canvas-soft px-2 py-0.5 text-[10px] font-semibold text-ink">
                          {receiptFile ? 'Cambiar' : 'Examinar'}
                        </span>
                      </label>

                      {receiptError && (
                        <p role="alert" className="text-xs text-state-danger">{receiptError}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                {isTransfer && !receiptFile && (
                  <span className="mr-auto text-[11px] text-ink-mute">Adjuntá el comprobante para continuar.</span>
                )}
                <Button type="button" variant="ghost" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" disabled={isSubmitDisabled}>
                  {isTransfer ? `Pagar seña (${DEPOSIT_PERCENT}%) y confirmar` : 'Confirmar y agendar'}
                </Button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}