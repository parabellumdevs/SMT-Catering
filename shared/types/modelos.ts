import type { UserRole } from "./roles";

/**
 * Entidades de Dominio en Español según MER_v3.
 * Fuente de verdad compartida entre Backend y Frontend.
 */

/** Estados de negocio del evento / reserva */
export type EstadoEvento =
  | "Presupuestado"
  | "Seña pendiente"
  | "Señado / Confirmado"
  | "En Producción"
  | "Completado"
  | "Cancelado";

/** Estados de cobro y liquidación */
export type EstadoPago = "SEÑA_PENDIENTE" | "SALDO_PENDIENTE" | "SALDADO";

/** Tipos de transacción de pago */
export type TipoPago = "SEÑA" | "SALDO" | "TOTAL";

/** Estado transaccional del pago */
export type EstadoTransaccionPago = "pendiente" | "confirmado" | "cancelado";

/**
 * 1. CLIENTE (EMPRESA B2B)
 */
export interface Cliente {
  idCliente: number;
  razonSocial: string;
  cuit: string;
  nombreCompleto: string;
  cargoResponsable?: string;
  email: string;
  telefono?: string;
  direccionLegal?: string;
  fechaAniversario?: string;
  passwordHash?: string;
  fechaCreacion?: string;
}

/**
 * 2. USUARIO (STAFF INTERNO: admin, cocina, superadmin)
 */
export interface UsuarioStaff {
  idUsuario: number;
  nombreCompleto: string;
  email: string;
  passwordHash?: string;
  rol: UserRole;
  activo: boolean;
  fechaCreacion?: string;
}

/**
 * 3. ESTACION / ISLA GASTRONOMICA
 */
export interface Estacion {
  idEstacion: number | string;
  nombre: string;
  tipoComida: "salado" | "dulce" | string;
  descripcion: string;
  precioPorPersona: number; // en decimal o centavos según contexto
}

/**
 * 4. DETALLE_RESERVA_ESTACION (Tabla intermedia / snapshot de precios)
 */
export interface DetalleReservaEstacion {
  idReserva: number | string;
  idEstacion: number | string;
  subtotalCalculado: number;
  estacion?: Estacion;
}

/**
 * 5. RESTRICCION_ALIMENTARIA (Normalizada 1 a N)
 */
export interface RestriccionAlimentaria {
  idRestriccion?: number;
  idReserva: number | string;
  tipoRestriccion: string; // 'Celiaquía' | 'Vegetarianos' | 'Veganos' | 'Hipertensos' | 'Alergias' | 'Otros'
  cantidadPersonas: number;
  observaciones?: string;
}

/**
 * 6. PAGO
 */
export interface Pago {
  idPago: number;
  idReserva: number | string;
  tipoPago: TipoPago;
  monto: number;
  pagoOnline: boolean;
  pagoCompleto: boolean;
  fechaPago: string;
  estado: EstadoTransaccionPago;
}

/**
 * 7. COMANDA_PRODUCCION (Desdoblada por estación/brigada de cocina)
 */
export interface ComandaProduccion {
  idComanda: number | string;
  idReserva: number | string;
  idEstacion: number | string;
  observaciones?: string | Record<string, unknown>;
  fechaEmision: string;
  fechaActualizacion?: string;
  actualizadoPor?: string;
  estacionNombre?: string;
}

/**
 * 8. RESERVA (EVENTO CORPORATIVO)
 */
export interface Reserva {
  idReserva: number | string;
  idCliente: number;
  fechaEvento: string; // YYYY-MM-DD (Vie/Sab/Dom)
  horaInicio: string; // HH:mm (19:00 - 21:00)
  horaFin: string; // HH:mm (hasta 00:00)
  duracionHoras: number; // máx 3
  cantidadInvitados: number; // 50 a 120 (o máx 60 en concurrentes)
  direccionEvento: string;
  distanciaKm?: number; // <= 20 km
  eventoCancelado: boolean;
  montoTotal: number;
  montoSeguro: number;
  fechaCreacion?: string;
  fechaActualizacion?: string;
  actualizadoPor?: string;

  // Estados
  estado: EstadoEvento;
  estadoPago: EstadoPago;

  // Entidades vinculadas / embebidas
  cliente?: Cliente;
  estaciones?: Estacion[];
  estacionIds?: string[];
  restricciones?: RestriccionAlimentaria[];
  pagos?: Pago[];
  comandas?: ComandaProduccion[];
}

/**
 * 9. TARIFA (Catálogo de precios del cotizador)
 */
export type CategoriaTarifa = "base" | "station" | "extra" | "insurance";

export interface Tarifa {
  id: string;
  label: string;
  categoria: CategoriaTarifa;
  precioPorComensalCentavos: number;
  montoFijoCentavos?: number;
  activa: boolean;
}
