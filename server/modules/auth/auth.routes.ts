import { createRouter } from '../../types/http.ts'
import { AuthController } from './auth.controller.ts'

export const authRouter = createRouter()

authRouter.post('/login', AuthController.login)
authRouter.post('/register', AuthController.register)
authRouter.post('/logout', AuthController.logout)
authRouter.get('/me', AuthController.me)
authRouter.post('/forgot-password', AuthController.forgotPassword)
authRouter.post('/reset-password', AuthController.resetPassword)
