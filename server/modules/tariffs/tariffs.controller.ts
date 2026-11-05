import type { Request, Response } from '../../types/http.ts'
import { TariffsService } from './tariffs.service.ts'

export class TariffsController {
  static async list(_req: Request, res: Response): Promise<void> {
    try {
      const tariffs = await TariffsService.list()
      res.json({ tariffs })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id
      if (!id) {
        res.status(400).json({ error: 'ID de tarifa requerido' })
        return
      }
      const { pricePerGuestCents, fixedCents } = req.body || {}
      await TariffsService.update(id, pricePerGuestCents, fixedCents)
      res.json({ success: true })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  }

  static async bulkUpdate(req: Request, res: Response): Promise<void> {
    try {
      const list = req.body?.tariffs
      await TariffsService.bulkUpdate(list)
      res.json({ success: true })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  }
}
