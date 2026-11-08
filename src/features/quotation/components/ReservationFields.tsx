import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  readonly clientName: string
  readonly kitchenNotes: string
  readonly onClientNameChange: (value: string) => void
  readonly onKitchenNotesChange: (value: string) => void
  /** Ayuda bajo el campo Cliente / Empresa (p. ej. dato autocompletado del perfil). */
  readonly hint?: string
}

/** Campos de datos de la reserva en el modal de confirmación. */
export function ReservationFields({
  clientName,
  kitchenNotes,
  onClientNameChange,
  onKitchenNotesChange,
  hint,
}: Props) {
  return (
    <div className="space-y-3">
      <div>
        <Label
          htmlFor="clientName"
          className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-secondary"
        >
          Cliente / Empresa *
        </Label>
        <Input
          id="clientName"
          required
          placeholder="Ej. TechCorp S.A."
          value={clientName}
          onChange={(e) => onClientNameChange(e.target.value)}
        />
        {hint && <p className="mt-1 text-[11px] text-ink-mute">{hint}</p>}
      </div>
      <div>
        <Label
          htmlFor="kitchenNotes"
          className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-secondary"
        >
          Notas de cocina / logística
        </Label>
        <Input
          id="kitchenNotes"
          placeholder="Ej. Servicio a las 20:30hs"
          value={kitchenNotes}
          onChange={(e) => onKitchenNotesChange(e.target.value)}
        />
      </div>
    </div>
  )
}
