import type { Request, Response } from '../../types/http'
import { ProfileService } from './profile.service'

export class ProfileController {
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'No autorizado o sesión no válida' })
        return
      }

      const profile = await ProfileService.getProfile(req.user.id)
      res.json({ profile })
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ error: error.message.replace('NOT_FOUND: ', '') })
        return
      }
      res.status(500).json({ error: error.message })
    }
  }

  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'No autorizado o sesión no válida' })
        return
      }

      const profile = await ProfileService.updateProfile(req.user.id, req.body || {})
      res.json({ success: true, profile })
    } catch (error: any) {
      if (error.message.startsWith('DUPLICATE:')) {
        res.status(409).json({ error: error.message.replace('DUPLICATE: ', '') })
        return
      }
      res.status(400).json({ error: error.message })
    }
  }

  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'No autorizado o sesión no válida' })
        return
      }

      const { currentPassword, newPassword } = req.body || {}
      await ProfileService.changePassword(req.user.id, currentPassword, newPassword)
      res.json({ success: true, message: 'Contraseña actualizada correctamente' })
    } catch (error: any) {
      res.status(400).json({ error: error.message })
    }
  }
}
