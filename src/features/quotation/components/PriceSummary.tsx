import { CalendarCheck, ShieldCheck, CreditCard, Landmark, FileText } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { DEPOSIT_PERCENT, ESTACIONES_GASTRONOMICAS } from '@/lib/constants'
import { ConfirmEventModal } from '@/features/quotation/components/ConfirmEventModal'
import { useQuotationCalculator } from '@/features/quotation/hooks/useQuotationCalculator'
import { useTariffStore } from '@/stores/tariffStore'
import { formatCurrency } from '@/lib/utils'
import { useQuotationStore } from '@/stores/quotationStore'

/** Etiquetas del medio de pago elegido, para reflejarlas en el modal de confirmación. */
const PAYMENT_METHOD_LABELS = {
  transferencia: 'Transferencia bancaria',
  factura: 'Factura A',
  tarjeta: 'Tarjeta de crédito',
} as const

export function PriceSummaryPanel() {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'transferencia' | 'factura' | 'tarjeta'>('transferencia')
  
  const guests = useQuotationStore((s) => s.guests)
  const eventDate = useQuotationStore((s) => s.eventDate)
  const stationIds = useQuotationStore((s) => s.stationIds)
  const locationPoint = useQuotationStore((s) => s.locationPoint)
  const tariffs = useTariffStore((s) => s.tariffs)
  
  const { totalCents, depositCents, balanceCents, insuranceCents } = useQuotationCalculator()

  // Se combinan las condiciones de fecha, estaciones y ubicación geográfica
  const canConfirm = Boolean(eventDate) && stationIds.length > 0 && locationPoint !== null

  const selectedStations = ESTACIONES_GASTRONOMICAS.filter((s) => stationIds.includes(s.id))

  return (
    <aside className="sticky top-16 hidden lg:block space-y-4" aria-label="Resumen de cotización">
      <div className="rounded-2xl border border-hairline bg-canvas shadow-lg overflow-hidden">
        
        {/* Cabecera Borravino con el Total */}
        <div className="bg-[#581c25] p-5 text-white space-y-1">
          <span className="text-[10px] uppercase tracking-wider opacity-75 font-medium">Resumen de Cotización</span>
          <div className="text-3xl font-bold tnum">{formatCurrency(totalCents)}</div>
          <p className="text-xs opacity-90 pt-0.5">
            {guests} invitados · {stationIds.length} {stationIds.length === 1 ? 'isla' : 'islas'}
          </p>
        </div>

        {/* Cuerpo del Resumen */}
        <div className="p-6 space-y-6">
          {/* Desglose dinámico de ítems */}
          <div className="space-y-3 text-sm border-b border-hairline pb-4">
            {selectedStations.length === 0 ? (
              <p className="text-xs text-ink-mute italic text-center py-1">Seleccioná al menos una estación</p>
            ) : (
              selectedStations.map((station) => {
                const priceCents =
                  tariffs.find((t) => t.id === station.id)?.pricePerGuestCents ??
                  station.precioPorComensalCentavos ?? 0
                const stationSubtotal = priceCents * guests

                return (
                  <div key={station.id} className="flex justify-between items-center text-ink-secondary">
                    <span className="truncate pr-2">{station.nombre}</span>
                    <span className="tnum font-medium shrink-0">{formatCurrency(stationSubtotal)}</span>
                  </div>
                )
              })
            )}

            {/* Muestra el seguro si aplica */}
            {insuranceCents > 0 && (
              <div className="flex justify-between items-center text-ink-secondary">
                <span>🛡️ Seguro del evento</span>
                <span className="tnum font-medium">{formatCurrency(insuranceCents)}</span>
              </div>
            )}

            <div className="flex justify-between border-t border-hairline pt-3 font-semibold text-ink">
              <span>Total Presupuestado</span>
              <span className="tnum">{formatCurrency(totalCents)}</span>
            </div>
          </div>

          {/* Bloque de Seña */}
          <div className="rounded-xl border border-[#581c25]/30 bg-[#581c25]/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#581c25]">Seña para confirmar y congelar la fecha</span>
              <span className="rounded-full bg-[#581c25] px-2 py-0.5 text-[10px] font-bold text-white">{DEPOSIT_PERCENT}%</span>
            </div>
            <div className="text-2xl font-bold text-[#581c25] tnum">{formatCurrency(depositCents)}</div>
            <div className="flex justify-between text-xs text-ink-secondary pt-1 border-t border-[#581c25]/10">
              <span>Saldo restante previo al evento</span>
              <span className="tnum font-medium">{formatCurrency(balanceCents)}</span>
            </div>
          </div>

          {/* Medios de Pago */}
          <div className="space-y-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-mute block">Medio de Pago</span>
            
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('transferencia')}
                className={`w-full flex items-center justify-between p-3 rounded-lg border text-xs transition-all ${
                  paymentMethod === 'transferencia' ? 'border-[#581c25] bg-[#581c25]/5 font-medium text-ink' : 'border-hairline text-ink-secondary hover:bg-canvas-soft'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-[#581c25]" /> Transferencia Bancaria
                </span>
                <span className={`h-3 w-3 rounded-full border flex items-center justify-center ${paymentMethod === 'transferencia' ? 'border-[#581c25] bg-[#581c25]' : 'border-hairline'}`} />
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('factura')}
                className={`w-full flex items-center justify-between p-3 rounded-lg border text-xs transition-all ${
                  paymentMethod === 'factura' ? 'border-[#581c25] bg-[#581c25]/5 font-medium text-ink' : 'border-hairline text-ink-secondary hover:bg-canvas-soft'
                }`}
              >
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#581c25]" /> Factura A
                </span>
                <span className={`h-3 w-3 rounded-full border flex items-center justify-center ${paymentMethod === 'factura' ? 'border-[#581c25] bg-[#581c25]' : 'border-hairline'}`} />
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('tarjeta')}
                className={`w-full flex items-center justify-between p-3 rounded-lg border text-xs transition-all ${
                  paymentMethod === 'tarjeta' ? 'border-[#581c25] bg-[#581c25]/5 font-medium text-ink' : 'border-hairline text-ink-secondary hover:bg-canvas-soft'
                }`}
              >
                <span className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-[#581c25]" /> Tarjeta de Crédito
                </span>
                <span className={`h-3 w-3 rounded-full border flex items-center justify-center ${paymentMethod === 'tarjeta' ? 'border-[#581c25] bg-[#581c25]' : 'border-hairline'}`} />
              </button>
            </div>
          </div>

          {/* Nota de garantía */}
          <div className="flex items-start gap-2 rounded-lg bg-canvas-soft p-3 text-xs text-ink-mute">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#581c25] mt-0.5" />
            <span>Tu fecha queda reservada e inmune a ajustes de precio tras el pago de la seña.</span>
          </div>

          {/* Botones de Acción */}
          <div className="space-y-2 pt-2">
            <Button
              variant="borravino"
              className="w-full h-11 text-sm font-medium shadow-md"
              disabled={!canConfirm}
              onClick={() => setConfirmOpen(true)}
            >
              <CalendarCheck className="h-4 w-4" />
              Abonar Seña ({DEPOSIT_PERCENT}%) y Confirmar Reserva
            </Button>

            <Button
              variant="secondary"
              className="w-full h-10 text-xs text-ink-secondary border-hairline hover:bg-canvas-soft"
              onClick={() => {}}
            >
              Guardar Borrador
            </Button>
          </div>
        </div>
      </div>

      <ConfirmEventModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        paymentMethodLabel={PAYMENT_METHOD_LABELS[paymentMethod]}
      />
    </aside>
  )
}