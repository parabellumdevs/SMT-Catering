import { Banknote, Wallet } from 'lucide-react'

import { Label } from '@/components/ui/label'
import { DEPOSIT_PERCENT } from '@/lib/constants'
import { cn, formatCurrency } from '@/lib/utils'

/** Monto inicial que el cliente elige abonar al confirmar la reserva. */
export type InitialPayment = 'deposit' | 'full'

interface Props {
  readonly value: InitialPayment
  readonly onChange: (value: InitialPayment) => void
  readonly totalCents: number
  readonly depositCents: number
}

/**
 * Selector de monto inicial (50% Seña / 100% Total).
 * Mismo lenguaje visual que las tarjetas de "Medio de Pago" del panel lateral:
 * borde hairline, tinte borravino al seleccionar, radio nativo para teclado/a11y.
 */
export function PaymentAmountPicker({ value, onChange, totalCents, depositCents }: Props) {
  const options = [
    {
      id: 'deposit' as const,
      icon: Banknote,
      title: `Seña (${DEPOSIT_PERCENT}%)`,
      hint: 'Fecha reservada e inmune a ajustes de precio',
      amountCents: depositCents,
    },
    {
      id: 'full' as const,
      icon: Wallet,
      title: 'Total (100%)',
      hint: 'Evento saldado desde el inicio, sin saldo pendiente',
      amountCents: totalCents,
    },
  ]
  const balanceCents = totalCents - (value === 'full' ? totalCents : depositCents)

  return (
    <div className="space-y-2" role="group" aria-labelledby="initial-payment-label">
      <Label id="initial-payment-label" className="text-xs font-medium uppercase tracking-wide text-ink-secondary">
        Monto a pagar
      </Label>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((opt) => {
          const selected = value === opt.id
          const Icon = opt.icon
          return (
            <label
              key={opt.id}
              className={cn(
                'flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-all',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand',
                selected ? 'border-[#581c25] bg-[#581c25]/5' : 'border-hairline hover:bg-canvas-soft',
              )}
            >
              <input
                type="radio"
                name="initial-payment"
                className="sr-only"
                checked={selected}
                onChange={() => onChange(opt.id)}
              />
              <span
                className={cn(
                  'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                  selected ? 'border-[#581c25]' : 'border-hairline-input',
                )}
              >
                {selected && <span className="h-2 w-2 rounded-full bg-[#581c25]" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      'flex items-center gap-1.5 text-xs font-semibold',
                      selected ? 'text-ink' : 'text-ink-secondary',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 text-[#581c25]" />
                    {opt.title}
                  </span>
                  <span className="tnum shrink-0 text-sm font-semibold text-ink">
                    {formatCurrency(opt.amountCents)}
                  </span>
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-ink-mute">{opt.hint}</span>
              </span>
            </label>
          )
        })}
      </div>

      <div className="flex items-center justify-between rounded-lg bg-canvas-soft px-3 py-2 text-xs">
        <span className="text-ink-secondary">Saldo restante previo al evento</span>
        <span className="tnum font-semibold text-ink">{formatCurrency(balanceCents)}</span>
      </div>
    </div>
  )
}
