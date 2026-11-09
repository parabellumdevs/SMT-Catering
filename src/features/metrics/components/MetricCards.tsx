import {
  CalendarDays,
  CircleDollarSign,
  PiggyBank,
  Receipt,
  TrendingUp,
  Users,
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { MetricsData } from '@/features/metrics/hooks/useMetrics'

interface MetricCardsProps {
  metrics: MetricsData
}

export function MetricCards({ metrics }: MetricCardsProps) {
  return (
    <div className="space-y-4">
      {/* 4 Indicadores Financieros y Operativos Clave */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Facturación Total */}
        <Card className="border-border/60 bg-white shadow-xs">
          <CardHeader className="flex-row items-center justify-between pb-1">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Facturación Proyectada
            </CardTitle>
            <div className="rounded-lg bg-brand/10 p-2 text-brand">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold tracking-tight text-foreground tnum">
              {formatCurrency(metrics.billingTotalCents)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Sobre {metrics.activeEventsCount} {metrics.activeEventsCount === 1 ? 'evento activo' : 'eventos activos'}
            </p>
          </CardContent>
        </Card>

        {/* Ticket Promedio por Evento */}
        <Card className="border-border/60 bg-white shadow-xs">
          <CardHeader className="flex-row items-center justify-between pb-1">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ticket Promedio
            </CardTitle>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-700">
              <Receipt className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold tracking-tight text-foreground tnum">
              {formatCurrency(metrics.averageTicketCents)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Promedio por reserva confirmada
            </p>
          </CardContent>
        </Card>

        {/* Señas Cobradas */}
        <Card className="border-border/60 bg-white shadow-xs">
          <CardHeader className="flex-row items-center justify-between pb-1">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Señas & Anticipos
            </CardTitle>
            <div className="rounded-lg bg-brand/10 p-2 text-brand">
              <PiggyBank className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold tracking-tight text-foreground tnum">
              {formatCurrency(metrics.depositsCollectedCents)}
            </div>
            <p className="mt-1 text-xs text-emerald-600 font-medium">
              {metrics.collectionRatePercentage}% del volumen total recaudado
            </p>
          </CardContent>
        </Card>

        {/* Saldos por Cobrar */}
        <Card className="border-border/60 bg-white shadow-xs">
          <CardHeader className="flex-row items-center justify-between pb-1">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Saldos por Cobrar
            </CardTitle>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-700">
              <CircleDollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold tracking-tight text-foreground tnum">
              {formatCurrency(metrics.balancesPendingCents)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {metrics.pendingBalanceCount} {metrics.pendingBalanceCount === 1 ? 'evento pendiente' : 'eventos pendientes'} de cancelación
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Métricas secundarias: Comensales y Volumen mensual */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="border-border/60 bg-white/70 shadow-xs">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="rounded-full bg-brand/10 p-3 text-brand">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Total de Comensales
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground tnum">
                  {metrics.totalGuests}
                </span>
                <span className="text-xs text-muted-foreground">
                  (promedio de {metrics.averageGuestsPerEvent} pax por evento)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-white/70 shadow-xs">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="rounded-full bg-brand/10 p-3 text-brand">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Eventos del Mes en Curso
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground tnum">
                  {metrics.eventsThisMonth}
                </span>
                <span className="text-xs text-muted-foreground">
                  de {metrics.totalEvents} registros totales ({metrics.cancelledEventsCount} cancelados)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
