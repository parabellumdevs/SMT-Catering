import { createRouter } from '../../types/http.ts'
import { ProductionController } from './production.controller.ts'
import { authGuard } from '../../middleware/authGuard.ts'
import { requireRoles } from '../../middleware/roleGuard.ts'

export const productionRouter = createRouter()

productionRouter.get(
  '/:eventId',
  authGuard,
  requireRoles(['cocina', 'admin', 'superadmin']),
  ProductionController.getComanda,
)
