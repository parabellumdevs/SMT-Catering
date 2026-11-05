import { createRouter } from '../../types/http.ts'
import { QuotationController } from './quotation.controller.ts'

export const quotationRouter = createRouter()

quotationRouter.get('/availability', QuotationController.checkDate)
quotationRouter.post('/calculate', QuotationController.calculate)
