import { Award, Flame, UtensilsCrossed } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { StationStat } from '@/features/metrics/hooks/useMetrics'

interface StationRankingsCardProps {
  rankings: StationStat[]
  mostPopularStation: StationStat | null
}

export function StationRankingsCard({
  rankings,
  mostPopularStation,
}: StationRankingsCardProps) {
  return (
    <Card className="border-border/60 bg-white shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-brand" />
            <CardTitle className="text-base font-semibold text-foreground">
              Estaciones Más Contratadas
            </CardTitle>
          </div>
          <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
            5 Islas Culinarias
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Ranking de preferencia por volumen de eventos contratados.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {mostPopularStation && mostPopularStation.count > 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3.5">
            <div className="rounded-full bg-amber-500 p-2 text-white shadow-xs">
              <Award className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-amber-700">
                  Estación Estrella
                </span>
                <span className="text-xs font-bold text-amber-700">
                  {mostPopularStation.percentage}% de adopción
                </span>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {mostPopularStation.name} — Contratada en {mostPopularStation.count}{' '}
                {mostPopularStation.count === 1 ? 'evento' : 'eventos'}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border/80 p-3 text-center text-xs text-muted-foreground">
            Aún no hay suficientes contrataciones registradas.
          </div>
        )}

        <div className="space-y-3 pt-1">
          {rankings.map((station) => {
            const isFirst = station.rank === 1 && station.count > 0
            return (
              <div key={station.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                        isFirst
                          ? 'bg-amber-500 text-white'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {station.rank}
                    </span>
                    <span
                      className={`font-semibold ${
                        isFirst ? 'text-brand' : 'text-foreground'
                      }`}
                    >
                      {station.name}
                    </span>
                    {isFirst && (
                      <Flame className="h-3.5 w-3.5 text-amber-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="font-medium text-foreground tnum">
                      {station.count} {station.count === 1 ? 'reserva' : 'reservas'}
                    </span>
                    <span className="w-10 text-right tnum">{station.percentage}%</span>
                  </div>
                </div>

                <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      isFirst ? 'bg-brand' : 'bg-brand/50'
                    }`}
                    style={{
                      width: `${Math.max(station.percentage, station.count > 0 ? 4 : 0)}%`,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
