import { getDatabase } from "../../db/client.ts";
import { CONCURRENT_GUEST_MAX } from "../../../shared/schemas/quotation.schema.ts";

export class QuotationService {
  static async checkAvailability(
    date: string,
    excludeReservaId?: number,
    requestedGuests?: number,
  ): Promise<{ available: boolean; isConcurrent: boolean }> {
    const dbClient = getDatabase();
    const query = excludeReservaId
      ? "SELECT count(*) as count, sum(cantidad_invitados) as total_guests FROM reserva WHERE fecha_evento = ? AND evento_cancelado = 0 AND id_reserva != ?"
      : "SELECT count(*) as count, sum(cantidad_invitados) as total_guests FROM reserva WHERE fecha_evento = ? AND evento_cancelado = 0";
    const params = excludeReservaId ? [date, excludeReservaId] : [date];
    const result = await dbClient.queryOne(query, params);

    const count = Number(result?.count || 0);
    const totalGuests = Number(result?.total_guests || 0);

    if (count === 0) {
      return { available: true, isConcurrent: false };
    }

    // Solo se permite concurrencia si ambos eventos tienen como máximo 60 invitados.
    if (
      count === 1 &&
      totalGuests <= CONCURRENT_GUEST_MAX &&
      (requestedGuests === undefined ||
        (requestedGuests > 0 && requestedGuests <= CONCURRENT_GUEST_MAX))
    ) {
      return { available: true, isConcurrent: true };
    }

    return { available: false, isConcurrent: false };
  }

  static async calculateQuotation(input: {
    guests: number;
    stationIds: string[];
    distanceKm?: number;
  }) {
    const dbClient = getDatabase();
    const tariffs = await dbClient.query(
      "SELECT * FROM tarifas WHERE is_active = 1",
    );
    const stations = await dbClient.query("SELECT * FROM estacion");

    const baseTariff =
      tariffs.find((t: any) => t.category === "base")?.price_per_guest_cents ||
      0;
    const insuranceCents =
      tariffs.find((t: any) => t.category === "insurance")?.fixed_cents || 0;

    let stationsCentsPerGuest = 0;
    for (const stationId of input.stationIds) {
      const station = stations.find((s: any) => s.codigo === stationId);
      if (station) {
        stationsCentsPerGuest += Math.round(
          Number(station.precio_por_persona) * 100,
        );
      }
    }

    const perGuestCents = baseTariff + stationsCentsPerGuest;
    const subtotalCents = perGuestCents * input.guests;
    const totalCents = subtotalCents + insuranceCents;
    const depositCents = Math.round((totalCents * 30) / 100); // Seña 30% según política Meet 2/3
    const balanceCents = totalCents - depositCents;

    return {
      perGuestCents,
      subtotalCents,
      insuranceCents,
      totalCents,
      depositCents,
      balanceCents,
    };
  }
}
