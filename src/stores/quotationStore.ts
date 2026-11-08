import { create } from "zustand";

import { GUEST_MAX, GUEST_MIN, type StationId } from "@/lib/constants";
import type { CustomObservation, DietaryRequirement } from "@/types/domain";
import type { GeoPoint } from "@shared/geo";

/**
 * Función pura que restringe el número de comensales al rango operativo estricto [50–120].
 */
const clamp = (n: number): number =>
  Math.min(GUEST_MAX, Math.max(GUEST_MIN, n));

interface QuotationState {
  guests: number;
  rangeWarning: boolean;
  stationIds: StationId[];
  extraIds: string[];
  dietary: DietaryRequirement;
  locationAddress: string;
  locationPoint: GeoPoint | null;
  locationDistanceKm: number | null;
  eventDate: string | null;
  setGuests: (raw: number) => void;
  dismissRangeWarning: () => void;
  toggleStation: (id: StationId) => void;
  toggleExtra: (id: string) => void;
  setDietary: (patch: Partial<DietaryRequirement>) => void;
  
  /* Acciones para observaciones personalizadas dinámicas */
  addCustomObservation: () => void;
  updateCustomObservation: (
    id: string,
    field: "description" | "count",
    value: string | number
  ) => void;
  removeCustomObservation: (id: string) => void;

  setLocationAddress: (address: string) => void;
  selectLocation: (selection: {
    address: string;
    point: GeoPoint;
    distanceKm: number;
  }) => void;
  setEventDate: (iso: string | null) => void;
  reset: () => void;
  startTime?: string;
  setStartTime: (time: string) => void;
}

const initialState = {
  guests: 80,
  rangeWarning: false,
  stationIds: ["entradas", "pastas"] as StationId[],
  extraIds: [] as string[],
  dietary: {
    celiacos: 0,
    vegetarianos: 0,
    veganos: 0,
    hipertensos: 0,
    alergias: "",
    customObservations: [
      { id: "obs-1", description: "", count: 0 },
    ] as CustomObservation[],
  },
  locationAddress: "",
  locationPoint: null as GeoPoint | null,
  locationDistanceKm: null as number | null,
  eventDate: null as string | null,
  startTime: "19:30",
};

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

  addCustomObservation: () =>
    set((s) => {
      const currentObs = s.dietary.customObservations || [];
      return {
        dietary: {
          ...s.dietary,
          customObservations: [
            ...currentObs,
            { id: crypto.randomUUID(), description: "", count: 0 },
          ],
        },
      };
    }),

  updateCustomObservation: (id, field, value) =>
    set((s) => {
      const currentObs = s.dietary.customObservations || [];
      let finalValue = value;

      if (field === "count" && typeof value === "number") {
        finalValue = Math.max(0, Math.min(value, s.guests));
      }

      return {
        dietary: {
          ...s.dietary,
          customObservations: currentObs.map((obs) =>
            obs.id === id ? { ...obs, [field]: finalValue } : obs
          ),
        },
      };
    }),

  removeCustomObservation: (id) =>
    set((s) => {
      const currentObs = s.dietary.customObservations || [];
      return {
        dietary: {
          ...s.dietary,
          customObservations: currentObs.filter((obs) => obs.id !== id),
        },
      };
    }),

  setLocationAddress: (address) =>
    set({
      locationAddress: address,
      locationPoint: null,
      locationDistanceKm: null,
    }),
  selectLocation: ({ address, point, distanceKm }) =>
    set({
      locationAddress: address,
      locationPoint: point,
      locationDistanceKm: distanceKm,
    }),
  setEventDate: (iso) => set({ eventDate: iso }),
  setStartTime: (time) => set({ startTime: time }),
  reset: () => set(initialState),
}));