import { getDatabase } from '../../db/client.ts'

export interface ComandaTicket {
  ticketNumber: string
  eventId: string
  clientName: string
  eventDate: string
  startTime: string
  endTime: string
  durationHours: number
  locationAddress: string
  guests: number
  isConcurrent: boolean
  stations: Array<{ id: string; name: string; dishes?: string[] }>
  dietary: {
    celiacos: number
    vegetarianos: number
    veganos: number
    alergias: string
    sinSal?: number
    otros?: string
  }
  kitchenNotes?: string
  status: string
}

export class ProductionService {
  static async getComanda(eventId: string): Promise<ComandaTicket | null> {
    const dbClient = getDatabase()
    const idReserva = Number(eventId.replace('EV-', ''))

    const row = await dbClient.queryOne(
      `SELECT
        r.*,
        c.razon_social as cliente_empresa,
        c.nombre_completo as contacto
      FROM reserva r
      JOIN cliente c ON c.id_cliente = r.id_cliente
      WHERE r.id_reserva = ?`,
      [idReserva],
    )

    if (!row) return null

    // Verificar si es concurrente (más de 1 evento en la misma fecha no cancelado)
    const sameDateCount = await dbClient.queryOne(
      "SELECT count(*) as c FROM reserva WHERE fecha_evento = ? AND evento_cancelado = 0",
      [row.fecha_evento],
    )
    const isConcurrent = Number(sameDateCount?.c || 0) > 1

    // Estaciones contratadas
    const stationRows = await dbClient.query(
      `SELECT e.codigo as id, e.nombre as name
       FROM detalle_reserva_estacion dre
       JOIN estacion e ON e.id_estacion = dre.id_estacion
       WHERE dre.id_reserva = ?`,
      [idReserva],
    )

    // Restricciones alimentarias
    const dietaryRows = await dbClient.query(
      `SELECT tipo_restriccion, cantidad_personas, observaciones
       FROM restriccion_alimentaria
       WHERE id_reserva = ?`,
      [idReserva],
    )

    let celiacos = 0
    let vegetarianos = 0
    let veganos = 0
    let sinSal = 0
    const alergias: string[] = []
    const otros: string[] = []

    for (const d of dietaryRows) {
      const tipo = (d.tipo_restriccion || '').toLowerCase()
      if (tipo.includes('celia')) celiacos += Number(d.cantidad_personas) || 0
      else if (tipo.includes('vege')) vegetarianos += Number(d.cantidad_personas) || 0
      else if (tipo.includes('vega')) veganos += Number(d.cantidad_personas) || 0
      else if (tipo.includes('sal')) sinSal += Number(d.cantidad_personas) || 0
      else if (tipo.includes('alerg')) {
        if (d.observaciones) alergias.push(d.observaciones)
      } else {
        if (d.observaciones) otros.push(d.observaciones)
      }
    }

    return {
      ticketNumber: `CMD-${row.id_reserva}`,
      eventId: `EV-${row.id_reserva}`,
      clientName: row.cliente_empresa || row.contacto,
      eventDate: row.fecha_evento,
      startTime: row.hora_inicio || '19:30',
      endTime: row.hora_fin || '22:30',
      durationHours: Number(row.duracion_horas) || 3.0,
      locationAddress: row.direccion_evento || 'CABA',
      guests: Number(row.cantidad_invitados) || 50,
      isConcurrent,
      stations: stationRows,
      dietary: {
        celiacos,
        vegetarianos,
        veganos,
        alergias: alergias.join(', '),
        sinSal,
        otros: otros.join(', '),
      },
      kitchenNotes: row.notas_cocina || '',
      status: row.estado_evento || 'Aprobado para Producción',
    }
  }
}
