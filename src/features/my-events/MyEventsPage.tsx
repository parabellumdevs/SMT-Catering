import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Plus,
  RefreshCw,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react'
import { isBefore, parseISO, startOfDay } from 'date-fns'

import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import type { EventRecord } from '@/types/domain'

import { CancelEventModal } from './components/CancelEventModal'
import { ClientRescheduleModal } from './components/ClientRescheduleModal'
import { EventDetailModal } from './components/EventDetailModal'
import { MyEventCard } from './components/MyEventCard'
import { PayBalanceClientModal } from './components/PayBalanceClientModal'

type FilterTab = 'todos' | 'proximos' | 'pasados'

/**
 * Mis Eventos — Vista del Cliente B2B.
 * Gestión integral de reservas propias, visualización técnica, estado de cobro,
 * comprobantes oficiales en PDF, pago de saldo, reprogramación y cancelación.
 */
export function MyEventsPage() {
  const [events, setEvents] = useState<EventRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<FilterTab>('todos')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Modales
  const [detailEvent, setDetailEvent] = useState<EventRecord | null>(null)
  const [payEvent, setPayEvent] = useState<EventRecord | null>(null)
  const [rescheduleEvent, setRescheduleEvent] = useState<EventRecord | null>(null)
  const [cancelEvent, setCancelEvent] = useState<EventRecord | null>(null)

  const fetchMyEvents = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.get<{ events: EventRecord[] }>('/api/events/my-events')
      if (data && Array.isArray(data.events)) {
        setEvents(data.events)
      } else {
        setEvents([])
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar tus eventos.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMyEvents()
  }, [fetchMyEvents])

  // Filtrado de eventos según la pestaña activa
  const [today] = useState(() => startOfDay(new Date()))

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (activeTab === 'todos') return true

      const isCancelled = e.cancelled || e.status === 'Cancelado'
      const isCompleted = e.status === 'Completado'
      let isPast = false
      try {
        isPast = isBefore(parseISO(e.eventDate), today)
      } catch {
        isPast = false
      }

      if (activeTab === 'proximos') {
        return !isCancelled && !isCompleted && !isPast
      }

      if (activeTab === 'pasados') {
        return isCancelled || isCompleted || isPast
      }

      return true
    })
  }, [events, activeTab, today])

  // Contadores de métricas superiores
  const stats = useMemo(() => {
    const total = events.length
    let proximos = 0
    let saldados = 0
    let saldoPendiente = 0

    events.forEach((e) => {
      const isCancelled = e.cancelled || e.status === 'Cancelado'
      const isCompleted = e.status === 'Completado'
      let isPast = false
      try {
        isPast = isBefore(parseISO(e.eventDate), today)
      } catch {
        isPast = false
      }

      if (!isCancelled && !isCompleted && !isPast) {
        proximos += 1
      }

      if (e.paymentStatus === 'SALDADO') {
        saldados += 1
      } else if (!isCancelled && (e.totalCents - e.depositCents) > 0) {
        saldoPendiente += 1
      }
    })

    return { total, proximos, saldados, saldoPendiente }
  }, [events, today])

  // Handlers para las acciones exitosas
  const handlePaymentSuccess = (eventId: string) => {
    setSuccessMessage(`¡El pago del saldo restante para el evento ${eventId} se registró con éxito! El estado se actualizó a SALDADO.`)
    fetchMyEvents()
    setTimeout(() => setSuccessMessage(null), 6000)
  }

  const handleRescheduleSuccess = (eventId: string, newDate: string, newTime: string) => {
    setSuccessMessage(`La reserva ${eventId} ha sido reprogramada exitosamente para el ${newDate} a las ${newTime} hs.`)
    fetchMyEvents()
    setTimeout(() => setSuccessMessage(null), 6000)
  }

  const handleCancelSuccess = (eventId: string, message: string) => {
    setSuccessMessage(`Reserva ${eventId}: ${message}`)
    fetchMyEvents()
    setTimeout(() => setSuccessMessage(null), 8000)
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Encabezado Principal */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white shadow-xs">
              <CalendarCheck className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Mis Eventos</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Consulta el estado de tus reservas, fechas contratadas, comprobantes de pago y acciones operativas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchMyEvents}
            disabled={isLoading}
            className="rounded-xl gap-2 border-border/60 hover:bg-canvas-soft"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button asChild size="sm" className="rounded-xl gap-2 bg-brand hover:bg-brand-dark text-white shadow-xs">
            <Link to="/">
              <Plus className="h-4 w-4" />
              Cotizar Nuevo Evento
            </Link>
          </Button>
        </div>
      </header>

      {/* Banner de Feedback Positivo */}
      {successMessage && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm shadow-xs animate-in fade-in duration-300">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">{successMessage}</div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Tarjetas de Resumen / KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-border/60 bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Reservas</span>
            <CalendarDays className="h-4 w-4 text-brand" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2 tnum">{stats.total}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Historial acumulado</p>
        </div>

        <div className="p-4 rounded-2xl border border-border/60 bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Próximos Eventos</span>
            <Clock className="h-4 w-4 text-brand" />
          </div>
          <p className="text-2xl font-bold text-brand mt-2 tnum">{stats.proximos}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Fechas activas por prestar</p>
        </div>

        <div className="p-4 rounded-2xl border border-border/60 bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">100% Saldados</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2 tnum">{stats.saldados}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Sin saldo pendiente</p>
        </div>

        <div className="p-4 rounded-2xl border border-border/60 bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Saldo Pendiente</span>
            <CreditCard className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2 tnum">{stats.saldoPendiente}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Vence 24hs antes del evento</p>
        </div>
      </div>

      {/* Pestañas de Filtrado */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('todos')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'todos'
              ? 'bg-brand text-white shadow-xs'
              : 'text-muted-foreground hover:bg-canvas-soft hover:text-foreground'
          }`}
        >
          Todos ({events.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('proximos')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'proximos'
              ? 'bg-brand text-white shadow-xs'
              : 'text-muted-foreground hover:bg-canvas-soft hover:text-foreground'
          }`}
        >
          Próximos ({stats.proximos})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('pasados')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'pasados'
              ? 'bg-brand text-white shadow-xs'
              : 'text-muted-foreground hover:bg-canvas-soft hover:text-foreground'
          }`}
        >
          Finalizados / Cancelados ({events.length - stats.proximos})
        </button>
      </div>

      {/* Estado de Carga */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-56 rounded-2xl border border-border/40 bg-card/50 animate-pulse p-6" />
          ))}
        </div>
      )}

      {/* Estado de Error */}
      {!isLoading && error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
          <h3 className="text-sm font-semibold text-red-800">No se pudieron cargar tus eventos</h3>
          <p className="text-xs text-red-600 max-w-md mx-auto">{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchMyEvents} className="rounded-xl border-red-200">
            Reintentar
          </Button>
        </div>
      )}

      {/* Estado Vacío */}
      {!isLoading && !error && filteredEvents.length === 0 && (
        <div className="rounded-3xl border border-dashed border-border/60 p-12 text-center bg-card/40 space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <UtensilsCrossed className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground tracking-tight">
              {activeTab === 'todos'
                ? 'Aún no tienes eventos reservados'
                : activeTab === 'proximos'
                  ? 'No tienes eventos próximos programados'
                  : 'No tienes eventos finalizados o cancelados'}
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Utiliza nuestro cotizador inteligente en tiempo real para personalizar las estaciones gastronómicas de tu próximo evento corporativo.
            </p>
          </div>
          <Button asChild className="rounded-xl gap-2 bg-brand hover:bg-brand-dark text-white shadow-xs">
            <Link to="/">
              <Sparkles className="h-4 w-4" />
              Cotizar Mi Primer Evento
            </Link>
          </Button>
        </div>
      )}

      {/* Grilla de Eventos */}
      {!isLoading && !error && filteredEvents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredEvents.map((event) => (
            <MyEventCard
              key={event.id}
              event={event}
              onOpenDetail={(ev) => setDetailEvent(ev)}
              onOpenPayBalance={(ev) => setPayEvent(ev)}
              onOpenReschedule={(ev) => setRescheduleEvent(ev)}
              onOpenCancel={(ev) => setCancelEvent(ev)}
            />
          ))}
        </div>
      )}

      {/* Modales de Gestión */}
      <EventDetailModal
        key={detailEvent?.id ?? 'detail-closed'}
        event={detailEvent}
        open={Boolean(detailEvent)}
        onOpenChange={(open) => !open && setDetailEvent(null)}
      />

      <PayBalanceClientModal
        key={payEvent?.id ?? 'pay-closed'}
        event={payEvent}
        open={Boolean(payEvent)}
        onOpenChange={(open) => !open && setPayEvent(null)}
        onPaymentSuccess={handlePaymentSuccess}
      />

      <ClientRescheduleModal
        key={rescheduleEvent?.id ?? 'reschedule-closed'}
        event={rescheduleEvent}
        allEvents={events}
        open={Boolean(rescheduleEvent)}
        onOpenChange={(open) => !open && setRescheduleEvent(null)}
        onRescheduleSuccess={handleRescheduleSuccess}
      />

      <CancelEventModal
        key={cancelEvent?.id ?? 'cancel-closed'}
        event={cancelEvent}
        open={Boolean(cancelEvent)}
        onOpenChange={(open) => !open && setCancelEvent(null)}
        onCancelSuccess={handleCancelSuccess}
      />
    </div>
  )
}
