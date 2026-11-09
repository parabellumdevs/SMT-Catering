import * as Dialog from '@radix-ui/react-dialog'
import { CheckCircle2 } from 'lucide-react'


interface Props {
  readonly eventId: string
  /** Cierra y resetea el formulario antes de navegar. */
}

/** Pantalla de éxito tras confirmar y abonar la reserva. */
export function EventConfirmedView({ eventId }: Props) {

  return (
    <div className="p-6 text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-state-ok" />
      <Dialog.Title className="mt-3 text-heading-lg font-light text-ink">
        ¡Evento {eventId} Confirmado!
      </Dialog.Title>
    </div>
  )
}
