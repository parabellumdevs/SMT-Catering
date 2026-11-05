import { createRouter } from '../../types/http'
import { TariffsController } from './tariffs.controller'
import { authGuard } from '../../middleware/authGuard'
import { requireRoles } from '../../middleware/roleGuard'

export const tariffsRouter = createRouter()

tariffsRouter.get('/', TariffsController.list)
tariffsRouter.put('/:id', authGuard, requireRoles(['admin', 'superadmin']), TariffsController.update)
tariffsRouter.post('/bulk', authGuard, requireRoles(['admin', 'superadmin']), TariffsController.bulkUpdate)
