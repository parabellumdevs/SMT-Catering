import { DEPOSIT_PERCENT } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'

interface Props {
  readonly eventDate: string | null
  readonly guests: number
  readonly totalCents: number
  readonly depositCents: number
  readonly paymentMethodLabel?: string
}

/** Fila etiqueta/valor del resumen (montos siempre con `tnum`). */
function SummaryRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-ink-secondary">{label}</span>
      <span className="tnum font-medium text-ink">{value}</span>
    </div>
  )
}

/** Resumen de la reserva — réplica del bloque tintado de seña del panel lateral. */
export function ReservationSummary({ eventDate, guests, totalCents, depositCents, paymentMethodLabel }: Props) {
  return (
    <div className="space-y-2 rounded-xl border border-[#581c25]/30 bg-[#581c25]/5 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#581c25]">
          Resumen de la reserva
        </span>
        <span className="tnum rounded-full bg-[#581c25] px-2 py-0.5 text-[10px] font-bold text-white">
          {formatCurrency(totalCents)}
        </span>
      </div>
      <SummaryRow label="Fecha" value={eventDate ?? 'Sin fecha'} />
      <SummaryRow label="Comensales" value={`${guests} pax`} />
      {paymentMethodLabel && <SummaryRow label="Medio de pago" value={paymentMethodLabel} />}
      <SummaryRow label={`Seña (${DEPOSIT_PERCENT}%)`} value={formatCurrency(depositCents)} />
    </div>
  )
}
