import { createRouter } from '../../types/http.ts'
import { ProfileController } from './profile.controller.ts'
import { authGuard } from '../../middleware/authGuard.ts'
import { requireRoles } from '../../middleware/roleGuard.ts'

export const profileRouter = createRouter()

profileRouter.get('/profile', authGuard, requireRoles(['cliente']), ProfileController.getProfile)
profileRouter.put('/profile', authGuard, requireRoles(['cliente']), ProfileController.updateProfile)
profileRouter.post('/change-password', authGuard, requireRoles(['cliente']), ProfileController.changePassword)

