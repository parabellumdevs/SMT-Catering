import type { Request, Response } from '../../types/http.ts'
import { UsersService } from './users.service.ts'

export class UsersController {
  static async list(_req: Request, res: Response): Promise<void> {
    try {
      const data = await UsersService.list()
      res.json(data)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  }

  static async createStaff(req: Request, res: Response): Promise<void> {
    try {
      const user = await UsersService.createStaff(req.body || {}, req.user?.role || '')
      res.status(201).json({ success: true, user })
    } catch (error: any) {
      if (error.message.startsWith('DUPLICATE:')) {
        res.status(409).json({ error: error.message.replace('DUPLICATE: ', '') })
        return
      }
      if (error.message.startsWith('FORBIDDEN:')) {
        res.status(403).json({ error: error.message.replace('FORBIDDEN: ', '') })
        return
      }
      res.status(400).json({ error: error.message })
    }
  }

  static async updateStaff(req: Request, res: Response): Promise<void> {
    try {
      const targetId = Number(req.params.id)
      const user = await UsersService.updateStaff(targetId, req.body || {}, req.user?.role || '')
      res.json({ success: true, user })
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ error: error.message.replace('NOT_FOUND: ', '') })
        return
      }
      if (error.message.startsWith('DUPLICATE:')) {
        res.status(409).json({ error: error.message.replace('DUPLICATE: ', '') })
        return
      }
      if (error.message.startsWith('FORBIDDEN:')) {
        res.status(403).json({ error: error.message.replace('FORBIDDEN: ', '') })
        return
      }
      res.status(400).json({ error: error.message })
    }
  }

  static async deleteStaff(req: Request, res: Response): Promise<void> {
    try {
      const targetId = Number(req.params.id)
      await UsersService.deleteStaff(targetId, req.user?.id || 0)
      res.json({ success: true, message: 'Usuario eliminado correctamente.' })
    } catch (error: any) {
      res.status(400).json({ error: error.message })
    }
  }

  static async updateClient(req: Request, res: Response): Promise<void> {
    try {
      const targetId = Number(req.params.id)
      const client = await UsersService.updateClient(targetId, req.body || {})
      res.json({ success: true, client })
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ error: error.message.replace('NOT_FOUND: ', '') })
        return
      }
      if (error.message.startsWith('DUPLICATE:')) {
        res.status(409).json({ error: error.message.replace('DUPLICATE: ', '') })
        return
      }
      res.status(400).json({ error: error.message })
    }
  }
}

