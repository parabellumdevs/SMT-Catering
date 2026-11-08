import { CalendarCheck, Check, ChevronUp, Share2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { DEPOSIT_PERCENT } from '@/lib/constants'
import { ConfirmEventModal } from '@/features/quotation/components/ConfirmEventModal'
import { useQuotationCalculator } from '@/features/quotation/hooks/useQuotationCalculator'
import { cn, formatCurrency } from '@/lib/utils'
import { useQuotationStore } from '@/stores/quotationStore'

function Rows() {
  const { perGuestCents, subtotalCents, insuranceCents, totalCents, depositCents, balanceCents } =
    useQuotationCalculator()
  const guests = useQuotationStore((s) => s.guests)
  const eventDate = useQuotationStore((s) => s.eventDate)

  return (
    <dl className="space-y-2.5 text-sm">
      {eventDate && (
        <div className="flex justify-between text-ink-secondary">
          <dt>Fecha tentativa</dt>
          <dd className="font-medium text-primary-deep tnum">{eventDate}</dd>
        </div>
      )}
      <div className="flex justify-between text-ink-secondary">
        <dt>Costo por comensal</dt>
        <dd className="tnum">{formatCurrency(perGuestCents)}</dd>
      </div>
      <div className="flex justify-between text-ink-secondary">
        <dt>
          Subtotal <span className="text-ink-mute tnum">({guests} pax)</span>
        </dt>
        <dd className="tnum">{formatCurrency(subtotalCents)}</dd>
      </div>
      {insuranceCents > 0 && (
        <div className="flex justify-between text-ink-secondary">
          <dt>
            Seguro <span className="text-ink-mute"></span>
          </dt>
          <dd className="tnum">{formatCurrency(insuranceCents)}</dd>
        </div>
      )}
      <div className="flex justify-between border-t border-hairline pt-2.5 font-normal text-ink">
        <dt>Total</dt>
        <dd className="tnum">{formatCurrency(totalCents)}</dd>
      </div>
      <div className="flex justify-between text-primary-deep">
        <dt>Seña ({DEPOSIT_PERCENT}%) — congela fecha y tarifa</dt>
        <dd className="font-normal tnum">{formatCurrency(depositCents)}</dd>
      </div>
      <div className="flex justify-between font-normal text-ink">
        <dt>Saldo restante ({100 - DEPOSIT_PERCENT}%)</dt>
        <dd className="tnum">{formatCurrency(balanceCents)}</dd>
      </div>
    </dl>
  )
}

function useShareSummary(): { share: () => void; copied: boolean } {
  const [copied, setCopied] = useState(false)
  const guests = useQuotationStore((s) => s.guests)
  const eventDate = useQuotationStore((s) => s.eventDate)
  const { perGuestCents, subtotalCents, insuranceCents, totalCents, depositCents, balanceCents } =
    useQuotationCalculator()

  const share = (): void => {
    const text = [
      'SMT Catering — Resumen de cotización',
      ...(eventDate ? [`Fecha: ${eventDate}`] : []),
      `Comensales: ${guests}`,
      `Costo por comensal: ${formatCurrency(perGuestCents)}`,
      `Subtotal: ${formatCurrency(subtotalCents)}`,
      ...(insuranceCents > 0 ? [`Seguro del evento: ${formatCurrency(insuranceCents)}`] : []),
      `Total: ${formatCurrency(totalCents)}`,
      `Seña (${DEPOSIT_PERCENT}%): ${formatCurrency(depositCents)}`,
      `Saldo (${100 - DEPOSIT_PERCENT}%): ${formatCurrency(balanceCents)}`,
    ].join('\n')
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    })
  }

  return { share, copied }
}

function ActionButtons({ className }: { className?: string }) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const eventDate = useQuotationStore((s) => s.eventDate)
  const stationIds = useQuotationStore((s) => s.stationIds)
  const locationPoint = useQuotationStore((s) => s.locationPoint)
  const { share, copied } = useShareSummary()

  const canConfirm = Boolean(eventDate) && stationIds.length > 0 && locationPoint !== null
  return (
    <div className={cn('space-y-2', className)}>
      <Button
        variant="primary"
        className="w-full"
        disabled={!canConfirm}
        onClick={() => setConfirmOpen(true)}
      >
        <CalendarCheck className="h-4 w-4" />
        Confirmar evento
      </Button>
      {!eventDate && (
        <p className="text-[11px] text-center text-ink-mute">
          Elegí una fecha en el calendario para reservar
        </p>
      )}
      {locationPoint === null && (
        <p className="text-[11px] text-center text-ink-mute">
          Elegí una dirección dentro de la zona de cobertura
        </p>
      )}

      <Button variant="secondary" className="w-full" onClick={share}>
        {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
        {copied ? 'Resumen copiado' : 'Compartir resumen'}
      </Button>
      <ConfirmEventModal open={confirmOpen} onOpenChange={setConfirmOpen} />
    </div>
  )
}

/** Panel lateral derecho, sticky en desktop (>1024px, split-pane). */
export function PriceSummaryPanel() {
  return (
    <aside className="sticky top-6 hidden lg:block" aria-label="Resumen de cotización">
      <div className="rounded-lg border border-hairline bg-canvas p-6 shadow-2">
        <h2 className="mb-4 text-heading-lg font-light text-ink">Resumen</h2>
        <Rows />
        <ActionButtons className="mt-5" />
      </div>
    </aside>
  )
}

/** Sticky bottom drawer en móvil (<768px): barra colapsable con total en vivo. */
export function PriceSummaryDrawer() {
  const [open, setOpen] = useState(false)
  const { totalCents } = useQuotationCalculator()

  return (
    <div className="fixed inset-x-0 bottom-16 z-10 border-t border-hairline bg-canvas shadow-2 lg:hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-sm text-ink-mute">Total estimado</span>
        <span className="flex items-center gap-2 font-normal text-ink tnum">
          {formatCurrency(totalCents)}
          <ChevronUp className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {open && (
        <div className="border-t border-hairline px-4 py-4">
          <Rows />
          <ActionButtons className="mt-4" />
        </div>
      )}
    </div>
  )
}