import { getDatabase } from "../../db/client.ts";

interface EventStationRow {
  codigo: string;
  id_estacion: number;
  precio_por_persona: number | string;
}

async function persistEventStations(
  dbClient: ReturnType<typeof getDatabase>,
  idReserva: number,
  stationIds: string[],
  extraIds: string[],
  guests: number,
): Promise<void> {
  const selectedIds = [...new Set([...stationIds, ...extraIds])];
  if (selectedIds.length === 0) return;

  const placeholders = selectedIds.map(() => "?").join(", ");
  const stationRows = await dbClient.query<EventStationRow>(
    `SELECT codigo, id_estacion, precio_por_persona
     FROM estacion
     WHERE codigo IN (${placeholders})`,
    selectedIds,
  );
  const stations = new Map(stationRows.map((station) => [station.codigo, station]));
  const missingExtras = extraIds.filter((id) => !stations.has(id));

  if (missingExtras.length > 0) {
    const extraPlaceholders = missingExtras.map(() => "?").join(", ");
    const tariffs = await dbClient.query<{
      id: string;
      label: string;
      price_per_guest_cents: number | string;
    }>(
      `SELECT id, label, price_per_guest_cents
       FROM tarifas
       WHERE category = 'extra' AND is_active = 1 AND id IN (${extraPlaceholders})`,
      missingExtras,
    );
    const tariffsById = new Map(tariffs.map((tariff) => [tariff.id, tariff]));

    const insertedExtras = await Promise.all(missingExtras.map(async (id) => {
      const tariff = tariffsById.get(id);
      if (!tariff) {
        throw new Error(`No se encontró la tarifa del adicional seleccionado: ${id}`);
      }

      const result = await dbClient.execute(
        `INSERT INTO estacion (codigo, nombre, tipo_comida, descripcion, precio_por_persona)
         VALUES (?, ?, 'extra', ?, ?)
         ON CONFLICT (codigo) DO UPDATE
         SET nombre = EXCLUDED.nombre,
             descripcion = EXCLUDED.descripcion,
             precio_por_persona = EXCLUDED.precio_por_persona
         RETURNING id_estacion, precio_por_persona`,
        [
          id,
          tariff.label,
          tariff.label,
          Number(tariff.price_per_guest_cents) / 100,
        ],
      );
      if (!result.row) {
        throw new Error(`No se pudo registrar el adicional seleccionado: ${id}`);
      }

      return {
        codigo: id,
        id_estacion: result.row.id_estacion,
        precio_por_persona: result.row.precio_por_persona,
      };
    }));

    for (const station of insertedExtras) {
      stations.set(station.codigo, station);
    }
  }

  await Promise.all(selectedIds.map(async (id) => {
    const station = stations.get(id);
    if (!station) {
      throw new Error(`No se encontró la estación seleccionada: ${id}`);
    }
    const subtotal = Number(station.precio_por_persona) * guests;
    await dbClient.execute(
      `INSERT INTO detalle_reserva_estacion (id_reserva, id_estacion, subtotal_calculado)
       VALUES (?, ?, ?)`,
      [idReserva, station.id_estacion, subtotal],
    );
  }));
}

export class EventsService {
  static async fetchAllEvents() {
    const dbClient = getDatabase();
    const rows = await dbClient.query(
      `SELECT
        r.*,
        c.razon_social as cliente_empresa,
        c.nombre_completo as contacto
      FROM reserva r
      JOIN cliente c ON c.id_cliente = r.id_cliente
      ORDER BY r.fecha_evento ASC`,
    );

    const events = await Promise.all(
      rows.map(async (r: any) => {
        const [stationRows, dietaryRows, pagos] = await Promise.all([
          dbClient.query(
            `SELECT e.codigo
             FROM detalle_reserva_estacion dre
             JOIN estacion e ON e.id_estacion = dre.id_estacion
             WHERE dre.id_reserva = ?`,
            [r.id_reserva],
          ),
          dbClient.query(
            `SELECT tipo_restriccion, cantidad_personas, observaciones
             FROM restriccion_alimentaria
             WHERE id_reserva = ?`,
            [r.id_reserva],
          ),
          dbClient.query(
            `SELECT tipo_pago, monto, estado
             FROM pago
             WHERE id_reserva = ? AND estado = 'confirmado'`,
            [r.id_reserva],
          ),
        ]);

        const stations = stationRows.map((s: any) => s.codigo);

        let celiacos = 0;
        let vegetarianos = 0;
        let veganos = 0;
        let hipertensos = 0;
        const alergias: string[] = [];

        for (const d of dietaryRows) {
          const tipo = (d.tipo_restriccion || "").toLowerCase();
          if (tipo.includes("celia")) celiacos += d.cantidad_personas;
          else if (tipo.includes("vege")) vegetarianos += d.cantidad_personas;
          else if (tipo.includes("vega")) veganos += d.cantidad_personas;
          else if (tipo.includes("hipertens")) hipertensos += d.cantidad_personas;
          else if (tipo.includes("alerg")) {
            if (d.observaciones) alergias.push(d.observaciones);
          }
        }

        let depositPesos = 0;
        for (const p of pagos) {
          if (p.tipo_pago === "SEÑA" || p.tipo_pago === "TOTAL" || p.tipo_pago === "SALDO") {
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
            hipertensos,
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
    const dbClient = getDatabase();

    // 1. Cliente B2B (obtener o crear)
    let cliente = await dbClient.queryOne(
      "SELECT id_cliente FROM cliente WHERE razon_social = ?",
      [body.clientName],
    );
    let idCliente = cliente?.id_cliente;
    if (!idCliente) {
      const insertResult = await dbClient.execute(
        `INSERT INTO cliente (razon_social, cuit, nombre_completo, email, password_hash)
         VALUES (?, ?, ?, ?, ?)
         RETURNING id_cliente`,
        [
          body.clientName,
          `30-${Date.now().toString().slice(-8)}-1`,
          body.clientName,
          `eventos@${body.clientName.toLowerCase().replace(/[^a-z0-9]/g, "") || "cliente"}.com`,
          "temp_hash",
        ],
      );
      idCliente = Number(insertResult.row?.id_cliente);
      if (!Number.isSafeInteger(idCliente) || idCliente <= 0) {
        throw new Error("PostgreSQL no devolvió el ID del cliente creado.");
      }
    }

    // 2. Reserva
    const totalPesos = (body.totalCents || 0) / 100;
    const seguroPesos = (body.insuranceCents || 0) / 100;

    const reservaResult = await dbClient.execute(
      `INSERT INTO reserva (
        id_cliente, fecha_evento, hora_inicio, hora_fin, duracion_horas,
        cantidad_invitados, direccion_evento, distancia_km, evento_cancelado,
        estado_evento, estado_pago, notas_cocina, monto_total, monto_seguro
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        body.status || "Señado / Confirmado",
        body.paymentStatus || "SALDO_PENDIENTE",
        body.kitchenNotes || "",
        totalPesos,
        seguroPesos,
      ],
    );

    const idReserva = Number(reservaResult.row?.id_reserva);
    if (!Number.isSafeInteger(idReserva) || idReserva <= 0) {
      throw new Error("PostgreSQL no devolvió el ID de la reserva creada.");
    }

    // 3. Detalle de Estaciones
    await persistEventStations(
      dbClient,
      idReserva,
      Array.isArray(body.stationIds) ? body.stationIds : [],
      Array.isArray(body.extraIds) ? body.extraIds : [],
      body.guests || 50,
    );

    // 4. Restricciones Alimentarias
    if (body.dietary) {
      if (body.dietary.celiacos > 0) {
        await dbClient.execute(
          `INSERT INTO restriccion_alimentaria (id_reserva, tipo_restriccion, cantidad_personas, observaciones)
           VALUES (?, ?, ?, ?)`,
          [idReserva, "Celiaquía", body.dietary.celiacos, "Menú celíaco"],
        );
      }
      if (body.dietary.vegetarianos > 0) {
        await dbClient.execute(
          `INSERT INTO restriccion_alimentaria (id_reserva, tipo_restriccion, cantidad_personas, observaciones)
           VALUES (?, ?, ?, ?)`,
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
           VALUES (?, ?, ?, ?)`,
          [idReserva, "Veganos", body.dietary.veganos, "Menú vegano"],
        );
      }
      if (body.dietary.hipertensos > 0) {
        await dbClient.execute(
          `INSERT INTO restriccion_alimentaria (id_reserva, tipo_restriccion, cantidad_personas, observaciones)
           VALUES (?, ?, ?, ?)`,
          [idReserva, "Hipertensos", body.dietary.hipertensos, "Menú bajo en sodio"],
        );
      }
      if (body.dietary.alergias) {
        await dbClient.execute(
          `INSERT INTO restriccion_alimentaria (id_reserva, tipo_restriccion, cantidad_personas, observaciones)
           VALUES (?, ?, ?, ?)`,
          [idReserva, "Alergias", 1, body.dietary.alergias],
        );
      }
    }

    // 5. Pago inicial (seña)
    if (body.depositCents > 0) {
      const isPaidInFull = body.paymentStatus === "SALDADO";
      await dbClient.execute(
        `INSERT INTO pago (id_reserva, tipo_pago, monto, pago_online, pago_completo, estado)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          idReserva,
          isPaidInFull ? "TOTAL" : "SEÑA",
          body.depositCents / 100,
          1,
          isPaidInFull ? 1 : 0,
          "confirmado",
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
         estado_evento = COALESCE(?, estado_evento),
         estado_pago = COALESCE(?, estado_pago),
         notas_cocina = COALESCE(?, notas_cocina),
         fecha_actualizacion = CURRENT_TIMESTAMP,
         fecha_evento = COALESCE(?, fecha_evento),
         hora_inicio = COALESCE(?, hora_inicio),
         evento_cancelado = COALESCE(?, evento_cancelado)
       WHERE id_reserva = ?`,
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

    // Si se salda el evento, registrar el pago del saldo restante en la tabla pago
    if (updates.paymentStatus === "SALDADO") {
      const res = await dbClient.queryOne<{ monto_total: number | string }>(
        `SELECT monto_total FROM reserva WHERE id_reserva = ?`,
        [idReserva],
      );
      if (res) {
        const montoTotal = Number(res.monto_total) || 0;
        const pagosRows = await dbClient.query<{ monto: number | string }>(
          `SELECT monto FROM pago WHERE id_reserva = ? AND estado = 'confirmado'`,
          [idReserva],
        );
        let yaAbonado = 0;
        for (const p of pagosRows) {
          yaAbonado += Number(p.monto) || 0;
        }
        const saldoRemanente = Math.max(0, montoTotal - yaAbonado);
        if (saldoRemanente > 0) {
          await dbClient.execute(
            `INSERT INTO pago (id_reserva, tipo_pago, monto, pago_online, pago_completo, estado)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [idReserva, "SALDO", saldoRemanente, 1, 1, "confirmado"],
          );
        }
      }
    }
  }
}
