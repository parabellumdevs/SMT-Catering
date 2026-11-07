import { Check, Plus } from 'lucide-react'
import { useEffect, useMemo } from 'react'

import { formatCurrency } from '@/lib/utils'
import { ESTACIONES_GASTRONOMICAS } from '@/lib/constants'
import { useTariffStore } from '@/stores/tariffStore'
import { useQuotationStore } from '@/stores/quotationStore'

/**
 * Selector interactivo de estaciones culinarias y adicionales (Módulo 1: Cotizador).
 */
export function StationSelector() {
  const stationIds = useQuotationStore((s) => s.stationIds)
  const extraIds = useQuotationStore((s) => s.extraIds)
  const guests = useQuotationStore((s) => s.guests)
  const toggleStation = useQuotationStore((s) => s.toggleStation)
  const toggleExtra = useQuotationStore((s) => s.toggleExtra)
  const tariffs = useTariffStore((s) => s.tariffs)
  const isLoaded = useTariffStore((s) => s.isLoaded)
  const fetchTariffs = useTariffStore((s) => s.fetchTariffs)

  useEffect(() => {
    if (!isLoaded) {
      void fetchTariffs()
    }
  }, [isLoaded, fetchTariffs])

  const extras = useMemo(
    () => tariffs.filter((t) => t.category === 'extra'),
    [tariffs],
  )

  const selectedCount = stationIds.length

  return (
    <div className="rounded-2xl border border-hairline bg-canvas p-6 shadow-sm space-y-6">
      {/* Encabezado de la Sección */}
      <div className="flex items-center justify-between border-b border-hairline pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#581c25] text-xs font-bold text-white">
            2
          </span>
          <h2 className="text-lg font-semibold text-ink">Estaciones de Comida</h2>
        </div>
        <span className="rounded-full bg-[#581c25]/10 px-3 py-1 text-xs font-medium text-[#581c25]">
          {selectedCount === 0 ? 'Mínimo 1' : `${selectedCount} seleccionada${selectedCount > 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Listado de Estaciones */}
      <div className="space-y-4">
        {ESTACIONES_GASTRONOMICAS.map((station) => {
          const selected = stationIds.includes(station.id)
          const priceCents =
            tariffs.find((t) => t.id === station.id)?.pricePerGuestCents ??
            station.precioPorComensalCentavos ?? 0
          
          const subtotalCents = priceCents * guests

          return (
            <div
              key={station.id}
              className={`flex flex-col sm:flex-row rounded-lg border p-4 gap-4 transition-all bg-canvas ${
                selected ? 'border-[#581c25] ring-1 ring-[#581c25]/20' : 'border-hairline hover:border-hairline-input'
              }`}
            >
              {/* Imagen y Badge de Precio */}
              <div className="relative h-32 w-full sm:w-48 shrink-0 overflow-hidden rounded-lg bg-canvas-soft">
                {station.nombre ? (
                  <img
                    src={`${'src/assets/islas/'+station.id}.jpg`}
                    alt={station.nombre}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gray-100 text-xs text-ink-mute">
                    Sin imagen
                  </div>
                )}
                <div className="absolute top-2 left-2 rounded-md bg-[#581c25] px-2.5 py-1 text-xs font-semibold text-white shadow-md tnum">
                  {formatCurrency(priceCents)}/pp
                </div>
              </div>

              {/* Información y Contenido */}
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-ink">{station.nombre}</h3>
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs text-ink-secondary leading-relaxed">
                    {station.descripcion}
                  </p>
                </div>

                {/* Botón de Acción y Subtotal */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-hairline/60">
                  <button
                    type="button"
                    onClick={() => toggleStation(station.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-colors ${
                      selected
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'border border-hairline bg-canvas text-ink hover:bg-canvas-soft'
                    }`}
                  >
                    {selected ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> Seleccionada
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5 text-[#581c25]" /> Agregar Isla
                      </>
                    )}
                  </button>

                  <div className="text-right">
                    <span className="text-[11px] uppercase tracking-wider text-ink-mute block">Subtotal isla</span>
                    <span className="text-sm font-semibold text-ink tnum">
                      {formatCurrency(subtotalCents)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Sección de Adicionales */}
      <div className="pt-4 border-t border-hairline">
        <h3 className="mb-3 text-heading-lg font-light text-ink">Adicionales</h3>
        <div className="flex flex-wrap gap-2">
          {extras.map((extra) => {
            const selected = extraIds.includes(extra.id)
            return (
              <button
                key={extra.id}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleExtra(extra.id)}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors ${
                  selected
                    ? 'border-[#581c25] bg-[#581c25] text-white font-medium'
                    : 'border-hairline bg-canvas text-ink-secondary hover:bg-canvas-soft'
                }`}
              >
                {extra.label}
                <span className="tnum opacity-80">{formatCurrency(extra.pricePerGuestCents)}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}