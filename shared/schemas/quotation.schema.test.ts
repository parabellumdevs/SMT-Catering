import { describe, it, expect } from 'vitest'
import { quotationFormSchema, GUEST_MIN, GUEST_MAX, MAX_DISTANCE_KM } from './quotation.schema'

const valido = {
  guests: 80,
  stationIds: ['pastas'],
  eventDate: '2026-12-18',
  startTime: '19:00',
  endTime: '22:00',
  durationHours: 3,
  locationAddress: 'Venezuela 1478, Monserrat',
  distanceKm: 5,
  dietary: {
    celiacos: 0,
    vegetarianos: 0,
    veganos: 0,
    hipertensos: 0,
    alergias: '',
  },
  paymentOption: 'deposit_50',
}

// Devuelve los campos (path) en los que falló la validación
const camposConError = (body: unknown): string[] => {
  const r = quotationFormSchema.safeParse(body)
  return r.success ? [] : r.error.issues.map((i) => i.path.join('.'))
}

describe('quotationFormSchema', () => {
  it('acepta un body completo y válido', () => {
    expect(quotationFormSchema.safeParse(valido).success).toBe(true)
  })

  it('acepta los límites de invitados (50 y 120)', () => {
    expect(quotationFormSchema.safeParse({ ...valido, guests: GUEST_MIN }).success).toBe(true)
    expect(quotationFormSchema.safeParse({ ...valido, guests: GUEST_MAX }).success).toBe(true)
  })

  it('rechaza 49 y 121 invitados, y el error es del campo guests', () => {
    expect(camposConError({ ...valido, guests: GUEST_MIN - 1 })).toEqual(['guests'])
    expect(camposConError({ ...valido, guests: GUEST_MAX + 1 })).toEqual(['guests'])
  })

  it('rechaza una distancia mayor a 20 km', () => {
    expect(camposConError({ ...valido, distanceKm: MAX_DISTANCE_KM + 1 })).toEqual(['distanceKm'])
  })
})