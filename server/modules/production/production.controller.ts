import type { Request, Response } from '../../types/http'
import { ProductionService } from './production.service'

export class ProductionController {
  static async getComanda(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params
      if (!eventId) {
        res.status(400).json({ error: 'ID de evento requerido' })
        return
      }

      const comanda = await ProductionService.getComanda(eventId)
      if (!comanda) {
        res.status(404).json({ error: 'Evento no encontrado' })
        return
      }

      res.json({ comanda })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  }
}
