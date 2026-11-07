import { Link } from 'react-router-dom'
import { Calendar } from 'lucide-react'
import { useState } from 'react'

import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { PaymentStatusBadge } from '@/features/dashboard/components/StatusBadges'
import { stationById, type EstacionId } from '@/lib/constants'
import type { EventRecord } from '@/types/domain'

const fmtDate = (iso: string): string =>
  new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(`${iso}T00:00:00`),
  )

function formatShortTime(timeStr?: string): string {
  if (!timeStr) return '13:00'
  return timeStr.slice(0, 5)
}

export function EventTable({ events }: { events: EventRecord[] }) {
  const sorted = [...events].sort((a, b) => a.eventDate.localeCompare(b.eventDate))
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  return (
    <div className="hidden md:block rounded-2xl border border-gray-200/80 bg-white overflow-hidden shadow-sm">
      <Table>
        <THead className="bg-gray-50/60 border-b border-gray-100">
          <TR>
            <TH className="text-[11px] font-bold uppercase tracking-wider text-gray-400 py-4">Fecha & Hora</TH>
            <TH className="text-[11px] font-bold uppercase tracking-wider text-gray-400 py-4">Empresa / Cliente</TH>
            <TH className="text-[11px] font-bold uppercase tracking-wider text-gray-400 py-4">Invitados</TH>
            <TH className="text-[11px] font-bold uppercase tracking-wider text-gray-400 py-4">Islas Seleccionadas</TH>
            <TH className="text-[11px] font-bold uppercase tracking-wider text-gray-400 py-4">Monto & Estado</TH>
            <TH className="text-[11px] font-bold uppercase tracking-wider text-gray-400 py-4 text-right">Acciones</TH>
          </TR>
        </THead>
        <TBody>
          {sorted.map((e: any) => {
            const stations = e.stationIds ? e.stationIds.map((id: EstacionId) => stationById(id).name) : ['Entrada', 'Parrilla', 'Dulce']
            const isOpen = openMenuId === e.id

            return (
              <TR key={e.id} className="hover:bg-gray-50/40 transition-colors border-b border-gray-100/60 last:border-0 relative">
                {/* Fecha & Hora */}
                <TD className="whitespace-nowrap py-4 align-middle">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-gray-100/80 text-brand">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900 tnum block">{fmtDate(e.eventDate)}</span>
                      <span className="text-xs text-gray-500 tnum">{formatShortTime(e.eventTime)} hs</span>
                    </div>
                  </div>
                </TD>

                {/* Empresa / Cliente */}
                <TD className="py-4 align-middle">
                  <div>
                    <Link 
                      to={`/comandas/${e.id}`} 
                      className="font-semibold text-gray-900 hover:text-brand hover:underline block"
                    >
                      {e.clientName}
                    </Link>
                    <span className="text-xs text-gray-500">{e.contactName || 'Mariana Vidal'}</span>
                  </div>
                </TD>

                {/* Invitados */}
                <TD className="py-4 align-middle">
                  <span className="font-semibold text-gray-800 tnum">{e.guests} pax</span>
                </TD>

                {/* Islas Seleccionadas */}
                <TD className="py-4 align-middle">
                  <div className="flex flex-wrap gap-1.5">
                    {stations.map((stationName: string) => (
                      <span 
                        key={stationName} 
                        className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200/80"
                      >
                        {stationName}
                      </span>
                    ))}
                  </div>
                </TD>

                {/* Monto & Estado */}
                <TD className="py-4 align-middle">
                  <div className="space-y-1">
                    <span className="font-semibold text-gray-900 tnum block">{formatCurrency(e.totalCents)}</span>
                    <div className="flex items-center gap-1.5">
                      <PaymentStatusBadge status={e.paymentStatus} />
                    </div>
                    {e.paymentStatus === 'SEÑA_PENDIENTE' && (
                      <span className="text-[11px] text-gray-500 block tnum">
                        Saldo: {formatCurrency(e.totalCents / 2)}
                      </span>
                    )}
                  </div>
                </TD>

                {/* Acciones con Menú Desplegable */}
                <TD className="text-right py-4 align-middle relative">
                  <div className="inline-block text-left">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="rounded-lg"
                      onClick={() => setOpenMenuId(isOpen ? null : e.id)}
                    >
                      Acciones
                    </Button>

                    {isOpen && (
                      <div className="absolute right-0 mt-2 w-52 rounded-xl bg-white shadow-xl border border-gray-100 py-1.5 z-50 text-left">
                        <Link
                          to={`/comandas/${e.id}`}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                          onClick={() => setOpenMenuId(null)}
                        >
                          <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                          Ver Detalle
                        </Link>
                        <button
                          type="button"
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors font-medium text-left"
                          onClick={() => {
                            setOpenMenuId(null)
                            // Lógica de reprogramar fecha
                          }}
                        >
                          <span className="h-2 w-2 rounded-full bg-emerald-600 shrink-0" />
                          Reprogramar Fecha
                        </button>
                        <button
                          type="button"
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors font-medium text-left border-t border-gray-100 mt-1 pt-2"
                          onClick={() => {
                            setOpenMenuId(null)
                            // Lógica de cancelar evento
                          }}
                        >
                          <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                          Cancelar Evento
                        </button>
                      </div>
                    )}
                  </div>
                </TD>
              </TR>
            )
          })}
        </TBody>
      </Table>
    </div>
  )
}

/** Móvil (<768px): tarjetas adaptadas */
export function EventCards({ events }: { events: EventRecord[] }) {
  const sorted = [...events].sort((a, b) => a.eventDate.localeCompare(b.eventDate))
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  return (
    <div className="space-y-4 md:hidden">
      {sorted.map((e: any) => {
        const stations = e.stationIds ? e.stationIds.map((id: EstacionId) => stationById(id).name) : ['Entrada', 'Parrilla', 'Dulce']
        const isOpen = openMenuId === e.id

        return (
          <div
            key={e.id}
            className="rounded-xl border border-gray-200 bg-white border-t-4 border-t-brand p-4 shadow-xs space-y-3 relative"
          >
            <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-2.5">
              <div>
                <span className="text-[10px] font-mono font-bold text-brand bg-brand/10 px-2 py-0.5 rounded mb-1 inline-block">
                  {e.id}
                </span>
                <Link to={`/comandas/${e.id}`} className="block">
                  <h4 className="font-semibold text-gray-900 hover:text-brand hover:underline">{e.clientName}</h4>
                </Link>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-gray-800 tnum block">{fmtDate(e.eventDate)}</span>
                <span className="text-xs text-gray-500 tnum">{formatShortTime(e.eventTime)} hs</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 font-medium">{e.guests} comensales</span>
              <span className="font-semibold text-gray-900 tnum">{formatCurrency(e.totalCents)}</span>
            </div>

            <div className="flex flex-wrap gap-1.5 py-1">
              {stations.map((s: string) => (
                <span key={s} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-gray-100 text-gray-700 border border-gray-200">
                  {s}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <PaymentStatusBadge status={e.paymentStatus} />
              
              <div className="relative">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="rounded-lg"
                  onClick={() => setOpenMenuId(isOpen ? null : e.id)}
                >
                  Acciones
                </Button>

                {isOpen && (
                  <div className="absolute right-0 bottom-full mb-2 w-52 rounded-xl bg-white shadow-xl border border-gray-100 py-1.5 z-50 text-left">
                    <Link
                      to={`/comandas/${e.id}`}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                      onClick={() => setOpenMenuId(null)}
                    >
                      <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                      Ver Detalle
                    </Link>
                    <button
                      type="button"
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors font-medium text-left"
                      onClick={() => setOpenMenuId(null)}
                    >
                      <span className="h-2 w-2 rounded-full bg-emerald-600 shrink-0" />
                      Reprogramar Fecha
                    </button>
                    <button
                      type="button"
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors font-medium text-left border-t border-gray-100 mt-1 pt-2"
                      onClick={() => setOpenMenuId(null)}
                    >
                      <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                      Cancelar Evento
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}