
import { getDatabase } from "../../db/client.ts";

export class EventsService {
  private static columnsChecked = false;

  /**
   * Verifica y crea las columnas necesarias para almacenar
   * comprobantes de transferencia y sus observaciones.
   */
  private static async ensureColumnsExist(): Promise<void> {
    if (this.columnsChecked) return;

    const dbClient = getDatabase();

    await dbClient.exec(`
      ALTER TABLE pago
      ADD COLUMN IF NOT EXISTS comprobante_url TEXT
    `);

    await dbClient.exec(`
      ALTER TABLE pago
      ADD COLUMN IF NOT EXISTS observaciones TEXT
    `);

    this.columnsChecked = true;
  }

  static async fetchAllEvents() {
    await this.ensureColumnsExist();

    const dbClient = getDatabase();

    const rows = await dbClient.query(
      `SELECT DISTINCT ON (r.id_reserva)
        r.*,
        c.razon_social as cliente_empresa,
        c.nombre_completo as contacto
      FROM reserva r
      JOIN cliente c ON c.id_cliente = r.id_cliente
      ORDER BY r.id_reserva, r.fecha_evento ASC`,
    );

    const events = await Promise.all(
      rows.map(async (r: any) => {
        const [stationRows, dietaryRows, pagos] = await Promise.all([
          dbClient.query(
            `SELECT e.codigo
             FROM detalle_reserva_estacion dre
             JOIN estacion e ON e.id_estacion = dre.id_estacion
             WHERE dre.id_reserva = $1`,
            [r.id_reserva],
          ),
          dbClient.query(
            `SELECT tipo_restriccion, cantidad_personas, observaciones
             FROM restriccion_alimentaria
             WHERE id_reserva = $1`,
            [r.id_reserva],
          ),
          dbClient.query(
            `SELECT tipo_pago, monto, estado
             FROM pago
             WHERE id_reserva = $1 AND estado = 'confirmado'`,
            [r.id_reserva],
          ),
        ]);

        const stations = stationRows.map((s: any) => s.codigo);

        let celiacos = 0;
        let vegetarianos = 0;
        let veganos = 0;
        const alergias: string[] = [];

        for (const d of dietaryRows) {
          const tipo = (d.tipo_restriccion || "").toLowerCase();

          if (tipo.includes("celia")) celiacos += d.cantidad_personas;
          else if (tipo.includes("vege")) vegetarianos += d.cantidad_personas;
          else if (tipo.includes("vega")) veganos += d.cantidad_personas;
          else if (tipo.includes("alerg")) {
            if (d.observaciones) alergias.push(d.observaciones);
          }
        }

        let depositPesos = 0;

        for (const p of pagos) {
          if (
            p.tipo_pago === "SEÑA" ||
            p.tipo_pago === "TOTAL" ||
            p.tipo_pago === "SALDO"
          ) {
            depositPesos += Number(p.monto) || 0;
          }
        }

        return {
          id: `EV-${r.id_reserva}`,
          clientName: r.cliente_empresa || r.contacto,
          eventDate: r.fecha_evento,
          guests: r.cantidad_invitados,
          stationIds: stations,
          status: r.estado_evento || "Presupuestado",
          paymentStatus: r.estado_pago || "SALDO_PENDIENTE",
          totalCents: Math.round((Number(r.monto_total) || 0) * 100),
          depositCents: Math.round(depositPesos * 100),
          dietary: {
            celiacos,
            vegetarianos,
            veganos,
            alergias: alergias.join(", "),
          },
          kitchenNotes: r.notas_cocina || "",
          startTime: r.hora_inicio,
          endTime: r.hora_fin,
          durationHours: Number(r.duracion_horas) || 3.0,
          locationAddress: r.direccion_evento,
          distanceKm: Number(r.distancia_km) || 10.0,
          insuranceCents: Math.round((Number(r.monto_seguro) || 0) * 100),
          cancelled: r.evento_cancelado === 1,
        };
      }),
    );

    return events;
  }

  static async createEvent(body: any) {
    await this.ensureColumnsExist();

    const dbClient = getDatabase();

    // Evaluar si incluye comprobante o transferencia
    const hasReceipt = Boolean(body.receipt && body.receipt.dataUrl);

const isTransfer =
  hasReceipt ||
  body.paymentStatus === "SEÑA_PENDIENTE" ||
  ["Seña pendiente", "Seña a confirmar"].includes(body.status);

const estadoEvento = isTransfer
  ? "Seña a confirmar"
  : (body.status || "Señado / Confirmado");

const estadoPago = isTransfer
  ? "SEÑA_PENDIENTE"
  : (body.paymentStatus || "SALDO_PENDIENTE");

    // 1. Cliente B2B (obtener o crear)
    let cliente = await dbClient.queryOne(
      "SELECT id_cliente FROM cliente WHERE razon_social = $1",
      [body.clientName],
    );

    let idCliente = cliente?.id_cliente;

    if (!idCliente) {
      const insertClienteResult = await dbClient.query(
        `INSERT INTO cliente (razon_social, cuit, nombre_completo, email, password_hash)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id_cliente`,
        [
          body.clientName,
          `30-${Date.now().toString().slice(-8)}-1`,
          body.clientName,
          `eventos@${body.clientName.toLowerCase().replace(/[^a-z0-9]/g, "") || "cliente"}.com`,
          "temp_hash",
        ],
      );

      idCliente = insertClienteResult[0]?.id_cliente;
    }

    // 2. Reserva
    const totalPesos = (body.totalCents || 0) / 100;
    const seguroPesos = (body.insuranceCents || 0) / 100;

    const reservaResult = await dbClient.query(
      `INSERT INTO reserva (
        id_cliente, fecha_evento, hora_inicio, hora_fin, duracion_horas,
        cantidad_invitados, direccion_evento, distancia_km, evento_cancelado,
        estado_evento, estado_pago, notas_cocina, monto_total, monto_seguro
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id_reserva`,
      [
        idCliente,
        body.eventDate,
        body.startTime || "19:30",
        body.endTime || "22:30",
        body.durationHours || 3.0,
        body.guests || 50,
        body.locationAddress || "CABA",
        body.distanceKm || 10.0,
        0,
        estadoEvento,
        estadoPago,
        body.kitchenNotes || "",
        totalPesos,
        seguroPesos,
      ],
    );

    const idReserva = reservaResult[0]?.id_reserva;

    if (!idReserva) {
      throw new Error("No se pudo obtener el ID de la reserva insertada.");
    }

    // 3. Detalle de Estaciones
    if (Array.isArray(body.stationIds) && body.stationIds.length > 0) {
      for (const stationSlug of body.stationIds) {
        const s = await dbClient.queryOne(
          "SELECT id_estacion, precio_por_persona FROM estacion WHERE codigo = $1",
          [stationSlug],
        );

        if (s) {
          const subtotal = Number(s.precio_por_persona) * (body.guests || 50);

          await dbClient.execute(
            `INSERT INTO detalle_reserva_estacion (id_reserva, id_estacion, subtotal_calculado)
             VALUES ($1, $2, $3)`,
            [idReserva, s.id_estacion, subtotal],
          );
        }
      }
    }

    // 4. Restricciones Alimentarias
    if (body.dietary) {
      if (body.dietary.celiacos > 0) {
        await dbClient.execute(
          `INSERT INTO restriccion_alimentaria (id_reserva, tipo_restriccion, cantidad_personas, observaciones)
           VALUES ($1, $2, $3, $4)`,
          [idReserva, "Celiaquía", body.dietary.celiacos, "Menú celíaco"],
        );
      }

      if (body.dietary.vegetarianos > 0) {
        await dbClient.execute(
          `INSERT INTO restriccion_alimentaria (id_reserva, tipo_restriccion, cantidad_personas, observaciones)
           VALUES ($1, $2, $3, $4)`,
          [
            idReserva,
            "Vegetarianos",
            body.dietary.vegetarianos,
            "Menú vegetariano",
          ],
        );
      }

      if (body.dietary.veganos > 0) {
        await dbClient.execute(
          `INSERT INTO restriccion_alimentaria (id_reserva, tipo_restriccion, cantidad_personas, observaciones)
           VALUES ($1, $2, $3, $4)`,
          [idReserva, "Veganos", body.dietary.veganos, "Menú vegano"],
        );
      }

      if (body.dietary.alergias) {
        await dbClient.execute(
          `INSERT INTO restriccion_alimentaria (id_reserva, tipo_restriccion, cantidad_personas, observaciones)
           VALUES ($1, $2, $3, $4)`,
          [idReserva, "Alergias", 1, body.dietary.alergias],
        );
      }
    }

    // 5. Pago inicial / Comprobante
    if (body.depositCents > 0 || hasReceipt) {
      const montoDeposito = (body.depositCents || 0) / 100;
      const estadoPagoTabla = hasReceipt ? "pendiente" : "confirmado";

      const observacionesComprobante = hasReceipt
        ? `Comprobante: ${body.receipt.name} (${body.receipt.mimeType})`
        : null;

      await dbClient.execute(
        `INSERT INTO pago (
          id_reserva, tipo_pago, monto, pago_online, pago_completo, estado,
          comprobante_url, observaciones
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          idReserva,
          "SEÑA",
          montoDeposito,
          1,
          0,
          estadoPagoTabla,
          body.receipt?.dataUrl || null,
          observacionesComprobante,
        ],
      );
    }

    const all = await this.fetchAllEvents();

    return all.find((e: any) => e.id === `EV-${idReserva}`);
  }

  static async updateEvent(
    rawId: string,
    updates: {
      status?: string;
      paymentStatus?: string;
      kitchenNotes?: string;
      eventDate?: string;
      startTime?: string;
      cancelled?: number;
    },
  ) {
    const dbClient = getDatabase();
    const idReserva = Number(rawId.replace("EV-", ""));

    await dbClient.execute(
      `UPDATE reserva
       SET
         estado_evento = COALESCE($1, estado_evento),
         estado_pago = COALESCE($2, estado_pago),
         notas_cocina = COALESCE($3, notas_cocina),
         fecha_actualizacion = CURRENT_TIMESTAMP,
         fecha_evento = COALESCE($4, fecha_evento),
         hora_inicio = COALESCE($5, hora_inicio),
         evento_cancelado = COALESCE($6, evento_cancelado)
       WHERE id_reserva = $7`,
      [
        updates.status ?? null,
        updates.paymentStatus ?? null,
        updates.kitchenNotes ?? null,
        updates.eventDate ?? null,
        updates.startTime ?? null,
        updates.cancelled ?? null,
        idReserva,
      ],
    );
  }
}
