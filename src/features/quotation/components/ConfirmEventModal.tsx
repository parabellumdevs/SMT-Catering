import * as Dialog from '@radix-ui/react-dialog'
import { addDays, isBefore, parseISO, startOfDay } from 'date-fns'
import { CalendarCheck, CheckCircle2, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DEPOSIT_PERCENT, MIN_BOOKING_DAYS_ADVANCE } from '@/lib/constants'
import { useQuotationCalculator } from '@/features/quotation/hooks/useQuotationCalculator'
import { formatCurrency } from '@/lib/utils'
import { useEventStore } from '@/stores/eventStore'
import { useQuotationStore } from '@/stores/quotationStore'
import type { PaymentStatus } from '@/types/domain'

interface Props {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

export function ConfirmEventModal({ open, onOpenChange }: Props) {
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
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('SALDO_PENDIENTE')
  const [createdEventId, setCreatedEventId] = useState<string | null>(null)
  const [today] = useState(() => startOfDay(new Date()))

  const isTooSoon = Boolean(
    eventDate &&
      isBefore(parseISO(eventDate), addDays(today, MIN_BOOKING_DAYS_ADVANCE)),
  )

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientName.trim() || !eventDate || isTooSoon) return
    const newRecord = addEvent({
      clientName: clientName.trim(),
      eventDate,
      guests,
      stationIds,
      status: 'Señado / Confirmado',
      paymentStatus,
      totalCents,
      depositCents: paymentStatus === 'SALDO_PENDIENTE' ? depositCents : 0,
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
    setClientName('')
    setKitchenNotes('')
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-brand-dark/40 backdrop-blur-xs" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-hairline bg-canvas p-6 shadow-2">
          {createdEventId ? (
            <div className="py-4 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-state-ok" />
              <Dialog.Title className="mt-3 text-heading-lg font-light text-ink">¡Evento {createdEventId} Confirmado!</Dialog.Title>
              <p className="mt-2 text-sm text-ink-mute">Incorporado al calendario, tablero y comandas de producción.</p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button variant="primary" onClick={() => { handleClose(); navigate('/dashboard') }}>Ver en Dashboard</Button>
                <Button variant="secondary" onClick={() => { handleClose(); navigate(`/comandas/${createdEventId}`) }}>Ver Comanda Técnica</Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleConfirm}>
              <div className="flex items-center justify-between border-b border-hairline pb-3">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5 text-primary" />
                  <Dialog.Title className="text-heading-lg font-light text-ink">Confirmar Reserva</Dialog.Title>
                </div>
                <button type="button" onClick={handleClose} className="text-ink-mute hover:text-ink"><X className="h-5 w-5" /></button>
              </div>
              <div className="my-3 space-y-1.5 rounded-lg bg-canvas-soft p-3 text-xs text-ink-secondary">
                <div className="flex justify-between"><span>Fecha:</span> <strong className="text-ink">{eventDate ?? 'Sin fecha'}</strong></div>
                <div className="flex justify-between"><span>Comensales:</span> <strong className="text-ink tnum">{guests} pax</strong></div>
                <div className="flex justify-between"><span>Total:</span> <strong className="text-ink tnum">{formatCurrency(totalCents)}</strong></div>
                <div className="flex justify-between border-t border-hairline pt-1 text-primary-deep"><span>Seña ({DEPOSIT_PERCENT}%):</span> <strong className="tnum">{formatCurrency(depositCents)}</strong></div>
              </div>
              {isTooSoon && <p className="mb-2 text-xs text-state-danger">Antelación mínima obligatoria: {MIN_BOOKING_DAYS_ADVANCE} días.</p>}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="clientName" className="mb-1 block text-xs">Cliente / Empresa *</Label>
                  <Input id="clientName" required placeholder="Ej. TechCorp S.A." value={clientName} onChange={(e) => setClientName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="paymentStatus" className="mb-1 block text-xs">Estado de la seña</Label>
                  <select id="paymentStatus" className="w-full rounded-md border border-hairline-input bg-canvas px-3 py-2 text-sm text-ink" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}>
                    <option value="SALDO_PENDIENTE">Seña abonada ({DEPOSIT_PERCENT}% cobrada)</option>
                    <option value="SALDO_PENDIENTE">Seña pendiente de acreditación</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="kitchenNotes" className="mb-1 block text-xs">Notas de cocina / logística</Label>
                  <Input id="kitchenNotes" placeholder="Ej. Servicio a las 20:30hs" value={kitchenNotes} onChange={(e) => setKitchenNotes(e.target.value)} />
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={handleClose}>Cancelar</Button>
                <Button type="submit" variant="primary" disabled={!clientName.trim() || !eventDate || isTooSoon}>Confirmar y agendar</Button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}