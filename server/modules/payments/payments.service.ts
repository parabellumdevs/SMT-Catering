import { randomUUID } from "node:crypto";

import { getDatabase } from "../../db/client.ts";
import { EventsService } from "../events/events.service.ts";

interface ReservationInput {
  clientName: string;
  eventDate: string;
  guests: number;
  stationIds: string[];
  extraIds: string[];
  startTime?: string;
  endTime?: string;
  durationHours?: number;
  locationAddress?: string;
  distanceKm?: number;
  dietary: {
    celiacos: number;
    vegetarianos: number;
    veganos: number;
    hipertensos?: number;
    alergias: string;
    otrosDetalle?: string;
    otrosCantidad?: number;
  };
  kitchenNotes: string;
}

type InitialPayment = "deposit" | "full";

interface CreatePreferenceInput {
  reservation: ReservationInput;
  initialPayment: InitialPayment;
}

interface MercadoPagoPayment {
  id: number;
  status: string;
  currency_id: string;
  transaction_amount: number;
  external_reference: string;
  preference_id?: string;
}

export class PaymentError extends Error {
  statusCode: number;
  object?: unknown;
  constructor(message: string, statusCode: number = 400, object?: unknown) {
    super(message);
    this.name = "PaymentError";
    this.statusCode = statusCode;
    this.object = object;
  }
}

const DEPOSIT_PERCENT = 50;

function getAccessToken(): string {
  const accessToken = process.env.ACCESS_TOKEN_MP;
  if (!accessToken) {
    throw new PaymentError(
      "La pasarela de Mercado Pago no está configurada.",
      503,
    );
  }

  return accessToken;
}

async function mercadoPagoRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof body.message === "string"
        ? body.message
        : `Mercado Pago respondió con HTTP ${response.status}.`;
    throw new PaymentError(message, 502);
  }

  return body as T;
}

function normalizeAppOrigin(origin: string): string {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    throw new PaymentError(
      "No se pudo determinar la URL de retorno del pago.",
      400,
    );
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new PaymentError("La URL de retorno del pago no es válida.", 400);
  }

  return url.origin;
}

function buildReturnUrl(
  appOrigin: string,
  status: "success" | "pending" | "failure",
): string {
  const url = new URL("/", appOrigin);
  url.searchParams.set("mp_status", status);
  return url.toString();
}

function buildBalanceReturnUrl(
  appOrigin: string,
  status: "success" | "pending" | "failure",
): string {
  const url = new URL("/mis-eventos", appOrigin);
  url.searchParams.set("mp_balance", status);
  return url.toString();
}

function buildCheckoutReturnUrls(
  appOrigin: string,
  returnUrlBuilder: (
    origin: string,
    status: "success" | "pending" | "failure",
  ) => string,
): {
  back_urls: { success: string; pending: string; failure: string };
  auto_return?: "approved";
} {
  const back_urls = {
    success: returnUrlBuilder(appOrigin, "success"),
    pending: returnUrlBuilder(appOrigin, "pending"),
    failure: returnUrlBuilder(appOrigin, "failure"),
  };

  return {
    back_urls,
    ...(new URL(back_urls.success).protocol === "https:" ? { auto_return: "approved" } : {}),
  };
}

function validateReservation(input: CreatePreferenceInput): void {
  const reservation = input?.reservation;

  if (
    !reservation ||
    typeof reservation.clientName !== "string" ||
    !reservation.clientName.trim() ||
    !/^\d{4}-\d{2}-\d{2}$/.test(reservation.eventDate) ||
    Number.isNaN(Date.parse(`${reservation.eventDate}T00:00:00`)) ||
    !Number.isInteger(reservation.guests) ||
    reservation.guests < 50 ||
    reservation.guests > 120 ||
    !Array.isArray(reservation.stationIds) ||
    reservation.stationIds.length === 0 ||
    !Array.isArray(reservation.extraIds) ||
    new Set([...reservation.stationIds, ...reservation.extraIds]).size !==
      reservation.stationIds.length + reservation.extraIds.length ||
    typeof reservation.kitchenNotes !== "string" ||
    !reservation.dietary ||
    typeof reservation.dietary !== "object" ||
    !["deposit", "full"].includes(input.initialPayment)
  ) {
    throw new PaymentError(
      "Los datos de la reserva están incompletos o no son válidos.",
    );
  }
}

export class PaymentsService {
  private static async ensureCheckoutTable(): Promise<void> {
    const db = getDatabase();
    await db.exec(`
      CREATE TABLE IF NOT EXISTS mercado_pago_checkout (
        external_reference TEXT PRIMARY KEY,
        preference_id TEXT,
        reservation_data JSONB NOT NULL,
        expected_amount_cents INTEGER NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        payment_id TEXT UNIQUE,
        event_id TEXT,
        payment_kind VARCHAR(20) NOT NULL DEFAULT 'reservation',
        client_id INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.exec(`
      ALTER TABLE mercado_pago_checkout
        ADD COLUMN IF NOT EXISTS payment_kind VARCHAR(20) NOT NULL DEFAULT 'reservation',
        ADD COLUMN IF NOT EXISTS client_id INTEGER
    `);
    await db.exec(`
      ALTER TABLE pago
        ADD COLUMN IF NOT EXISTS mercado_pago_payment_id TEXT
    `);
    await db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS pago_mercado_pago_payment_id_unique
      ON pago (mercado_pago_payment_id)
    `);
  }

  static async createBalancePreference(
    eventId: string,
    clientId: number,
    appOrigin: string,
  ): Promise<{ initPoint: string; externalReference: string }> {
    if (!/^EV-\d+$/.test(eventId) || !Number.isSafeInteger(clientId) || clientId <= 0) {
      throw new PaymentError("Los datos del evento no son válidos.");
    }

    const db = getDatabase();
    const reservationId = Number(eventId.slice(3));
    const event = await db.queryOne<{
      id_cliente: number;
      fecha_evento: string;
      monto_total: number | string;
      evento_cancelado: number;
      estado_evento: string;
      estado_pago: string;
    }>(
      `SELECT id_cliente, fecha_evento, monto_total, evento_cancelado, estado_evento, estado_pago
       FROM reserva
       WHERE id_reserva = ?`,
      [reservationId],
    );

    if (!event || Number(event.id_cliente) !== clientId) {
      throw new PaymentError("No se encontró el evento para esta cuenta.", 404);
    }
    if (event.evento_cancelado === 1 || event.estado_evento === "Cancelado") {
      throw new PaymentError("No se puede pagar el saldo de un evento cancelado.");
    }
    if (event.estado_pago !== "SALDO_PENDIENTE") {
      throw new PaymentError("Este evento no tiene un saldo pendiente.");
    }

    const payments = await db.query<{ monto: number | string }>(
      `SELECT monto FROM pago WHERE id_reserva = ? AND estado = 'confirmado'`,
      [reservationId],
    );
    const paidAmount = payments.reduce((sum, payment) => sum + (Number(payment.monto) || 0), 0);
    const balanceCents = Math.round(
      Math.max(0, Number(event.monto_total) - paidAmount) * 100,
    );
    if (!Number.isSafeInteger(balanceCents) || balanceCents <= 0) {
      throw new PaymentError("El evento no tiene un saldo pendiente.");
    }

    const origin = normalizeAppOrigin(appOrigin);
    const externalReference = randomUUID();
    await this.ensureCheckoutTable();
    await db.execute(
      `INSERT INTO mercado_pago_checkout
        (external_reference, reservation_data, expected_amount_cents, status, event_id, payment_kind, client_id)
       VALUES (?, ?, ?, 'pending', ?, 'balance', ?)`,
      [
        externalReference,
        JSON.stringify({ eventId }),
        balanceCents,
        eventId,
        clientId,
      ],
    );

    try {
      const preference = await mercadoPagoRequest<{
        id: string;
        init_point?: string;
      }>("/checkout/preferences", {
        method: "POST",
        body: JSON.stringify({
          items: [
            {
              id: externalReference,
              title: `Saldo de evento ${eventId} - ${event.fecha_evento}`,
              quantity: 1,
              unit_price: balanceCents / 100,
              currency_id: "ARS",
            },
          ],
          external_reference: externalReference,
          ...buildCheckoutReturnUrls(origin, buildBalanceReturnUrl),
        }),
      });

      if (!preference.id || !preference.init_point) {
        throw new PaymentError("Mercado Pago no devolvió una URL de pago.", 502);
      }

      await db.execute(
        `UPDATE mercado_pago_checkout
         SET preference_id = ?
         WHERE external_reference = ?`,
        [preference.id, externalReference],
      );

      return { initPoint: preference.init_point, externalReference };
    } catch (error) {
      await db.execute(
        `UPDATE mercado_pago_checkout
         SET status = 'failed'
         WHERE external_reference = ?`,
        [externalReference],
      );
      throw error;
    }
  }

  static async createPreference(
    input: CreatePreferenceInput,
    appOrigin: string,
  ): Promise<{ initPoint: string; externalReference: string }> {
    validateReservation(input);
    const db = getDatabase();
    const tariffs = await db.query<{
      id: string;
      category: string;
      price_per_guest_cents: number | string;
      fixed_cents: number | string | null;
    }>(
      `SELECT id, category, price_per_guest_cents, fixed_cents
       FROM tarifas
       WHERE is_active = 1`,
    );

    const getSelectedPrice = (
      id: string,
      category: "station" | "extra",
    ): number => {
      const tariff = tariffs.find((item) => item.id === id);
      if (tariff?.category !== category) {
        throw new PaymentError(
          `La tarifa "${id}" ya no está disponible. Actualizá la cotización.`,
        );
      }

      return Number(tariff.price_per_guest_cents);
    };
    const selectedTariffs = [
      ...input.reservation.stationIds.map((id) =>
        getSelectedPrice(id, "station"),
      ),
      ...input.reservation.extraIds.map((id) => getSelectedPrice(id, "extra")),
    ];
    const insuranceCents = tariffs
      .filter((tariff) => tariff.category === "insurance")
      .reduce((sum, tariff) => sum + Number(tariff.fixed_cents || 0), 0);
    const expectedTotalCents = selectedTariffs.reduce(
      (sum, price) => sum + price * input.reservation.guests,
      insuranceCents,
    );
    const amountCents =
      input.initialPayment === "full"
        ? expectedTotalCents
        : Math.round((expectedTotalCents * DEPOSIT_PERCENT) / 100);

    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
      throw new PaymentError("El monto de la reserva no es válido.");
    }

    const externalReference = randomUUID();
    const paymentStatus =
      input.initialPayment === "full" ? "SALDADO" : "SALDO_PENDIENTE";
    const reservation = {
      ...input.reservation,
      totalCents: expectedTotalCents,
      insuranceCents,
      depositCents: amountCents,
      paymentStatus,
      status: "Señado / Confirmado",
      cancelled: false,
    };
    const origin = normalizeAppOrigin(appOrigin);

    await this.ensureCheckoutTable();
    await db.execute(
      `INSERT INTO mercado_pago_checkout
        (external_reference, reservation_data, expected_amount_cents, status)
       VALUES (?, ?, ?, 'pending')`,
      [externalReference, JSON.stringify(reservation), amountCents],
    );

    try {
      const preference = await mercadoPagoRequest<{
        id: string;
        init_point?: string;
      }>("/checkout/preferences", {
        method: "POST",
        body: JSON.stringify({
          items: [
            {
              id: externalReference,
              title: `Reserva de evento ${reservation.eventDate}`,
              quantity: 1,
              unit_price: amountCents / 100,
              currency_id: "ARS",
            },
          ],
          external_reference: externalReference,
          ...buildCheckoutReturnUrls(origin, buildReturnUrl),
        }),
      });

      if (!preference.id || !preference.init_point) {
        throw new PaymentError(
          "Mercado Pago no devolvió una URL de pago.",
          502,
        );
      }

      await db.execute(
        `UPDATE mercado_pago_checkout
         SET preference_id = ?
         WHERE external_reference = ?`,
        [preference.id, externalReference],
      );

      return { initPoint: preference.init_point, externalReference };
    } catch (error) {
      await db.execute(
        `UPDATE mercado_pago_checkout
         SET status = 'failed'
         WHERE external_reference = ?`,
        [externalReference],
      );
      throw error;
    }
  }

  static async confirmPayment(
    paymentId: string,
    externalReference: string,
  ): Promise<{ eventId: string }> {
    if (!/^\d+$/.test(paymentId) || !externalReference) {
      throw new PaymentError(
        "La información de retorno del pago no es válida.",
      );
    }

    const db = getDatabase();
    await this.ensureCheckoutTable();
    const checkout = await db.queryOne<{
      preference_id: string | null;
      reservation_data: ReservationInput & Record<string, unknown>;
      expected_amount_cents: number;
      status: string;
      payment_id: string | null;
      event_id: string | null;
      payment_kind: string;
    }>(
      `SELECT preference_id, reservation_data, expected_amount_cents, status, payment_id, event_id, payment_kind
       FROM mercado_pago_checkout
       WHERE external_reference = ?`,
      [externalReference],
    );

    if (!checkout || checkout.payment_kind !== "reservation") {
      throw new PaymentError(
        "No se encontró la reserva asociada al pago.",
        404,
      );
    }
    if (checkout.status === "completed" && checkout.event_id) {
      return { eventId: checkout.event_id };
    }
    if (checkout.status !== "pending") {
      throw new PaymentError(
        "Este pago ya se está procesando o no puede confirmarse.",
        409,
      );
    }

    const payment = await mercadoPagoRequest<MercadoPagoPayment>(
      `/v1/payments/${encodeURIComponent(paymentId)}`,
      { method: "GET" },
    );

    const matchesCheckout =
      payment.status === "approved" &&
      payment.currency_id === "ARS" &&
      payment.external_reference === externalReference &&
      Math.round(payment.transaction_amount * 100) ===
        Number(checkout.expected_amount_cents);

    if (!matchesCheckout) {
      throw new PaymentError(
        "Mercado Pago todavía no confirma el pago de esta reserva.",
        402,
        matchesCheckout,
      );
    }

    const claim = await db.execute(
      `UPDATE mercado_pago_checkout
       SET status = 'processing', payment_id = ?
       WHERE external_reference = ? AND status = 'pending'`,
      [paymentId, externalReference],
    );
    if (claim.changes === 0) {
      const latest = await db.queryOne<{
        status: string;
        event_id: string | null;
      }>(
        `SELECT status, event_id
         FROM mercado_pago_checkout
         WHERE external_reference = ?`,
        [externalReference],
      );
      if (latest?.status === "completed" && latest.event_id) {
        return { eventId: latest.event_id };
      }
      throw new PaymentError(
        "El pago ya se está procesando. Volvé a consultar en unos segundos.",
        409,
      );
    }

    try {
      const event = await EventsService.createEvent(checkout.reservation_data);
      if (!event?.id) {
        throw new Error(
          "No se pudo crear la reserva después del pago aprobado.",
        );
      }
      await db.execute(
        `UPDATE mercado_pago_checkout
         SET status = 'completed', event_id = ?
         WHERE external_reference = ?`,
        [event.id, externalReference],
      );

      return { eventId: event.id };
    } catch (error) {
      await db.execute(
        `UPDATE mercado_pago_checkout
         SET status = 'pending', payment_id = NULL
         WHERE external_reference = ? AND status = 'processing'`,
        [externalReference],
      );
      throw error;
    }
  }

  static async confirmBalancePayment(
      paymentId: string,
      externalReference: string,
      clientId: number,
    ): Promise<{ eventId: string }> {
      if (!/^\d+$/.test(paymentId) || !externalReference) {
        throw new PaymentError("La información de retorno del pago no es válida.");
      }
      if (!Number.isSafeInteger(clientId) || clientId <= 0) {
        throw new PaymentError("No se pudo validar la cuenta cliente.", 401);
      }

      const db = getDatabase();
      await this.ensureCheckoutTable();
      const checkout = await db.queryOne<{
        expected_amount_cents: number | string;
        status: string;
        payment_kind: string;
        client_id: number | null;
        event_id: string | null;
        payment_id: string | null;
      }>(
        `SELECT expected_amount_cents, status, payment_kind, client_id, event_id, payment_id
         FROM mercado_pago_checkout
         WHERE external_reference = ?`,
        [externalReference],
      );

      if (
        !checkout
        || checkout.payment_kind !== "balance"
        || Number(checkout.client_id) !== clientId
        || !checkout.event_id
      ) {
        throw new PaymentError("No se encontró el pago de saldo para esta cuenta.", 404);
      }
      if (checkout.status === "completed") {
        if (checkout.payment_id !== paymentId) {
          throw new PaymentError("El pago no coincide con la confirmación registrada.", 409);
        }
        return { eventId: checkout.event_id };
      }
      if (checkout.status !== "pending") {
        throw new PaymentError(
          "Este pago ya se está procesando o no puede confirmarse.",
          409,
        );
      }

      const payment = await mercadoPagoRequest<MercadoPagoPayment>(
        `/v1/payments/${encodeURIComponent(paymentId)}`,
        { method: "GET" },
      );
      const expectedAmountCents = Number(checkout.expected_amount_cents);
      const matchesCheckout =
        payment.status === "approved"
        && payment.currency_id === "ARS"
        && payment.external_reference === externalReference
        && Math.round(payment.transaction_amount * 100) === expectedAmountCents;
      if (!matchesCheckout) {
        throw new PaymentError(
          "Mercado Pago todavía no confirma el pago de este saldo.",
          402,
        );
      }

      const claim = await db.execute(
        `UPDATE mercado_pago_checkout
         SET status = 'processing', payment_id = ?
         WHERE external_reference = ? AND status = 'pending' AND client_id = ?`,
        [paymentId, externalReference, clientId],
      );
      if (claim.changes === 0) {
        const latest = await db.queryOne<{
          status: string;
          event_id: string | null;
          payment_id: string | null;
        }>(
          `SELECT status, event_id, payment_id
           FROM mercado_pago_checkout
           WHERE external_reference = ?`,
          [externalReference],
        );
        if (
          latest?.status === "completed"
          && latest.event_id
          && latest.payment_id === paymentId
        ) {
          return { eventId: latest.event_id };
        }
        throw new PaymentError(
          "El pago ya se está procesando. Volvé a consultar en unos segundos.",
          409,
        );
      }

      try {
        const reservationId = Number(checkout.event_id.slice(3));
        const event = await db.queryOne<{
          id_cliente: number;
          monto_total: number | string;
          evento_cancelado: number;
          estado_evento: string;
          estado_pago: string;
        }>(
          `SELECT id_cliente, monto_total, evento_cancelado, estado_evento, estado_pago
           FROM reserva
           WHERE id_reserva = ?`,
          [reservationId],
        );
        if (
          !event
          || Number(event.id_cliente) !== clientId
          || event.evento_cancelado === 1
          || event.estado_evento === "Cancelado"
          || event.estado_pago !== "SALDO_PENDIENTE"
        ) {
          throw new PaymentError("El evento ya no admite el pago de saldo.", 409);
        }

        const confirmedPayments = await db.query<{ monto: number | string }>(
          `SELECT monto FROM pago WHERE id_reserva = ? AND estado = 'confirmado'`,
          [reservationId],
        );
        const paidAmount = confirmedPayments.reduce(
          (sum, current) => sum + (Number(current.monto) || 0),
          0,
        );
        const currentBalanceCents = Math.round(
          Math.max(0, Number(event.monto_total) - paidAmount) * 100,
        );
        if (currentBalanceCents !== expectedAmountCents) {
          throw new PaymentError(
            "El saldo del evento cambió desde que se inició el pago. Actualizá tus eventos e intentá nuevamente.",
            409,
          );
        }

        const recordedPayment = await db.queryOne<{ id_reserva: number }>(
          `WITH eligible_reservation AS (
             SELECT r.id_reserva
             FROM reserva AS r
             WHERE r.id_reserva = ?
               AND r.id_cliente = ?
               AND r.evento_cancelado = 0
               AND r.estado_evento <> 'Cancelado'
               AND r.estado_pago = 'SALDO_PENDIENTE'
               AND ROUND(
                 (r.monto_total - COALESCE((
                   SELECT SUM(existing_payment.monto)
                   FROM pago AS existing_payment
                   WHERE existing_payment.id_reserva = r.id_reserva
                     AND existing_payment.estado = 'confirmado'
                 ), 0)) * 100
               ) = ?
             FOR UPDATE
           ),
           inserted_payment AS (
             INSERT INTO pago (
               id_reserva, tipo_pago, monto, pago_online, pago_completo, estado,
               mercado_pago_payment_id
             )
             SELECT id_reserva, 'SALDO', ?, 1, 1, 'confirmado', ?
             FROM eligible_reservation
             ON CONFLICT (mercado_pago_payment_id) DO NOTHING
             RETURNING id_reserva
           ),
           updated_reservation AS (
             UPDATE reserva AS r
             SET estado_pago = 'SALDADO',
                 fecha_actualizacion = CURRENT_TIMESTAMP
             WHERE r.id_reserva IN (SELECT id_reserva FROM inserted_payment)
             RETURNING r.id_reserva
           )
           SELECT id_reserva FROM updated_reservation`,
          [
            reservationId,
            clientId,
            expectedAmountCents,
            expectedAmountCents / 100,
            paymentId,
          ],
        );
        if (!recordedPayment) {
          const previousPayment = await db.queryOne<{
            id_reserva: number;
            monto: number | string;
          }>(
            `SELECT id_reserva, monto
             FROM pago
             WHERE mercado_pago_payment_id = ? AND estado = 'confirmado'`,
            [paymentId],
          );
          const alreadyRecorded =
            previousPayment
            && Number(previousPayment.id_reserva) === reservationId
            && Math.round(Number(previousPayment.monto) * 100) === expectedAmountCents
            && (await db.queryOne<{ estado_pago: string }>(
              `SELECT estado_pago FROM reserva WHERE id_reserva = ?`,
              [reservationId],
            ))?.estado_pago === "SALDADO";
          if (!alreadyRecorded) {
            throw new PaymentError(
              "No se pudo registrar el pago de forma segura. Contactá a soporte con el comprobante de Mercado Pago.",
              409,
            );
          }
        }
        await db.execute(
          `UPDATE mercado_pago_checkout
           SET status = 'completed'
           WHERE external_reference = ? AND status = 'processing'`,
          [externalReference],
        );

        return { eventId: checkout.event_id };
      } catch (error) {
        await db.execute(
          `UPDATE mercado_pago_checkout
           SET status = 'pending', payment_id = NULL
           WHERE external_reference = ? AND status = 'processing'`,
          [externalReference],
        );
        throw error;
      }
  }
}
