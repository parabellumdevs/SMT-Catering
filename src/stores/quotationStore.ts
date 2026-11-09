import { create } from "zustand";

import { GUEST_MAX, GUEST_MIN, type StationId } from "@/lib/constants";
import type { CustomObservation, DietaryRequirement } from "@/types/domain";
import type { GeoPoint } from "@shared/geo";

/**
 * Función pura que restringe el número de comensales al rango operativo estricto [50–120].
 */
const clamp = (n: number): number =>
  Math.min(GUEST_MAX, Math.max(GUEST_MIN, n));

/**
 * Función pura auxiliar que calcula la suma total acumulada de dietas fijas + observaciones personalizadas.
 */
export const getDietaryTotal = (dietary: DietaryRequirement): number => {
  const fixedTotal =
    (dietary.celiacos || 0) +
    (dietary.vegetarianos || 0) +
    (dietary.veganos || 0) +
    (dietary.hipertensos || 0);

  const customTotal = (dietary.customObservations || []).reduce(
    (acc, obs) => acc + (obs.count || 0),
    0
  );

  return fixedTotal + customTotal;
};

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
    set((s) => {
      const newGuests = clamp(raw);
      
      // Si el usuario disminuye la cantidad total de comensales, ajustamos automáticamente el total de dietas acumuladas
      let currentDietary = { ...s.dietary };
      let total = getDietaryTotal(currentDietary);

      if (total > newGuests) {
        const fixedKeys = ["celiacos", "vegetarianos", "veganos", "hipertensos"] as const;
        for (const key of fixedKeys) {
          if (total <= newGuests) break;
          const currentVal = currentDietary[key] || 0;
          const diff = total - newGuests;
          const reduction = Math.min(currentVal, diff);
          currentDietary[key] = currentVal - reduction;
          total -= reduction;
        }

        if (total > newGuests && currentDietary.customObservations) {
          currentDietary.customObservations = currentDietary.customObservations.map((obs) => {
            if (total <= newGuests) return obs;
            const diff = total - newGuests;
            const reduction = Math.min(obs.count, diff);
            total -= reduction;
            return { ...obs, count: obs.count - reduction };
          });
        }
      }

      return {
        guests: newGuests,
        dietary: currentDietary,
        rangeWarning: raw !== newGuests,
      };
    }),

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

  setDietary: (patch) =>
    set((s) => {
      const currentDietary = { ...s.dietary };
      
      // Calcula el espacio ocupado por el resto de las propiedades para no superar s.guests
      const currentTotalWithoutField =
        getDietaryTotal(currentDietary) -
        (patch.celiacos !== undefined ? currentDietary.celiacos || 0 : 0) -
        (patch.vegetarianos !== undefined ? currentDietary.vegetarianos || 0 : 0) -
        (patch.veganos !== undefined ? currentDietary.veganos || 0 : 0) -
        (patch.hipertensos !== undefined ? currentDietary.hipertensos || 0 : 0);

      const availableCap = Math.max(0, s.guests - currentTotalWithoutField);
      const sanitizedPatch: Partial<DietaryRequirement> = {};

      const fixedKeys = ["celiacos", "vegetarianos", "veganos", "hipertensos"] as const;
      for (const key of fixedKeys) {
        if (patch[key] !== undefined) {
          sanitizedPatch[key] = Math.max(0, Math.min(patch[key]!, availableCap));
        }
      }

      return {
        dietary: { ...s.dietary, ...patch, ...sanitizedPatch },
      };
    }),

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
        const otherObsTotal = currentObs
          .filter((obs) => obs.id !== id)
          .reduce((acc, obs) => acc + (obs.count || 0), 0);

        const fixedTotal =
          (s.dietary.celiacos || 0) +
          (s.dietary.vegetarianos || 0) +
          (s.dietary.veganos || 0) +
          (s.dietary.hipertensos || 0);

        const availableCap = Math.max(0, s.guests - (fixedTotal + otherObsTotal));
        finalValue = Math.max(0, Math.min(value, availableCap));
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