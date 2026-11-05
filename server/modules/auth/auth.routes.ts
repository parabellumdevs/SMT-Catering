import { createRouter } from '../../types/http'
import { AuthController } from './auth.controller'
import { authGuard } from '../../middleware/authGuard'

export const authRouter = createRouter()

authRouter.post('/login', AuthController.login)
authRouter.post('/register', AuthController.register)
authRouter.post('/logout', AuthController.logout)
authRouter.get('/me', authGuard, AuthController.me)
authRouter.post('/forgot-password', AuthController.forgotPassword)
authRouter.post('/reset-password', AuthController.resetPassword)
