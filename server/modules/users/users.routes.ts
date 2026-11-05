import { createRouter } from '../../types/http'
import { UsersController } from './users.controller'
import { authGuard } from '../../middleware/authGuard'
import { requireRoles } from '../../middleware/roleGuard'

export const usersRouter = createRouter()

usersRouter.get('/', authGuard, requireRoles(['admin', 'superadmin']), UsersController.list)
usersRouter.post('/staff', authGuard, requireRoles(['admin', 'superadmin']), UsersController.createStaff)
usersRouter.patch('/staff/:id', authGuard, requireRoles(['admin', 'superadmin']), UsersController.updateStaff)
usersRouter.put('/staff/:id', authGuard, requireRoles(['admin', 'superadmin']), UsersController.updateStaff)
usersRouter.delete('/staff/:id', authGuard, requireRoles(['superadmin']), UsersController.deleteStaff)

usersRouter.patch('/clients/:id', authGuard, requireRoles(['admin', 'superadmin']), UsersController.updateClient)
usersRouter.put('/clients/:id', authGuard, requireRoles(['admin', 'superadmin']), UsersController.updateClient)
