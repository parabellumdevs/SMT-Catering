import jsPDF from 'jspdf'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

import { obtenerEstacionPorId, type EstacionId } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import type { EventRecord } from '@/types/domain'

/**
 * Genera y descarga el comprobante comercial oficial en PDF para el cliente B2B.
 */
export function generateReceiptPdf(event: EventRecord): void {
  const doc = new jsPDF()

  // 1. Cabecera institucional Borravino
  doc.setFillColor(61, 16, 26) // #3D101A
  doc.rect(0, 0, 210, 36, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('SMT CATERING', 14, 16)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('COMPROBANTE OFICIAL DE RESERVA Y ESTADO DE CUENTA', 14, 23)
  doc.setFontSize(8)
  doc.text('Servicios Gastronómicos Corporativos B2B — CUIT: 30-71234567-9 — Monserrat, CABA', 14, 29)

  // 2. Metadatos de emisión
  const now = new Date()
  const fechaEmision = format(now, "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es })
  doc.setTextColor(100, 100, 100)
  doc.setFontSize(9)
  doc.text(`Fecha de emisión: ${fechaEmision}`, 196, 44, { align: 'right' })

  // 3. Bloque Cliente y Reserva
  doc.setDrawColor(230, 230, 230)
  doc.setFillColor(249, 250, 251)
  doc.roundedRect(14, 48, 182, 38, 2, 2, 'FD')

  doc.setTextColor(61, 16, 26)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(`RESERVA: ${event.id}`, 20, 56)

  doc.setTextColor(40, 40, 40)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Cliente / Empresa: ${event.clientName}`, 20, 64)
  doc.text(`Fecha del Evento: ${event.eventDate}`, 20, 72)
  doc.text(`Horario: ${event.startTime || '19:30'} a ${event.endTime || '22:30'} hs (${event.durationHours || 3} hs)`, 20, 80)

  doc.text(`Invitados: ${event.guests} comensales`, 110, 64)
  doc.text(`Ubicación: ${event.locationAddress || 'CABA'}`, 110, 72)
  doc.text(`Distancia: ${event.distanceKm ? `${event.distanceKm} km` : 'Dentro de radio'}`, 110, 80)

  // 4. Estaciones Gastronómicas Contratadas
  let currentY = 96
  doc.setTextColor(61, 16, 26)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('ESTACIONES / ISLAS GASTRONÓMICAS CONTRATADAS', 14, currentY)

  currentY += 6
  doc.setDrawColor(200, 200, 200)
  doc.line(14, currentY, 196, currentY)
  currentY += 6

  doc.setTextColor(40, 40, 40)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')

  if (Array.isArray(event.stationIds) && event.stationIds.length > 0) {
    event.stationIds.forEach((sId) => {
      const station = obtenerEstacionPorId(sId as EstacionId)
      doc.text(`• ${station.nombre} — ${station.descripcion || 'Servicio completo por comensal'}`, 18, currentY)
      currentY += 6
    })
  } else {
    doc.text('• Estaciones seleccionadas según cotización base', 18, currentY)
    currentY += 6
  }

  // 5. Restricciones Alimentarias
  currentY += 4
  doc.setTextColor(61, 16, 26)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('REQUERIMIENTOS Y RESTRICCIONES ALIMENTARIAS', 14, currentY)

  currentY += 6
  doc.line(14, currentY, 196, currentY)
  currentY += 6

  doc.setTextColor(40, 40, 40)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')

  const dietaryItems: string[] = []
  if (event.dietary?.celiacos) dietaryItems.push(`Celíacos: ${event.dietary.celiacos}`)
  if (event.dietary?.vegetarianos) dietaryItems.push(`Vegetarianos: ${event.dietary.vegetarianos}`)
  if (event.dietary?.veganos) dietaryItems.push(`Veganos: ${event.dietary.veganos}`)
  if (event.dietary?.alergias) dietaryItems.push(`Alergias / Otros: ${event.dietary.alergias}`)

  if (dietaryItems.length > 0) {
    doc.text(dietaryItems.join('  |  '), 18, currentY)
  } else {
    doc.text('Sin restricciones especiales informadas.', 18, currentY)
  }
  currentY += 10

  // 6. Resumen Financiero y Liquidación
  doc.setTextColor(61, 16, 26)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('ESTADO DE CUENTA Y LIQUIDACIÓN', 14, currentY)

  currentY += 6
  doc.line(14, currentY, 196, currentY)
  currentY += 6

  const outstandingBalanceCents = Math.max(0, event.totalCents - event.depositCents)
  const isSaldado = event.paymentStatus === 'SALDADO' || outstandingBalanceCents === 0

  // Caja de tabla financiera
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(14, currentY, 182, 42, 2, 2, 'FD')

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(70, 70, 70)

  doc.text('Presupuesto Total del Evento:', 20, currentY + 9)
  doc.text(formatCurrency(event.totalCents), 180, currentY + 9, { align: 'right' })

  doc.text('Seguro Contra Todo Riesgo (incluido):', 20, currentY + 17)
  doc.text(formatCurrency(event.insuranceCents || 8000000), 180, currentY + 17, { align: 'right' })

  doc.text('Monto Abonado a la Fecha:', 20, currentY + 25)
  doc.text(formatCurrency(event.depositCents), 180, currentY + 25, { align: 'right' })

  doc.setDrawColor(210, 210, 210)
  doc.line(20, currentY + 29, 180, currentY + 29)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(isSaldado ? 16 : 180, isSaldado ? 120 : 40, isSaldado ? 60 : 40)
  doc.text('Saldo Pendiente de Pago:', 20, currentY + 36)
  doc.text(formatCurrency(outstandingBalanceCents), 180, currentY + 36, { align: 'right' })

  currentY += 50

  // 7. Estado del Pago (Insignia)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  if (isSaldado) {
    doc.setFillColor(236, 253, 245)
    doc.setDrawColor(16, 185, 129)
    doc.roundedRect(14, currentY, 182, 12, 2, 2, 'FD')
    doc.setTextColor(4, 120, 87)
    doc.text('ESTADO: SALDADO — PAGO 100% COMPLETADO', 20, currentY + 8)
  } else {
    doc.setFillColor(254, 243, 199)
    doc.setDrawColor(245, 158, 11)
    doc.roundedRect(14, currentY, 182, 12, 2, 2, 'FD')
    doc.setTextColor(180, 83, 9)
    doc.text('ESTADO: SEÑA 50% ABONADA — SALDO PENDIENTE (Vence 24hs antes del evento)', 20, currentY + 8)
  }

  currentY += 20

  // 8. Términos y Políticas Oficiales
  doc.setTextColor(110, 110, 110)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(
    'TÉRMINOS Y CONDICIONES GENERALES:\n' +
    '1. La seña abonada congela la fecha y las tarifas del servicio pactado.\n' +
    '2. Cancelación con >= 7 días de antelación: reintegro del 100% de la seña.\n' +
    '3. Cancelación con < 7 días de antelación: la seña no es reembolsable debido a costos de producción comprometidos.\n' +
    '4. El saldo restante (50%) debe cancelarse hasta 24 horas antes del horario fijado de inicio del evento.',
    14,
    currentY,
  )

  // 9. Pie de página
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text('SMT Catering — Sistema Integral de Gestión de Eventos Corporativos', 14, 285)
  doc.text(`Página 1 de 1`, 196, 285, { align: 'right' })

  // Descarga
  const safeClientName = (event.clientName || 'cliente').replace(/[^a-zA-Z0-9_-]/g, '_')
  doc.save(`comprobante-${event.id}-${safeClientName}.pdf`)
}
