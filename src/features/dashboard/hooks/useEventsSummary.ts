import { useEffect } from "react";
import { useEventStore } from "@/stores/eventStore";
import type { EventRecord } from "@/types/domain";

/** Hook centralizado para consumir eventos del backend con Zustand. */
export function useEvents(): {
  data: EventRecord[];
  isLoading: boolean;
  refetch: () => Promise<void>;
} {
  const events = useEventStore((s) => s.events);
  const isLoading = useEventStore((s) => s.isLoading);
  const isLoaded = useEventStore((s) => s.isLoaded);
  const fetchEvents = useEventStore((s) => s.fetchEvents);

  useEffect(() => {
    if (!isLoaded) {
      void fetchEvents();
    }
  }, [isLoaded, fetchEvents]);

  return { data: events, isLoading, refetch: fetchEvents };
}

export interface EventsSummary {
  eventsThisMonth: number;
  billingTotalCents: number;
  depositsCollectedCents: number;
  balancesPendingCents: number;
}

const monthOf = (isoDate: string): string => isoDate.slice(0, 7);

export function summarizeEvents(events: EventRecord[]): EventsSummary {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const billingTotalCents = events.reduce((sum, e) => sum + e.totalCents, 0);

  // Señas cobradas: depositCents (50%) en eventos señados o saldo pendiente, y 100% en saldados
  const depositsCollectedCents = events.reduce((sum, e) => {
    if (e.paymentStatus === "SALDO_PENDIENTE") {
      return sum + e.depositCents;
    }
    if (e.paymentStatus === "SALDADO") {
      return sum + e.totalCents;
    }
    return sum;
  }, 0);

  // Saldos por cobrar: saldo restante (50%) de eventos con SALDO_PENDIENTE
  const balancesPendingCents = events.reduce((sum, e) => {
    if (e.paymentStatus === "SALDO_PENDIENTE") {
      return sum + (e.totalCents - e.depositCents);
    }
    return sum;
  }, 0);

  return {
    eventsThisMonth: events.filter((e) => monthOf(e.eventDate) === currentMonth)
      .length,
    billingTotalCents,
    depositsCollectedCents,
    balancesPendingCents,
  };
}
