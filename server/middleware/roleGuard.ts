import type { Request, Response, NextFunction } from '../types/http'
import type { UserRole } from '../../shared/types/roles'

/**
 * Middleware RBAC para restringir endpoints según roles permitidos.
 */
export function requireRoles(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next?: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'No autenticado. Inicie sesión para continuar.' })
      return
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Acceso denegado. Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}`,
      })
      return
    }

    if (next) next()
  }
}
