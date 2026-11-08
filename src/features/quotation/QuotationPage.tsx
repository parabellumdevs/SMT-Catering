import { PageHeader } from '@/components/layout/AppShell'
import { AvailabilityCalendar } from '@/features/quotation/components/AvailabilityCalendar'
import { DietaryMatrix } from '@/features/quotation/components/DietaryMatrix'
import { GuestSlider } from '@/features/quotation/components/GuestSlider'
import { LocationField } from '@/features/quotation/components/LocationField'
import { TimeSlotSelector } from '@/features/quotation/components/TimeSlotSelector'
import {
  PriceSummaryPanel,
} from '@/features/quotation/components/PriceSummary'
import { StationSelector } from '@/features/quotation/components/StationSelector'

export function QuotationPage() {
  return (
    <>
      <PageHeader
        title="Cotizá tu evento"
        description="Cotización transparente en tiempo real para eventos corporativos de 50 a 120 comensales."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
        <div className="space-y-8">
          {/* Tarjeta unificada: 1. Información del Evento */}
          <div className="rounded-2xl border border-hairline bg-canvas p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-hairline pb-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#581c25] text-xs font-bold text-white">
                1
              </span>
              <h2 className="text-lg font-semibold text-ink">Información del Evento</h2>
            </div>

            <GuestSlider />

            {/* Grid de 2 columnas para Fecha y Horario */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
              <AvailabilityCalendar />
              <TimeSlotSelector />
            </div>

            <LocationField />
          </div>

          <StationSelector />
          <DietaryMatrix />
        </div>
        <PriceSummaryPanel />
      </div>
    </>
  )
}