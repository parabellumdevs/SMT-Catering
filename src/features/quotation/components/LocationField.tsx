import { AlertTriangle, CheckCircle2, MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type AddressSuggestion, searchAddresses } from '@/lib/geocoding'
import { useQuotationStore } from '@/stores/quotationStore'

// Radio de cobertura en km (misma regla que MAX_DISTANCE_KM del schema compartido).
const MAX_DISTANCE_KM = 20
const MIN_CHARS = 4
const DEBOUNCE_MS = 500

type SearchStatus = 'idle' | 'loading' | 'done' | 'error'

/**
 * Ubicación del evento con sugerencias de direcciones (Photon / OpenStreetMap).
 * - Busca recién cuando el usuario deja de escribir, para hacer pocos pedidos al servicio gratuito.
 * - Solo se puede elegir una sugerencia dentro del radio de cobertura.
 * - Al elegirla se guardan en el store la dirección, sus coordenadas y la distancia al punto base.
 */
export function LocationField() {
  const address = useQuotationStore((s) => s.locationAddress)
  const point = useQuotationStore((s) => s.locationPoint)
  const setAddress = useQuotationStore((s) => s.setLocationAddress)
  const selectLocation = useQuotationStore((s) => s.selectLocation)

  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [status, setStatus] = useState<SearchStatus>('idle')
  const [outOfRange, setOutOfRange] = useState(false)

  useEffect(() => {
    const text = address.trim()
    if (point || text.length < MIN_CHARS) {
      setSuggestions([])
      setStatus('idle')
      return
    }

    const controller = new AbortController()
    setStatus('loading')
    const timer = window.setTimeout(() => {
      searchAddresses(text, controller.signal)
        .then((results) => {
          setSuggestions(results)
          setStatus('done')
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return
          setSuggestions([])
          setStatus('error')
        })
    }, DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [address, point])

  const handleChange = (value: string) => {
    setOutOfRange(false)
    setAddress(value)
  }

  const handlePick = (suggestion: AddressSuggestion) => {
    if (suggestion.distanceKm > MAX_DISTANCE_KM) {
      setOutOfRange(true)
      return
    }
    setOutOfRange(false)
    selectLocation({
      address: suggestion.label,
      point: { lat: suggestion.lat, lng: suggestion.lng },
      distanceKm: suggestion.distanceKm,
    })
  }

  return (
    <section
      aria-labelledby="location-heading"
      className="rounded-lg border border-hairline bg-canvas p-5 shadow-1"
    >
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h2 id="location-heading" className="text-heading-lg font-light text-ink">
            Ubicación del evento
          </h2>
        </div>
        <p className="mt-0.5 text-xs text-ink-mute">
          Cubrimos eventos dentro de un radio de {MAX_DISTANCE_KM} km de nuestra ubicación.
        </p>
      </div>

      <Label
        htmlFor="event-address"
        className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-secondary"
      >
        Dirección del evento
      </Label>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-state-danger" />
        <Input
          id="event-address"
          className="pl-9"
          placeholder="Av. del Libertador 1234, Piso 8, CABA"
          value={address}
          onChange={(e) => handleChange(e.target.value)}
          autoComplete="off"
        />
      </div>

      {status === 'loading' && <p className="mt-2 text-xs text-ink-mute">Buscando…</p>}
      {status === 'error' && (
        <p className="mt-2 text-xs text-state-danger">
          No pudimos buscar la dirección. Probá de nuevo en un momento.
        </p>
      )}
      {status === 'done' && suggestions.length === 0 && (
        <p className="mt-2 text-xs text-ink-mute">Sin resultados. Probá con otra dirección.</p>
      )}

      {suggestions.length > 0 && (
        <>
          <div className="mt-1.5 overflow-hidden rounded-md border border-hairline bg-canvas">
            {suggestions.map((s) => {
              const isOut = s.distanceKm > MAX_DISTANCE_KM
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handlePick(s)}
                  className={`flex w-full items-center justify-between gap-3 border-b border-hairline px-3 py-2.5 text-left text-sm last:border-b-0 hover:bg-canvas-soft ${
                    isOut ? 'text-ink-mute' : 'text-ink'
                  }`}
                >
                  <span>{s.label}</span>
                  {isOut && (
                    <span className="shrink-0 text-xs text-state-danger">Fuera de cobertura</span>
                  )}
                </button>
              )
            })}
          </div>
          <p className="mt-1.5 text-[11px] text-ink-mute">
            Datos de direcciones © OpenStreetMap contributors
          </p>
        </>
      )}

      {point && (
        <div className="mt-3 flex items-center gap-2 rounded-md bg-state-ok-bg px-3 py-2.5 text-sm text-state-ok">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Dentro de la zona de cobertura
        </div>
      )}
      {outOfRange && (
        <div className="mt-3 flex items-center gap-2 rounded-md bg-state-danger-bg px-3 py-2.5 text-sm text-state-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Esta dirección está fuera de la zona de cobertura.
        </div>
      )}
    </section>
  )
}
