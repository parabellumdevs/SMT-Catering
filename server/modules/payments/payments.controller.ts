import type { Request, Response } from '../../types/http.ts'
import { PaymentError, PaymentsService } from './payments.service.ts'

function getOrigin(req: Request): string | undefined {
  if (process.env.APP_URL) return process.env.APP_URL

  const origin = req.headers.origin
  if (typeof origin === 'string') return origin
  if (Array.isArray(origin)) return origin[0]
  return undefined
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

  static async createBalancePreference(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'cliente') {
        throw new PaymentError('Solo un cliente autenticado puede pagar un saldo.', 403)
      }

      const eventId = typeof req.body?.eventId === 'string' ? req.body.eventId : ''
      const result = await PaymentsService.createBalancePreference(
        eventId,
        req.user.id,
        getOrigin(req) || '',
      )
      res.json(result)
    } catch (error) {
      respondWithError(res, error)
    }
  }

  static async confirmBalance(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'cliente') {
        throw new PaymentError('Solo un cliente autenticado puede confirmar un saldo.', 403)
      }

      const { paymentId, externalReference } = req.body || {}
      const result = await PaymentsService.confirmBalancePayment(
        String(paymentId || ''),
        String(externalReference || ''),
        req.user.id,
      )
      res.json(result)
    } catch (error) {
      respondWithError(res, error)
    }
  }
}
