import type { Request, Response, NextFunction, AuthenticatedUser } from '../types/http.ts'
import { verifyJwt } from '../lib/jwt.ts'

export function extractAuthenticatedUser(req: Request): AuthenticatedUser | null {
  const token =
    req.cookies?.['smt_session'] ||
    req.cookies?.['smt_token'] ||
    (typeof req.headers.authorization === 'string'
      ? req.headers.authorization.replace('Bearer ', '').trim()
      : undefined)

  if (!token) return null

  const payload = verifyJwt(token)
  if (!payload) return null

  return {
    id: payload.id,
    role: payload.role,
    email: payload.email,
    fullName: payload.fullName,
    username: payload.email ? payload.email.split('@')[0] : 'usuario',
    isClient: payload.isClient,
  }
}

/**
 * Middleware de verificación de autenticación.
 * Lee el token JWT firmado desde la cookie HTTP-only smt_session (o header Authorization Bearer).
 */
export function authGuard(req: Request, res: Response, next?: NextFunction): void {
  const user = extractAuthenticatedUser(req)

  if (!user) {
    res.status(401).json({ error: 'No autenticado. Inicie sesión para continuar.' })
    return
  }

  req.user = user
  if (next) next()
}
