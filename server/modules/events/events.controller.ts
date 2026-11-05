import type { Request, Response } from '../../types/http'
import { EventsService } from './events.service'

export class EventsController {
  static async list(_req: Request, res: Response): Promise<void> {
    try {
      const events = await EventsService.fetchAllEvents()
      res.json({ events })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const event = await EventsService.createEvent(req.body || {})
      res.status(201).json({ event })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id
      if (!id) {
        res.status(400).json({ error: 'ID de reserva requerido' })
        return
      }
      await EventsService.updateEvent(id, req.body || {})
      res.json({ success: true })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  }

  static async myEvents(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'No autorizado' })
        return
      }
      const events = await EventsService.fetchAllEvents()
      // Si es cliente, filtrar por su ID o razón social
      const filtered = events.filter((_e: any) => {
        // En una evolución posterior podemos filtrar por id_cliente directamente
        return true
      })
      res.json({ events: filtered })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  }
}
