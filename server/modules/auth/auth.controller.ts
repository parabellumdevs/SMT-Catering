import type { Request, Response } from '../../types/http.ts'
import { AuthService } from './auth.service.ts'
import { extractAuthenticatedUser } from '../../middleware/authGuard.ts'

export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { usernameOrEmail, pass } = req.body || {}
      const { user, token } = await AuthService.login(usernameOrEmail, pass)

      res.cookie('smt_session', token, {
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })

      res.json({ user })
    } catch (error: any) {
      if (error.message.startsWith('INHABILITADO:')) {
        res.status(403).json({ error: error.message.replace('INHABILITADO: ', '') })
        return
      }
      res.status(401).json({ error: error.message || 'Credenciales inválidas' })
    }
  }

  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { user, token } = await AuthService.register(req.body || {})
      res.cookie('smt_session', token, {
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      res.status(201).json({ success: true, user })
    } catch (error: any) {
      if (error.message.startsWith('DUPLICADO:')) {
        res.status(409).json({ error: error.message.replace('DUPLICADO: ', '') })
        return
      }
      res.status(400).json({ error: error.message || 'Error al registrar cliente' })
    }
  }

  static async me(req: Request, res: Response): Promise<void> {
    const authUser = req.user || extractAuthenticatedUser(req)
    if (!authUser) {
      res.json({ user: null })
      return
    }

    res.json({
      user: {
        id: authUser.id,
        username: authUser.username,
        fullName: authUser.fullName,
        email: authUser.email,
        role: authUser.role,
      },
    })
  }

  static async logout(_req: Request, res: Response): Promise<void> {
    res.clearCookie('smt_session', { path: '/' })
    res.clearCookie('smt_token', { path: '/' })
    res.json({ success: true, message: 'Sesión finalizada correctamente' })
  }

  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body || {}
      await AuthService.forgotPassword(email)
      res.json({ success: true })
    } catch (error: any) {
      res.status(400).json({ error: error.message })
    }
  }

  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email, token, newPass, confirmPass } = req.body || {}
      await AuthService.resetPassword(email, token, newPass, confirmPass)
      res.json({ success: true })
    } catch (error: any) {
      res.status(400).json({ error: error.message })
    }
  }
}
