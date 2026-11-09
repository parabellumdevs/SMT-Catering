import { describe, it, expect } from 'vitest'
import { getDietaryTotal } from './quotationStore'

type Dietary = Parameters<typeof getDietaryTotal>[0]

const dietary = (parcial: Partial<Dietary> = {}): Dietary =>
  ({
    celiacos: 0,
    vegetarianos: 0,
    veganos: 0,
    hipertensos: 0,
    customObservations: [],
    ...parcial,
  }) as Dietary

describe('getDietaryTotal', () => {
  it('suma celíacos, vegetarianos, veganos e hipertensos', () => {
    const d = dietary({ celiacos: 5, vegetarianos: 10, veganos: 3, hipertensos: 2 })
    expect(getDietaryTotal(d)).toBe(20)
  })

  it('incluye las alergias u observaciones personalizadas', () => {
    const d = dietary({
      celiacos: 5,
      vegetarianos: 10,
      veganos: 3,
      hipertensos: 2,
      customObservations: [
        { id: '1', description: 'Alergia al maní', count: 2 },
        { id: '2', description: 'Intolerancia a la lactosa', count: 4 },
      ],
    })
    expect(getDietaryTotal(d)).toBe(26)
  })

  it('devuelve 0 si no hay restricciones', () => {
    expect(getDietaryTotal(dietary())).toBe(0)
  })
})