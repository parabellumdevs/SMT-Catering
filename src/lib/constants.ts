/** Reglas de negocio invariantes (AGENTS.md y MER_v3). */

// Comensales
export const COMENSALES_MIN = 50
export const COMENSALES_MAX = 120
export const GUEST_MIN = COMENSALES_MIN
export const GUEST_MAX = COMENSALES_MAX

// Porcentajes de pago: Seña 50% / Saldo 50%
export const PORCENTAJE_SENA = 50
export const PORCENTAJE_SALDO = 50
export const DEPOSIT_PERCENT = PORCENTAJE_SENA
export const BALANCE_PERCENT = PORCENTAJE_SALDO

// Tiempos y ventanas
export const VENTANA_PRODUCCION_DIAS = 30
export const PRODUCTION_WINDOW_DAYS = VENTANA_PRODUCCION_DIAS

export const ANTELACION_MINIMA_DIAS = 14
export const MIN_BOOKING_DAYS_ADVANCE = ANTELACION_MINIMA_DIAS

export const AVISO_SALDO_DIAS = 7
export const BALANCE_NOTICE_DAYS = AVISO_SALDO_DIAS

// Estaciones gastronómicas
export const ESTACIONES = [
  { id: 'entradas', nombre: 'Entradas', name: 'Entradas' },
  { id: 'pastas', nombre: 'Pastas', name: 'Pastas' },
  { id: 'parrilla', nombre: 'Parrilla', name: 'Parrilla' },
  { id: 'asiatica', nombre: 'Cocina Asiática', name: 'Cocina Asiática' },
  { id: 'dulce', nombre: 'Estación Dulce', name: 'Estación Dulce' },
] as const

export type EstacionId = (typeof ESTACIONES)[number]['id']

// Alias en inglés para compatibilidad gradual
export const STATIONS = ESTACIONES
export type StationId = EstacionId

export interface InfoEstacion {
  id: EstacionId
  nombre: string
  descripcion: string
  precioPorComensalCentavos: number
}

// Catálogo oficial de estaciones culinarias
export const ESTACIONES_GASTRONOMICAS: InfoEstacion[] = [
  { id: 'entradas', nombre: 'Entradas', precioPorComensalCentavos: 350000, descripcion: 'Tabla de quesos (Parmesano, Gouda, Roquefort), Tabla de fiambres (Jamón crudo, Jamón cocido, Salame de colonia) y Brochettes (Caprese y mixtos de pollo/vegetales).' },
  { id: 'pastas', nombre: 'Pastas', precioPorComensalCentavos: 520000, descripcion: 'Ñoquis de papa y Sorrentinos de jamón y queso, con dos opciones de salsa (Fileto clásica y Salsa Parisienne).' },
  { id: 'parrilla', nombre: 'Parrilla', precioPorComensalCentavos: 610000, descripcion: 'Asado banderita de ternera, Mini chorizos bombón, Pollo asado, aderezos y carbón/leña proporcional por comensal.' },
  { id: 'asiatica', nombre: 'Cocina Asiática', precioPorComensalCentavos: 570000, descripcion: 'Wok de verduras de estación (sola y opción con pollo) y Sushi rolls variados (Salmon Roll, Veggie Roll y Philadelphia).' },
  { id: 'dulce', nombre: 'Estación Dulce', precioPorComensalCentavos: 280000, descripcion: '5 variedades de shots de postres (Chocotorta, Lemon Pie, Cheesecake de frutos rojos, Mousse de chocolate y Oreotorta).' },
]

export function obtenerEstacionPorId(id: EstacionId): InfoEstacion {
  const found = ESTACIONES_GASTRONOMICAS.find((s) => s.id === id)
  if (!found) {
    return { id, nombre: id, descripcion: '', precioPorComensalCentavos: 0 }
  }
  return found
}

// Aliases en camelCase / inglés para compatibilidad
export const GASTRONOMIC_STATIONS = ESTACIONES_GASTRONOMICAS
export const stationById = (id: EstacionId) => {
  const s = obtenerEstacionPorId(id)
  return {
    ...s,
    name: s.nombre,
    description: s.descripcion,
    pricePerGuestCents: s.precioPorComensalCentavos,
  }
}
export type StationInfo = InfoEstacion