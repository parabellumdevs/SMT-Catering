import { Clock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useQuotationStore } from '@/stores/quotationStore'

const TIME_SLOTS = [
  { time: '19:00', label: '19:00 hs', subtitle: 'Recepción y comienzo temprano' },
  { time: '19:30', label: '19:30 hs', subtitle: 'Horario sugerido estándar' },
  { time: '20:00', label: '20:00 hs', subtitle: 'Cena corporativa' },
  { time: '20:30', label: '20:30 hs', subtitle: 'Inicio flexible' },
  { time: '21:00', label: '21:00 hs', subtitle: 'Comienzo nocturno' },
]

export function TimeSlotSelector() {
  const startTime = useQuotationStore((s) => s.startTime || '19:30')
  const setStartTime = useQuotationStore((s) => s.setStartTime)

  return (
    <section
      aria-labelledby="time-heading"
      className="flex h-full flex-col justify-between rounded-lg border border-hairline bg-canvas p-5 shadow-1"
    >
      <div>
        <div className="mb-1 flex items-center gap-2">
          <Clock className="h-5 w-5 text-[#581c25]" />
          <h2 id="time-heading" className="text-heading-lg font-light text-ink">
            Horario de Inicio
          </h2>
        </div>
        <p className="mb-4 text-xs text-ink-mute">
          Franja habilitada para comienzo del evento: de 19:00 a 21:00 hs.
        </p>

        <div className="space-y-2">
          {TIME_SLOTS.map((slot) => {
            const isSelected = startTime === slot.time
            return (
              <Button
                key={slot.time}
                type="button"
                variant={isSelected ? 'borravino' : 'secondary'}
                onClick={() => setStartTime?.(slot.time)}
                className={cn(
                  'flex h-auto w-full items-center justify-between rounded-md p-3 text-left text-sm transition-colors',
                  isSelected
                    ? 'border-[#581c25] font-medium shadow-1'
                    : 'border-hairline text-ink hover:bg-canvas-soft bg-canvas hover:text-ink',
                )}
              >
                <div>
                  <span className="font-semibold block">{slot.label}</span>
                  <span className={cn('text-[11px]', isSelected ? 'text-white/80' : 'text-ink-mute')}>
                    {slot.subtitle}
                  </span>
                </div>
                <span
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-full border',
                    isSelected ? 'border-white bg-white text-[#581c25]' : 'border-hairline',
                  )}
                >
                  {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-[#581c25]" />}
                </span>
              </Button>
            )
          })}
        </div>
      </div>
    </section>
  )
}