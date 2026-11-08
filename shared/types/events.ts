export type EventStatus =
  | "Presupuestado"
  | "Señado / Confirmado"
  | "En Producción"
  | "Completado"
  | "Cancelado";

export type PaymentStatus =
  | "SALDO_PENDIENTE"
  | "SALDO_PENDIENTE"
  | "SALDO_PENDIENTE"
  | "SALDADO";

export interface DietaryRequirement {
  celiacos: number;
  vegetarianos: number;
  veganos: number;
  alergias: string;
  otrosDetalle?: string;
  otrosCantidad?: number;
}

export interface Station {
  id: string;
  name: string;
  pricePerGuestCents: number;
  description: string;
  imageUrl?: string;
}

export interface EventRecord {
  id: string;
  userId?: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  eventDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm (ej. "19:00")
  endTime: string; // HH:mm (ej. "22:00")
  durationHours: number; // max 3
  locationAddress: string;
  distanceKm?: number; // <= 20 km
  guests: number; // 50 a 120
  stationIds: string[];
  status: EventStatus;
  paymentStatus: PaymentStatus;
  totalCents: number;
  depositCents: number;
  balanceCents: number;
  insuranceCents: number;
  dietary: DietaryRequirement;
  kitchenNotes?: string;
  isConcurrentDate?: boolean; // Indica si comparte fecha con otro evento
}
