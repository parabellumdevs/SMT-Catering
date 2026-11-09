import { createRouter } from '../../types/http.ts'
import { authGuard } from '../../middleware/authGuard.ts'
import { PaymentsController } from './payments.controller.ts'

export const paymentsRouter = createRouter()

paymentsRouter.post('/preference', PaymentsController.createPreference)
paymentsRouter.post('/confirm', PaymentsController.confirm)
paymentsRouter.post('/balance/preference', authGuard, PaymentsController.createBalancePreference)
paymentsRouter.post('/balance/confirm', authGuard, PaymentsController.confirmBalance)
