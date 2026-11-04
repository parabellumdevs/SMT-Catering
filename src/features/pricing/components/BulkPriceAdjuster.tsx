import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, Percent } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const adjustSchema = z.object({
  percent: z
    .number({ message: 'Ingresá un porcentaje válido' })
    .int('Debe ser un número entero')
    .min(-50, 'Mínimo -50%')
    .max(200, 'Máximo +200%'),
})

type AdjustForm = z.infer<typeof adjustSchema>

interface Props {
  previewActive: boolean
  onPreview: (percent: number) => void
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Componente de ajuste masivo porcentual de tarifas (Módulo 3: Tarifas).
 *
 * Funcionalidad y Reglas de Negocio:
 * - Diseñado para actualizar tarifas ante inflación o variaciones generales de costos (ej. +15%).
 * - Utiliza react-hook-form y Zod para garantizar que el porcentaje sea entero en el rango [-50%, +200%].
 * - Regla invariante: requiere OBLIGATORIAMENTE una vista previa activa antes de permitir confirmar el cambio.
 * - Los cambios masivos solo aplican a cotizaciones futuras; los presupuestos señados mantienen tarifas congeladas.
 */
export function BulkPriceAdjuster({ previewActive, onPreview, onConfirm, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<AdjustForm>({
    resolver: zodResolver(adjustSchema),
    defaultValues: { percent: 15 },
    mode: 'onChange',
  })

  return (
    <form
      className="rounded-lg border border-hairline bg-canvas-soft p-4"
      onSubmit={handleSubmit((v) => onPreview(v.percent))}
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <Label htmlFor="bulk-percent" className="mb-1.5 block text-xs text-ink-mute">
            Ajuste general (%)
          </Label>
          <div className="relative">
            <Input
              id="bulk-percent"
              type="number"
              step="1"
              className="pr-9 tnum"
              disabled={previewActive}
              {...register('percent', { valueAsNumber: true })}
            />
            <Percent className="absolute right-3 top-3 h-4 w-4 text-ink-mute" />
          </div>
        </div>

        {previewActive ? (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={(e) => { e.preventDefault(); onConfirm() }}>
              Confirmar ajuste
            </Button>
            <Button variant="ghost" onClick={(e) => { e.preventDefault(); onCancel() }}>
              Cancelar
            </Button>
          </div>
        ) : (
          <Button 
          type="submit" disabled={!isValid}
          variant="brand" 
          className="gap-1.5 shrink-0 rounded-lg"
          >
            Previsualizar impacto
          </Button>
        )}
      </div>

      {errors.percent && (
        <p role="alert" className="mt-2 text-sm text-state-danger">
          {errors.percent.message}
        </p>
      )}

      {previewActive && (
        <p className="mt-3 flex items-start gap-2 rounded-md bg-state-warn-bg px-3 py-2 text-sm text-state-warn">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Vista previa: los cambios solo afectan cotizaciones nuevas. Los presupuestos con seña
          abonada mantienen su precio congelado.
        </p>
      )}
    </form>
  )
}
