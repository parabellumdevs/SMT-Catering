import type { Request, Response } from '../../types/http.ts'
import { PaymentError, PaymentsService } from './payments.service.ts'

function getOrigin(req: Request): string | undefined {
  const origin = req.headers.origin
  if (typeof origin === 'string') return origin
  if (Array.isArray(origin)) return origin[0]
  return process.env.APP_URL
}

function respondWithError(res: Response, error: unknown): void {
  if (error instanceof PaymentError) {
    res.status(error.statusCode).json({ error: error.message })
    return
  }

  console.error('Error en la integración de Mercado Pago:', error)
  res.status(500).json({ error: 'No se pudo completar la operación de pago.' })
}

export class PaymentsController {
  static async createPreference(req: Request, res: Response): Promise<void> {
    try {
      const result = await PaymentsService.createPreference(req.body, getOrigin(req) || '')
      res.json(result)
    } catch (error) {
      respondWithError(res, error)
    }
  }

  static async confirm(req: Request, res: Response): Promise<void> {
    try {
      const { paymentId, externalReference } = req.body || {}
      const result = await PaymentsService.confirmPayment(
        String(paymentId || ''),
        String(externalReference || ''),
      )
      res.json(result)
    } catch (error) {
      respondWithError(res, error)
    }
  }
}
