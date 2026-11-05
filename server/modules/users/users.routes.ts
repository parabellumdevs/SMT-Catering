import { createRouter } from '../../types/http.ts'
import { UsersController } from './users.controller.ts'
import { authGuard } from '../../middleware/authGuard.ts'
import { requireRoles } from '../../middleware/roleGuard.ts'

export const usersRouter = createRouter()

usersRouter.get('/', authGuard, requireRoles(['admin', 'superadmin']), UsersController.list)
usersRouter.post('/staff', authGuard, requireRoles(['admin', 'superadmin']), UsersController.createStaff)
usersRouter.patch('/staff/:id', authGuard, requireRoles(['admin', 'superadmin']), UsersController.updateStaff)
usersRouter.put('/staff/:id', authGuard, requireRoles(['admin', 'superadmin']), UsersController.updateStaff)
usersRouter.delete('/staff/:id', authGuard, requireRoles(['superadmin']), UsersController.deleteStaff)

usersRouter.patch('/clients/:id', authGuard, requireRoles(['admin', 'superadmin']), UsersController.updateClient)
usersRouter.put('/clients/:id', authGuard, requireRoles(['admin', 'superadmin']), UsersController.updateClient)

