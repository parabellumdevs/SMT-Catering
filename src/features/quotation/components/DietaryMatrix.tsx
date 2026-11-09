import { AlertCircle, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useQuotationStore, getDietaryTotal } from '@/stores/quotationStore'

export function DietaryMatrix() {
  const guests = useQuotationStore((s) => s.guests)
  const dietary = useQuotationStore((s) => s.dietary)
  const setDietary = useQuotationStore((s) => s.setDietary)

  const customObservations = dietary.customObservations || []
  const addCustomObservation = useQuotationStore((s) => s.addCustomObservation)
  const updateCustomObservation = useQuotationStore((s) => s.updateCustomObservation)
  const removeCustomObservation = useQuotationStore((s) => s.removeCustomObservation)

  const totalDietaryCount = getDietaryTotal(dietary)

  // Helper para obtener la cantidad máxima permitida por campo en tiempo real
  const getAvailableMax = (currentValue: number) => {
    const otherSelectionsTotal = totalDietaryCount - currentValue
    return Math.max(0, guests - otherSelectionsTotal)
  }

  const handleCountChange = (
    field: 'celiacos' | 'vegetarianos' | 'veganos' | 'hipertensos',
    value: number
  ) => {
    setDietary({
      [field]: value,
    })
  }

  return (
    <div className="rounded-2xl border border-hairline bg-canvas p-6 shadow-sm space-y-6">
      {/* Encabezado del Paso 3 */}
      <div className="flex items-center gap-3 border-b border-hairline pb-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#581c25] text-xs font-bold text-white">
          3
        </span>
        <div className="flex-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Restricciones & Requerimientos Dietéticos</h2>
          <span className="text-xs text-ink-mute font-medium tnum">
            Asignados: <strong className="text-ink">{totalDietaryCount}</strong> / {guests} comensales
          </span>
        </div>
      </div>

      {/* Grid con las 4 restricciones fijas (incluye Hipertensos) */}
      <div className="grid gap-6 sm:grid-cols-4">
        {/* Celíacos */}
        <div className="space-y-2">
          <Label htmlFor="celiacos" className="text-xs font-medium uppercase tracking-wide text-ink-secondary">
            Celíacos (Sin TACC)
          </Label>
          <Input
            id="celiacos"
            type="number"
            min={0}
            max={getAvailableMax(dietary.celiacos || 0)}
            className="h-11 tnum"
            value={dietary.celiacos ?? 0}
            onChange={(e) => handleCountChange('celiacos', Number(e.target.value))}
          />
        </div>

        {/* Vegetarianos */}
        <div className="space-y-2">
          <Label htmlFor="vegetarianos" className="text-xs font-medium uppercase tracking-wide text-ink-secondary">
            Vegetarianos
          </Label>
          <Input
            id="vegetarianos"
            type="number"
            min={0}
            max={getAvailableMax(dietary.vegetarianos || 0)}
            className="h-11 tnum"
            value={dietary.vegetarianos ?? 0}
            onChange={(e) => handleCountChange('vegetarianos', Number(e.target.value))}
          />
        </div>

        {/* Veganos */}
        <div className="space-y-2">
          <Label htmlFor="veganos" className="text-xs font-medium uppercase tracking-wide text-ink-secondary">
            Veganos
          </Label>
          <Input
            id="veganos"
            type="number"
            min={0}
            max={getAvailableMax(dietary.veganos || 0)}
            className="h-11 tnum"
            value={dietary.veganos ?? 0}
            onChange={(e) => handleCountChange('veganos', Number(e.target.value))}
          />
        </div>

        {/* Hipertensos */}
        <div className="space-y-2">
          <Label htmlFor="hipertensos" className="text-xs font-medium uppercase tracking-wide text-ink-secondary">
            Hipertensos
          </Label>
          <Input
            id="hipertensos"
            type="number"
            min={0}
            max={getAvailableMax(dietary.hipertensos || 0)}
            className="h-11 tnum"
            value={dietary.hipertensos ?? 0}
            onChange={(e) => handleCountChange('hipertensos', Number(e.target.value))}
          />
        </div>
      </div>

      {/* Alergias u Observaciones dinámicas */}
      <div className="space-y-3 pt-2">
        <Label className="text-xs font-medium uppercase tracking-wide text-ink-secondary block">
          Alergias o Observaciones Especiales
        </Label>

        <div className="space-y-3">
          {customObservations.map((obs) => (
            <div key={obs.id} className="flex items-center gap-3">
              {/* Campo de descripción más angosto */}
              <div className="flex-1">
                <Input
                  type="text"
                  className="h-11"
                  placeholder="Ej: Alergia severa a frutos secos, intolerancia a la lactosa..."
                  value={obs.description}
                  onChange={(e) => updateCustomObservation(obs.id, 'description', e.target.value)}
                />
              </div>

              {/* Selector de cantidad alineado a la derecha */}
              <div className="w-24 shrink-0">
                <Input
                  type="number"
                  min={0}
                  max={getAvailableMax(obs.count || 0)}
                  className="h-11 tnum text-center"
                  value={obs.count ?? 0}
                  onChange={(e) =>
                    updateCustomObservation(obs.id, 'count', parseInt(e.target.value, 10) || 0)
                  }
                />
              </div>

              {/* Botón eliminar si hay más de una fila */}
              {customObservations.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCustomObservation(obs.id)}
                  className="h-11 w-11 p-0 text-ink-mute hover:text-red-600 shrink-0 flex items-center justify-center"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Botón para sumar otra observación */}
        <Button
          type="button"
          variant="ghost"
          onClick={addCustomObservation}
          className="mt-1 text-xs text-[#581c25] hover:text-[#581c25]/80 hover:bg-[#581c25]/5 p-0 h-auto font-medium flex items-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar otra observación
        </Button>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-canvas-soft px-3.5 py-3 text-xs text-ink-mute">
        <AlertCircle className="h-4 w-4 shrink-0 text-[#581c25]" />
        <span>Garantizamos opciones seguras y trazabilidad para menús especiales sin costo adicional.</span>
      </div>
    </div>
  )
}