import { create } from "zustand";

import { api } from "@/lib/api";
import type { EventRecord, EventStatus, PaymentStatus } from "@/types/domain";

/**
 * Store Reactivo de Eventos conectado al Backend y SQLite (MER_v3).
 *
 * Arquitectura:
 * - Carga los eventos reales desde `GET /api/events` (SQLite).
 * - Mantiene sincronizado el estado reactivo entre `DashboardPage`, `ComandasPage` y cotizador.
 * - `addEvent`: persiste la reserva vía `POST /api/events` y actualiza el store.
 * - `updateStatus`: actualiza estado de evento y cobro vía `PATCH /api/events/:id`.
 */
interface EventStoreState {
  events: EventRecord[];
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
  fetchEvents: () => Promise<void>;
  addEvent: (eventData: Omit<EventRecord, "id">) => EventRecord;
  updateStatus: (
    id: string,
    status: EventStatus,
    paymentStatus: PaymentStatus,
  ) => void;
}

/** Genera un identificador correlativo de respaldo con formato EV-XXXX. */
function generateNextId(existingEvents: EventRecord[]): string {
  const numericIds = existingEvents
    .map((e) => Number(e.id.replace("EV-", "")))
    .filter((n) => !Number.isNaN(n));
  const max = numericIds.length > 0 ? Math.max(...numericIds) : 1045;
  return `EV-${max + 1}`;
}

export const useEventStore = create<EventStoreState>()((set, get) => ({
  events: [],
  isLoading: false,
  isLoaded: false,
  error: null,

  fetchEvents: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get<{ events: EventRecord[] }>("/api/events");
      if (res && Array.isArray(res.events)) {
        set({ events: res.events, isLoading: false, isLoaded: true });
      }
    } catch (err: any) {
      set({
        isLoading: false,
        error: err?.message || "Error al cargar eventos",
      });
    }
  },

  addEvent: (eventData) => {
    const nextId = generateNextId(get().events);
    const newRecord: EventRecord = {
      ...eventData,
      id: nextId,
    };
    set((s) => ({
      events: [newRecord, ...s.events],
    }));

    // Persistir en SQLite vía API
    api
      .post<{ event: EventRecord }>("/api/events", newRecord)
      .then((res) => {
        if (res?.event) {
          set((s) => ({
            events: s.events.map((e) => (e.id === nextId ? res.event : e)),
          }));
        }
      })
      .catch((err) => {
        console.warn("No se pudo persistir el evento en la API:", err);
      });

    return newRecord;
  },

  updateStatus: (id, status, paymentStatus) => {
    set((s) => ({
      events: s.events.map((e) =>
        e.id === id ? { ...e, status, paymentStatus } : e,
      ),
    }));

    api.patch(`/api/events/${id}`, { status, paymentStatus }).catch((err) => {
      console.warn("No se pudo actualizar estado en la API:", err);
    });
  },
}));
