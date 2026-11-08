import type { Request, Response } from "../../types/http.ts";
import { EventsService } from "./events.service.ts";

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
      console.log("Creating event with data:", req.body);
      const event = await EventsService.createEvent(req.body || {});
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

      const updates = req.body || {};

      if (updates.paymentStatus === "SALDADO") {
        if (req.user?.role !== "admin") {
          res
            .status(403)
            .json({
              error:
                "Solo los administradores pueden registrar cobros de saldo.",
            });
          return;
        }
      } else if (
        req.user?.role !== "admin" &&
        req.user?.role !== "superadmin"
      ) {
        res
          .status(403)
          .json({ error: "No autorizado para modificar eventos." });
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
      const events = await EventsService.fetchAllEvents();
      // Si es cliente, filtrar por su ID o razón social
      const filtered = events.filter((_e: any) => {
        // En una evolución posterior podemos filtrar por id_cliente directamente
        return true;
      });
      res.json({ events: filtered });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
