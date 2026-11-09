import { useMemo } from 'react'

import { ESTACIONES_GASTRONOMICAS, type EstacionId } from '@/lib/constants'
import { useEvents } from '@/features/dashboard/hooks/useEventsSummary'
import type { EventRecord } from '@/types/domain'

export interface DayDistribution {
  dayName: string
  shortName: string
  dayIndex: number // 0: Dom, 1: Lun, ..., 6: Sáb
  count: number
  percentage: number
  isWeekend: boolean
}

export interface StationStat {
  id: EstacionId
  name: string
  description: string
  count: number
  percentage: number
  rank: number
}

export interface MetricsData {
  totalEvents: number
  activeEventsCount: number
  cancelledEventsCount: number
  eventsThisMonth: number

  billingTotalCents: number
  depositsCollectedCents: number
  balancesPendingCents: number
  averageTicketCents: number
  collectionRatePercentage: number

  totalGuests: number
  averageGuestsPerEvent: number

  dayDistribution: DayDistribution[]
  mostPopularDay: DayDistribution | null
  weekendPercentage: number

  stationRankings: StationStat[]
  mostPopularStation: StationStat | null

  paidInFullCount: number
  pendingBalanceCount: number
}

const monthOf = (isoDate: string): string => isoDate.slice(0, 7)

const DAYS_META: Array<{ name: string; short: string; index: number }> = [
  { name: 'Domingo', short: 'Dom', index: 0 },
  { name: 'Lunes', short: 'Lun', index: 1 },
  { name: 'Martes', short: 'Mar', index: 2 },
  { name: 'Miércoles', short: 'Mié', index: 3 },
  { name: 'Jueves', short: 'Jue', index: 4 },
  { name: 'Viernes', short: 'Vie', index: 5 },
  { name: 'Sábado', short: 'Sáb', index: 6 },
]

export function computeMetrics(events: EventRecord[]): MetricsData {
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const totalEvents = events.length
  const activeEvents = events.filter((e) => !e.cancelled)
  const activeEventsCount = activeEvents.length
  const cancelledEventsCount = events.filter((e) => e.cancelled).length

  const eventsThisMonth = activeEvents.filter((e) => monthOf(e.eventDate) === currentMonth).length

  const billingTotalCents = activeEvents.reduce((sum, e) => sum + (e.totalCents || 0), 0)

  const depositsCollectedCents = activeEvents.reduce((sum, e) => {
    if (e.paymentStatus === 'SALDO_PENDIENTE') {
      return sum + (e.depositCents || 0)
    }
    if (e.paymentStatus === 'SALDADO') {
      return sum + (e.totalCents || 0)
    }
    return sum
  }, 0)

  const balancesPendingCents = activeEvents.reduce((sum, e) => {
    if (e.paymentStatus === 'SALDO_PENDIENTE') {
      return sum + Math.max(0, (e.totalCents || 0) - (e.depositCents || 0))
    }
    return sum
  }, 0)

  const averageTicketCents =
    activeEventsCount > 0 ? Math.round(billingTotalCents / activeEventsCount) : 0

  const collectionRatePercentage =
    billingTotalCents > 0
      ? Math.round((depositsCollectedCents / billingTotalCents) * 100)
      : 0

  const totalGuests = activeEvents.reduce((sum, e) => sum + (e.guests || 0), 0)
  const averageGuestsPerEvent =
    activeEventsCount > 0 ? Math.round(totalGuests / activeEventsCount) : 0

  const dayCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }

  for (const e of activeEvents) {
    if (!e.eventDate) continue
    const datePart = e.eventDate.split('T')[0] ?? ''
    const parts = datePart.split('-').map(Number)
    const y = parts[0]
    const m = parts[1]
    const d = parts[2]
    if (!y || !m || !d) continue
    const dateObj = new Date(y, m - 1, d)
    const dayOfWeek = dateObj.getDay()
    dayCounts[dayOfWeek] = (dayCounts[dayOfWeek] ?? 0) + 1
  }

  const dayDistribution: DayDistribution[] = DAYS_META.map((meta) => {
    const count = dayCounts[meta.index] ?? 0
    const percentage =
      activeEventsCount > 0 ? Math.round((count / activeEventsCount) * 100) : 0
    return {
      dayName: meta.name,
      shortName: meta.short,
      dayIndex: meta.index,
      count,
      percentage,
      isWeekend: meta.index === 0 || meta.index === 5 || meta.index === 6,
    }
  })

  const sortedDays = [...dayDistribution].sort((a, b) => b.count - a.count)
  const topDay = sortedDays[0]
  const mostPopularDay: DayDistribution | null =
    topDay && topDay.count > 0 ? topDay : (dayDistribution.find((d) => d.dayIndex === 6) ?? null)

  const weekendCount = (dayCounts[5] ?? 0) + (dayCounts[6] ?? 0) + (dayCounts[0] ?? 0)
  const weekendPercentage =
    activeEventsCount > 0 ? Math.round((weekendCount / activeEventsCount) * 100) : 0

  const stationCounts: Record<string, number> = {
    entradas: 0,
    pastas: 0,
    parrilla: 0,
    asiatica: 0,
    dulce: 0,
  }

  for (const e of activeEvents) {
    if (Array.isArray(e.stationIds)) {
      for (const stId of e.stationIds) {
        if (typeof stationCounts[stId] === 'number') {
          stationCounts[stId] = (stationCounts[stId] ?? 0) + 1
        }
      }
    }
  }

  const unsortedStations: Omit<StationStat, 'rank'>[] = ESTACIONES_GASTRONOMICAS.map((est) => {
    const count = stationCounts[est.id] ?? 0
    const percentage =
      activeEventsCount > 0 ? Math.round((count / activeEventsCount) * 100) : 0
    return {
      id: est.id,
      name: est.nombre,
      description: est.descripcion,
      count,
      percentage,
    }
  })

  unsortedStations.sort((a, b) => b.count - a.count)

  const stationRankings: StationStat[] = unsortedStations.map((st, idx) => ({
    ...st,
    rank: idx + 1,
  }))

  const topStation = stationRankings[0]
  const mostPopularStation: StationStat | null =
    topStation && topStation.count > 0 ? topStation : null

  const paidInFullCount = activeEvents.filter((e) => e.paymentStatus === 'SALDADO').length
  const pendingBalanceCount = activeEvents.filter((e) => e.paymentStatus === 'SALDO_PENDIENTE').length

  return {
    totalEvents,
    activeEventsCount,
    cancelledEventsCount,
    eventsThisMonth,
    billingTotalCents,
    depositsCollectedCents,
    balancesPendingCents,
    averageTicketCents,
    collectionRatePercentage,
    totalGuests,
    averageGuestsPerEvent,
    dayDistribution,
    mostPopularDay,
    weekendPercentage,
    stationRankings,
    mostPopularStation,
    paidInFullCount,
    pendingBalanceCount,
  }
}

export function useMetrics() {
  const { data: events = [], isLoading, refetch } = useEvents()

  const metrics = useMemo(() => computeMetrics(events), [events])

  return {
    metrics,
    isLoading,
    refetch,
    rawEvents: events,
  }
}
