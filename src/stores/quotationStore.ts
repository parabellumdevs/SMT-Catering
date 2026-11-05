import { create } from 'zustand'

import { GUEST_MAX, GUEST_MIN, type StationId } from '@/lib/constants'
import type { DietaryRequirement } from '@/types/domain'
import type { GeoPoint } from '@shared/geo'

/**
 * Función pura que restringe el número de comensales al rango operativo estricto [50–120].
 */
const clamp = (n: number): number => Math.min(GUEST_MAX, Math.max(GUEST_MIN, n))

/**
 * Estado global del Cotizador en Tiempo Real (Módulo 1).
 *
 * Propósito:
 * - Almacena los parámetros configurados en el cotizador interactivo.
 * - `rangeWarning`: señal reactiva para advertir al usuario cuando intentó exceder los límites [50–120].
 * - `reset`: restaura el cotizador a valores predeterminados seguros tras confirmar una reserva.
 */
interface QuotationState {
  guests: number
  /** true cuando el usuario intentó salir del rango [50-120] (mostrar advertencia amigable). */
  rangeWarning: boolean
  stationIds: StationId[]
  /** Ids de ítems adicionales (tarifas category 'extra'). */
  extraIds: string[]
  dietary: DietaryRequirement
  /** Dirección donde se realiza el evento (lo que se ve en el campo). */
  locationAddress: string
  /** Coordenadas de la sugerencia elegida; null hasta que se elige una dentro de la zona de cobertura. */
  locationPoint: GeoPoint | null
  /** Distancia en línea recta al punto base, en km; null mientras no haya dirección válida. */
  locationDistanceKm: number | null
  eventDate: string | null
  setGuests: (raw: number) => void
  dismissRangeWarning: () => void
  toggleStation: (id: StationId) => void
  toggleExtra: (id: string) => void
  setDietary: (patch: Partial<DietaryRequirement>) => void
  /** Al escribir se invalida la selección anterior (coordenadas y distancia). */
  setLocationAddress: (address: string) => void
  /** Se llama al elegir una sugerencia dentro de la zona de cobertura. */
  selectLocation: (selection: { address: string; point: GeoPoint; distanceKm: number }) => void
  setEventDate: (iso: string | null) => void
  reset: () => void
}

const initialState = {
  guests: 80,
  rangeWarning: false,
  stationIds: ['entradas', 'pastas'] as StationId[],
  extraIds: [] as string[],
  dietary: { celiacos: 0, vegetarianos: 0, veganos: 0, alergias: '' },
  locationAddress: '',
  locationPoint: null as GeoPoint | null,
  locationDistanceKm: null as number | null,
  eventDate: null as string | null,
}

export const useQuotationStore = create<QuotationState>()((set) => ({
  ...initialState,
  setGuests: (raw) =>
    set({ guests: clamp(raw), rangeWarning: raw !== clamp(raw) }),
  dismissRangeWarning: () => set({ rangeWarning: false }),
  toggleStation: (id) =>
    set((s) => ({
      stationIds: s.stationIds.includes(id)
        ? s.stationIds.filter((x) => x !== id)
        : [...s.stationIds, id],
    })),
  toggleExtra: (id) =>
    set((s) => ({
      extraIds: s.extraIds.includes(id)
        ? s.extraIds.filter((x) => x !== id)
        : [...s.extraIds, id],
    })),
  setDietary: (patch) => set((s) => ({ dietary: { ...s.dietary, ...patch } })),
  setLocationAddress: (address) =>
    set({ locationAddress: address, locationPoint: null, locationDistanceKm: null }),
  selectLocation: ({ address, point, distanceKm }) =>
    set({ locationAddress: address, locationPoint: point, locationDistanceKm: distanceKm }),
  setEventDate: (iso) => set({ eventDate: iso }),
  reset: () => set(initialState),
}))