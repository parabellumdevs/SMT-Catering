import { createRouter } from '../../types/http.ts'
import { TariffsController } from './tariffs.controller.ts'
import { authGuard } from '../../middleware/authGuard.ts'
import { requireRoles } from '../../middleware/roleGuard.ts'

export const tariffsRouter = createRouter()

tariffsRouter.get('/', TariffsController.list)
tariffsRouter.put('/:id', authGuard, requireRoles(['admin', 'superadmin']), TariffsController.update)
tariffsRouter.post('/bulk', authGuard, requireRoles(['admin', 'superadmin']), TariffsController.bulkUpdate)
