import { z } from 'zod'

export const GUEST_MIN = 50
export const GUEST_MAX = 120
export const CONCURRENT_GUEST_MAX = 60
export const MIN_BOOKING_ADVANCE_DAYS = 15
export const MAX_EVENT_DURATION_HOURS = 3
export const MAX_DISTANCE_KM = 20
export const DEPOSIT_MIN_PERCENT = 50

export const quotationFormSchema = z.object({
  guests: z
    .number()
    .min(GUEST_MIN, `El mínimo es de ${GUEST_MIN} comensales`)
    .max(GUEST_MAX, `El máximo es de ${GUEST_MAX} comensales`),
  stationIds: z.array(z.string()).min(1, 'Debe seleccionar al menos 1 estación culinaria'),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  startTime: z.string().regex(/^(19|20|21):[0-5][0-9]$/, 'El inicio debe ser entre las 19:00 y las 21:00 hs'),
  endTime: z.string().regex(/^(20|21|22|23):[0-5][0-9]|00:00$/, 'La finalización no puede exceder las 00:00 hs'),
  durationHours: z.number().min(1).max(MAX_EVENT_DURATION_HOURS, `La duración máxima es de ${MAX_EVENT_DURATION_HOURS} horas`),
  locationAddress: z.string().min(5, 'La dirección del evento es requerida'),
  distanceKm: z.number().max(MAX_DISTANCE_KM, `La distancia máxima de cobertura es de ${MAX_DISTANCE_KM} km`),
  dietary: z.object({
    celiacos: z.number().min(0).default(0),
    vegetarianos: z.number().min(0).default(0),
    veganos: z.number().min(0).default(0),
    hipertensos: z.number().min(0).default(0),
    alergias: z.string().default(''),
    otrosDetalle: z.string().optional(),
    otrosCantidad: z.number().min(0).optional(),
  }),
  paymentOption: z.enum(['deposit_50', 'full_100']),
})

export type QuotationFormInput = z.infer<typeof quotationFormSchema>
