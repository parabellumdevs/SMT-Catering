import type { Request, Response } from '../../types/http.ts'
import { GUEST_MAX, GUEST_MIN } from '../../../shared/schemas/quotation.schema.ts'
import { QuotationService } from './quotation.service.ts'

export class QuotationController {
  static async checkDate(req: Request, res: Response): Promise<void> {
    try {
      const date = req.query.date as string
      const guests = req.query.guests === undefined ? undefined : Number(req.query.guests)
      if (!date) {
        res.status(400).json({ error: 'Parámetro date es requerido' })
        return
      }
      if (guests !== undefined && (
        !Number.isInteger(guests)
        || guests < GUEST_MIN
        || guests > GUEST_MAX
      )) {
        res.status(400).json({
          error: `Parámetro guests debe estar entre ${GUEST_MIN} y ${GUEST_MAX}`,
        })
        return
      }

      const result = await QuotationService.checkAvailability(date, guests)
      res.json(result)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  }

  static async calculate(req: Request, res: Response): Promise<void> {
    try {
      const { guests, stationIds, distanceKm } = req.body || {}
      if (!guests || !stationIds) {
        res.status(400).json({ error: 'guests y stationIds son requeridos' })
        return
      }

      const calculation = await QuotationService.calculateQuotation({
        guests: Number(guests),
        stationIds,
        distanceKm: distanceKm ? Number(distanceKm) : undefined,
      })
      res.json({ calculation })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  }
}
