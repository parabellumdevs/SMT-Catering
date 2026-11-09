import type { Request, Response } from "../../types/http.ts";
import { getDatabase } from "../../db/client.ts";
import { extractAuthenticatedUser } from "../../middleware/authGuard.ts";
import { EventsService } from "./events.service.ts";
import { QuotationService } from "../quotation/quotation.service.ts";

export class EventsController {
  static async list(_req: Request, res: Response): Promise<void> {
    try {
      const events = await EventsService.fetchAllEvents();
      res.json({ events });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user ?? extractAuthenticatedUser(req);
      const payload = { ...(req.body || {}) };
      if (user?.role === "cliente") {
        payload.clientId = user.id;
      }
      const event = await EventsService.createEvent(payload);
      res.status(201).json({ event });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      if (!id) {
        res.status(400).json({ error: "ID de reserva requerido" });
        return;
      }

      if (!req.user) {
        res.status(401).json({ error: "No autenticado" });
        return;
      }

      const dbClient = getDatabase();
      const idReserva = Number(id.replace("EV-", ""));
      const reserva = await dbClient.queryOne<any>(
        "SELECT * FROM reserva WHERE id_reserva = ?",
        [idReserva],
      );

      if (!reserva) {
        res.status(404).json({ error: "Reserva no encontrada" });
        return;
      }

      const updates = req.body || {};

      // Si el rol es cliente, validar pertenencia estricta (IDOR prevention)
      if (req.user.role === "cliente") {
        if (Number(reserva.id_cliente) !== Number(req.user.id)) {
          res.status(403).json({ error: "No autorizado para modificar esta reserva." });
          return;
        }

        // 1. Reprogramación de fecha
        if (updates.eventDate) {
          if (reserva.evento_cancelado === 1 || reserva.estado_evento === "Cancelado") {
            res.status(400).json({ error: "No se puede reprogramar un evento cancelado." });
            return;
          }

          const availability = await QuotationService.checkAvailability(updates.eventDate, idReserva);
          if (!availability.available) {
            res.status(400).json({
              error: "La fecha seleccionada no tiene disponibilidad para nuevos servicios.",
            });
            return;
          }

          if (availability.isConcurrent && Number(reserva.cantidad_invitados) > 60) {
            res.status(400).json({
              error: "La fecha seleccionada solo admite eventos concurrentes de hasta 60 comensales.",
            });
            return;
          }

          await EventsService.updateEvent(id, {
            eventDate: updates.eventDate,
            startTime: updates.startTime,
          });
          res.json({ success: true, eventDate: updates.eventDate, startTime: updates.startTime });
          return;
        }

        // 2. Cancelación de evento con política de reintegro (>= 7 días vs < 7 días)
        if (updates.cancelled === 1 || updates.status === "Cancelado") {
          if (reserva.evento_cancelado === 1) {
            res.status(400).json({ error: "El evento ya se encuentra cancelado." });
            return;
          }

          const eventDateObj = new Date(reserva.fecha_evento);
          const today = new Date();
          const diffMs = eventDateObj.getTime() - today.getTime();
          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          const refundEligible = diffDays >= 7;

          const cancelNote = refundEligible
            ? `[Cancelación cliente: ${diffDays} días de antelación — Reintegro 100% de seña]`
            : `[Cancelación cliente: ${diffDays} días de antelación — Sin reintegro de seña (< 7 días)]`;

          await EventsService.updateEvent(id, {
            status: "Cancelado",
            cancelled: 1,
            kitchenNotes: reserva.notas_cocina
              ? `${reserva.notas_cocina} | ${cancelNote}`
              : cancelNote,
          });

          res.json({
            success: true,
            cancelled: true,
            refundEligible,
            daysNotice: diffDays,
            message: refundEligible
              ? "Evento cancelado exitosamente. Se ha aprobado el reintegro del 100% de la seña."
              : "Evento cancelado. De acuerdo a las políticas de contratación (< 7 días de antelación), la seña no tiene reintegro.",
          });
          return;
        }

        // Los clientes solo actualizan el saldo mediante la confirmación de Mercado Pago.
        if (updates.paymentStatus === "SALDADO") {
          res.status(403).json({
            error: "El saldo debe pagarse y confirmarse mediante la pasarela de pago.",
          });
          return;
        }

        res.status(400).json({ error: "Acción no permitida para el rol cliente." });
        return;
      }

      // Si es rol staff (admin o superadmin):
      if (updates.paymentStatus === "SALDADO") {
        if (req.user.role !== "admin" && req.user.role !== "superadmin") {
          res.status(403).json({
            error: "Solo los administradores pueden registrar cobros de saldo.",
          });
          return;
        }
      } else if (req.user.role !== "admin" && req.user.role !== "superadmin") {
        res.status(403).json({ error: "No autorizado para modificar eventos." });
        return;
      }

      await EventsService.updateEvent(id, updates);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async myEvents(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "No autorizado" });
        return;
      }

      if (req.user.role === "cliente") {
        const events = await EventsService.fetchEventsByClientId(req.user.id);
        res.json({ events });
        return;
      }

      const events = await EventsService.fetchAllEvents();
      res.json({ events });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
