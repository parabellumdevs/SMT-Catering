import jsPDF from "jspdf"
import { formatEventRestrictions } from "../utils/formatEventTestrictions"
import type { EventRecord } from "@/types/domain"
import { stationById } from "@/lib/constants"

/** Genera y descarga el PDF técnico individual para la cocina */
export function handleDownloadPdf(event: EventRecord) {
  const doc = new jsPDF()

  // Cabecera institucional Borravino
  doc.setFillColor(61, 16, 26)
  doc.rect(0, 0, 210, 30, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(15)
  doc.text('SMT CATERING — COMANDA TÉCNICA DE PRODUCCIÓN', 14, 18)

  // Datos principales
  doc.setTextColor(40, 40, 40)
  doc.setFontSize(12)
  doc.text(`ID de Evento: ${event.id}`, 14, 45)
  doc.text(`Empresa / Cliente: ${event.clientName}`, 14, 53)
  doc.text(`Fecha del servicio: ${event.eventDate}`, 14, 61)
  doc.text(`Horario: ${(event.startTime)} hs`, 14, 69)
  doc.text(`Total invitados: ${event.guests} comensales`, 14, 77)

  doc.setDrawColor(200, 200, 200)
  doc.line(14, 83, 196, 83)

  // Ubicación / Dirección de entrega (💡 Agregado aquí)
  doc.setFontSize(13)
  doc.text('Ubicación de Entrega:', 14, 93)
  doc.setFontSize(11)
  doc.text(event.locationAddress || 'Av. Corrientes 1234, CABA', 20, 101)

  // Estaciones / Islas contratadas
  doc.setFontSize(13)
  doc.text('Estaciones / Islas Contratadas:', 14, 115)
  doc.setFontSize(11)
  let y = 123
  event.stationIds.forEach((id) => {
    doc.text(`• ${stationById(id).name}`, 20, y)
    y += 7
  })

  // Restricciones
  y += 5
  doc.setFontSize(13)
  doc.text('Dietas, Alérgenos y Observaciones:', 14, y)
  doc.setFontSize(11)
  y += 8
  const restriccionStr = formatEventRestrictions(event)
  doc.text(restriccionStr, 20, y, { maxWidth: 170 })

  // Pie de página
  doc.setFontSize(9)
  doc.setTextColor(120, 120, 120)
  doc.text('Documento técnico interno para planta centralizada.', 14, 285)

  doc.save(`comanda-${event.id}-${event.clientName.replace(/\s+/g, '_')}.pdf`)
}