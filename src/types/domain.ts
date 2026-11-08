import type { StationId } from "@/lib/constants";

// Re-exportar todas las entidades oficiales en Español según MER_v3
export type {
  Cliente,
  UsuarioStaff,
  Reserva,
  Estacion,
  DetalleReservaEstacion,
  RestriccionAlimentaria,
  Pago,
  ComandaProduccion,
  Tarifa,
  EstadoEvento,
  EstadoPago,
  TipoPago,
  EstadoTransaccionPago,
  CategoriaTarifa,
} from "@shared/types/modelos";

import type {
  EstadoEvento,
  EstadoPago,
  CategoriaTarifa,
} from "@shared/types/modelos";

/** Estado de negocio del evento (equivalente a EstadoEvento del MER) */
export type EventStatus = EstadoEvento;

/** Estado de cobro (equivalente a EstadoPago del MER) */
export type PaymentStatus = EstadoPago;

/** Restricciones alimentarias (formato frontend para cotizador rápido) */
export interface DietaryRequirement {
  celiacos: number;
  vegetarianos: number;
  veganos: number;
  hipertensos: number;
  /** Descripción libre de alergias (ej. "frutos secos, mariscos"). */
  alergias: string;
  otrosDetalle?: string;
  otrosCantidad?: number;
}

/** Estación culinaria */
export interface Station {
  id: StationId;
  name: string;
  /** Precio por comensal en centavos. */
  pricePerGuestCents: number;
  description: string;
  imageUrl?: string;
}

/** Registro de evento / reserva en frontend */
export interface EventRecord {
  id: string;
  clientName: string;
  eventDate: string; // ISO yyyy-mm-dd
  guests: number;
  stationIds: StationId[];
  status: EventStatus;
  paymentStatus: PaymentStatus;
  cancelled: boolean;
  /** Total congelado al momento de la reserva (centavos). */
  totalCents: number;
  depositCents: number;
  dietary: DietaryRequirement;
  /** Productos/observaciones críticas para cocina (sin precios). */
  kitchenNotes: string;

  // Campos extendidos MER_v3
  startTime?: string;
  endTime?: string;
  durationHours?: number;
  locationAddress?: string;
  distanceKm?: number;
  insuranceCents?: number;
}

export type TariffCategory = CategoriaTarifa;

export interface Tariff {
  id: string;
  label: string;
  category: TariffCategory;
  /** Precio por comensal en centavos. */
  pricePerGuestCents: number;
  fixedCents?: number;
}

export interface TariffChange {
  id: string;
  appliedAt: string; // ISO timestamp
  percent: number;
  tariffCount: number;
  type?: "bulk" | "individual";
  tariffLabel?: string;
  previousPriceCents?: number;
  newPriceCents?: number;
}
