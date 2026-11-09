import { Calendar, Sparkles } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DayDistribution } from '@/features/metrics/hooks/useMetrics'

interface DayDistributionCardProps {
  distribution: DayDistribution[]
  mostPopularDay: DayDistribution | null
  weekendPercentage: number
}

export function DayDistributionCard({
  distribution,
  mostPopularDay,
  weekendPercentage,
}: DayDistributionCardProps) {
  const focusDays = [
    distribution.find((d) => d.dayIndex === 5), // Viernes
    distribution.find((d) => d.dayIndex === 6), // Sábado
    distribution.find((d) => d.dayIndex === 0), // Domingo
  ].filter(Boolean) as DayDistribution[]

  const weekdayEvents = distribution
    .filter((d) => d.dayIndex >= 1 && d.dayIndex <= 4)
    .reduce((sum, d) => sum + d.count, 0)

  const totalAllEvents = distribution.reduce((sum, d) => sum + d.count, 0)
  const weekdayPercentage =
    totalAllEvents > 0 ? Math.round((weekdayEvents / totalAllEvents) * 100) : 0

  return (
    <Card className="border-border/60 bg-white shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-brand" />
            <CardTitle className="text-base font-semibold text-foreground">
              Día Más Solicitado
            </CardTitle>
          </div>
          <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
            Fin de semana: {weekendPercentage}%
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Comparativa de demanda de servicios: Viernes vs. Sábado vs. Domingo.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {mostPopularDay && mostPopularDay.count > 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-brand/20 bg-brand/5 p-3.5">
            <div className="rounded-full bg-brand p-2 text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-brand">
                  Día Pico de Reservas
                </span>
                <span className="text-xs font-bold text-brand">
                  {mostPopularDay.percentage}% del total
                </span>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {mostPopularDay.dayName} — {mostPopularDay.count} {mostPopularDay.count === 1 ? 'evento contratado' : 'eventos contratados'}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border/80 p-3 text-center text-xs text-muted-foreground">
            Aún no hay suficientes eventos para calcular el día pico.
          </div>
        )}

        <div className="space-y-3 pt-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Distribución por Día
          </p>

          {focusDays.map((d) => {
            const isTop = mostPopularDay?.dayIndex === d.dayIndex && d.count > 0
            return (
              <div key={d.dayIndex} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-semibold ${
                        isTop ? 'text-brand' : 'text-foreground'
                      }`}
                    >
                      {d.dayName}
                    </span>
                    {isTop && (
                      <span className="rounded bg-brand/10 px-1.5 py-0.2 text-[10px] font-bold text-brand">
                        Líder
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="font-medium text-foreground tnum">{d.count} evt.</span>
                    <span className="w-10 text-right tnum">{d.percentage}%</span>
                  </div>
                </div>

                <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      isTop ? 'bg-brand' : 'bg-brand/50'
                    }`}
                    style={{ width: `${Math.max(d.percentage, d.count > 0 ? 4 : 0)}%` }}
                  />
                </div>
              </div>
            )
          })}

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Lunes a Jueves (Semana)</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground tnum">{weekdayEvents} evt.</span>
                <span className="w-10 text-right tnum">{weekdayPercentage}%</span>
              </div>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gray-300 transition-all duration-500"
                style={{
                  width: `${Math.max(weekdayPercentage, weekdayEvents > 0 ? 4 : 0)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
