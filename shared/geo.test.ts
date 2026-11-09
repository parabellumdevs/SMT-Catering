import { describe, it, expect } from 'vitest'
import { BASE_LOCATION, distanceKm, type GeoPoint } from './geo'

const RAMOS_MEJIA: GeoPoint = { lat: -34.6411, lng: -58.5647 }
const BAHIA_BLANCA: GeoPoint = { lat: -38.7196, lng: -62.2724 }

describe('distanceKm', () => {
  it('devuelve 0 si ambos puntos son iguales', () => {
    expect(distanceKm(BASE_LOCATION, BASE_LOCATION)).toBeCloseTo(0, 3)
  })

  it('Ramos Mejía queda dentro del radio de 20 km', () => {
    const d = distanceKm(BASE_LOCATION, RAMOS_MEJIA)
    expect(d).toBeGreaterThan(10)
    expect(d).toBeLessThanOrEqual(20)
  })

  it('Bahía Blanca queda fuera del radio de 20 km', () => {
    expect(distanceKm(BASE_LOCATION, BAHIA_BLANCA)).toBeGreaterThan(20)
  })
})