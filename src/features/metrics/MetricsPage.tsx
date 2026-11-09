import { RefreshCw } from 'lucide-react'

import { PageHeader } from '@/components/layout/AppShell'
import { useMetrics } from '@/features/metrics/hooks/useMetrics'
import { MetricCards } from '@/features/metrics/components/MetricCards'
import { DayDistributionCard } from '@/features/metrics/components/DayDistributionCard'
import { StationRankingsCard } from '@/features/metrics/components/StationRankingsCard'
import { CollectionStatusCard } from '@/features/metrics/components/CollectionStatusCard'

/**
 * Módulo 9 — Métricas Operativas & Comerciales (Admin y Superadmin).
 *
 * Expone:
 *  - Indicadores clave (Facturación total, Señas, Saldos, Ticket promedio por evento).
 *  - Día más solicitado (Viernes vs. Sábado vs. Domingo vs. Días de semana).
 *  - Ranking de estaciones / islas gastronómicas más contratadas.
 *  - Estado de cobros y volumen de comensales.
 */
export function MetricsPage() {
  const { metrics, isLoading, refetch } = useMetrics()

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Métricas Operativas & Comerciales"
        description="Rendimiento del negocio, ticket promedio, días más solicitados e islas gastronómicas líderes."
        actions={
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-white px-3 py-1.5 text-xs font-medium text-foreground shadow-xs hover:bg-gray-50 disabled:opacity-60 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-brand' : 'text-muted-foreground'}`} />
            Actualizar
          </button>
        }
      />

      {isLoading ? (
        <div className="rounded-2xl border border-border/60 bg-white p-12 text-center">
          <output className="text-sm text-muted-foreground">Cargando métricas del sistema…</output>
        </div>
      ) : (
        <>
          {/* Grilla superior de KPIs y tarjetas principales */}
          <MetricCards metrics={metrics} />

          {/* Grilla central de 2 columnas: Días más solicitados e Islas Culinarias */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <DayDistributionCard
              distribution={metrics.dayDistribution}
              mostPopularDay={metrics.mostPopularDay}
              weekendPercentage={metrics.weekendPercentage}
            />

            <StationRankingsCard
              rankings={metrics.stationRankings}
              mostPopularStation={metrics.mostPopularStation}
            />
          </div>

          {/* Sección inferior: Estado de Cobros y Cartera */}
          <CollectionStatusCard metrics={metrics} />
        </>
      )}
    </div>
  )
}
