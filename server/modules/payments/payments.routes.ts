import { createRouter } from '../../types/http.ts'
import { PaymentsController } from './payments.controller.ts'

export const paymentsRouter = createRouter()

paymentsRouter.post('/preference', PaymentsController.createPreference)
paymentsRouter.post('/confirm', PaymentsController.confirm)
