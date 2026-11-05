import type { Request, Response, NextFunction } from '../types/http'
import { verifyJwt } from '../lib/jwt'

/**
 * Middleware de verificación de autenticación.
 * Lee el token JWT firmado desde la cookie HTTP-only smt_session (o header Authorization Bearer).
 */
export function authGuard(req: Request, res: Response, next?: NextFunction): void {
  const token =
    req.cookies?.['smt_session'] ||
    req.cookies?.['smt_token'] ||
    (typeof req.headers.authorization === 'string'
      ? req.headers.authorization.replace('Bearer ', '').trim()
      : undefined)

  if (!token) {
    res.status(401).json({ error: 'No autenticado. Inicie sesión para continuar.' })
    return
  }

  const payload = verifyJwt(token)
  if (!payload) {
    res.status(401).json({ error: 'Sesión inválida o expirada. Vuelva a iniciar sesión.' })
    return
  }

  req.user = {
    id: payload.id,
    role: payload.role,
    email: payload.email,
    fullName: payload.fullName,
    username: payload.email ? payload.email.split('@')[0] : 'usuario',
    isClient: payload.isClient,
  }

  if (next) next()
}
