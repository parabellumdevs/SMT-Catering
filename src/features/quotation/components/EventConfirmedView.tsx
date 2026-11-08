import * as Dialog from '@radix-ui/react-dialog'
import { CheckCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'

interface Props {
  readonly eventId: string
  /** Cierra y resetea el formulario antes de navegar. */
  readonly onClose: () => void
}

/** Pantalla de éxito tras confirmar y abonar la reserva. */
export function EventConfirmedView({ eventId, onClose }: Props) {
  const navigate = useNavigate()

  return (
    <div className="p-6 text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-state-ok" />
      <Dialog.Title className="mt-3 text-heading-lg font-light text-ink">
        ¡Evento {eventId} Confirmado!
      </Dialog.Title>
      <p className="mt-2 text-sm text-ink-mute">Incorporado al calendario, tablero y comandas de producción.</p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button variant="primary" onClick={() => { onClose(); navigate('/dashboard') }}>
          Ver en Dashboard
        </Button>
        <Button variant="secondary" onClick={() => { onClose(); navigate(`/comandas/${eventId}`) }}>
          Ver Comanda Técnica
        </Button>
      </div>
    </div>
  )
}
