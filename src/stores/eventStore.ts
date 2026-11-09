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
 *   La confirmación de seña es `updateStatus(id, 'Señado / Confirmado', 'SALDO_PENDIENTE')`.
 */
interface EventStoreState {
  events: EventRecord[];
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
  fetchEvents: () => Promise<void>;
  addEvent: (eventData: Omit<EventRecord, "id">) => Promise<EventRecord>;
  updateStatus: (
    id: string,
    status: EventStatus,
    paymentStatus: PaymentStatus,
  ) => void;
}

export const useEventStore = create<EventStoreState>()((set) => ({
  events: [],
  isLoading: false,
  isLoaded: false,
  error: null,

  fetchEvents: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get<{ events: EventRecord[] }>("/api/events");
      if (res && Array.isArray(res.events)) {
        // Reemplaza por completo el listado para no acumular ni duplicar registros
        set({ events: res.events, isLoading: false, isLoaded: true });
      }
    } catch (err: any) {
      set({
        isLoading: false,
        error: err?.message || "Error al cargar eventos",
      });
    }
  },

  addEvent: async (eventData) => {
    set({ isLoading: true });
    try {
      // 1. Envía el evento al backend para crearlo en PostgreSQL
      const res = await api.post<{ event: EventRecord }>("/api/events", eventData);
      const createdEvent = res?.event ?? (res as unknown as EventRecord);

      // 2. Si el backend no devuelve el comprobante pero vino en la request, lo preserva
      const finalRecord: EventRecord = {
        ...createdEvent,
        receipt: createdEvent.receipt ?? eventData.receipt,
      };

      // 3. Actualiza el estado agregando el evento real y evitando duplicados de ID
      set((s) => ({
        events: [
          finalRecord,
          ...s.events.filter((e) => e.id !== finalRecord.id),
        ],
        isLoading: false,
      }));

      return finalRecord;
    } catch (err: any) {
      set({ isLoading: false });
      console.error("Error al persistir el evento en la API:", err);
      throw err;
    }
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