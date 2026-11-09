import { CheckCircle2, Clock, AlertTriangle, ShieldCheck } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { MetricsData } from '@/features/metrics/hooks/useMetrics'

interface CollectionStatusCardProps {
  metrics: MetricsData
}

export function CollectionStatusCard({ metrics }: CollectionStatusCardProps) {
  return (
    <Card className="border-border/60 bg-white shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand" />
            <CardTitle className="text-base font-semibold text-foreground">
              Estado de Cobros & Cartera
            </CardTitle>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            {metrics.collectionRatePercentage}% Cobrado
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Seguimiento de saldos pendientes y cancelaciones sobre el total de contrataciones.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-muted-foreground">Progreso de Recaudación</span>
            <span className="text-foreground font-semibold">
              {formatCurrency(metrics.depositsCollectedCents)} de {formatCurrency(metrics.billingTotalCents)}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all duration-500"
              style={{ width: `${metrics.collectionRatePercentage}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-2">
          <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-xs font-medium text-emerald-800">Saldados al 100%</p>
              <p className="text-lg font-bold text-foreground tnum">{metrics.paidInFullCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <Clock className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-xs font-medium text-amber-800">Saldo Pendiente</p>
              <p className="text-lg font-bold text-foreground tnum">{metrics.pendingBalanceCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            <div>
              <p className="text-xs font-medium text-rose-800">Cancelados</p>
              <p className="text-lg font-bold text-foreground tnum">{metrics.cancelledEventsCount}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
