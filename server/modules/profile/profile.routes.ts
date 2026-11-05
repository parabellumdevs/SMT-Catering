import { createRouter } from '../../types/http'
import { ProfileController } from './profile.controller'
import { authGuard } from '../../middleware/authGuard'
import { requireRoles } from '../../middleware/roleGuard'

export const profileRouter = createRouter()

profileRouter.get('/profile', authGuard, requireRoles(['cliente']), ProfileController.getProfile)
profileRouter.put('/profile', authGuard, requireRoles(['cliente']), ProfileController.updateProfile)
profileRouter.post('/change-password', authGuard, requireRoles(['cliente']), ProfileController.changePassword)
