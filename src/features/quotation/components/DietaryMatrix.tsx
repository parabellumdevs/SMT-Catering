import { AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useQuotationStore } from '@/stores/quotationStore'

export function DietaryMatrix() {
  const dietary = useQuotationStore((s) => s.dietary)
  const setDietary = useQuotationStore((s) => s.setDietary)

  const handleCountChange = (field: keyof typeof dietary, value: number) => {
    setDietary({
      ...dietary,
      [field]: Math.max(0, value),
    })
  }

  const handleNotesChange = (alergias: string) => {
    setDietary({
      ...dietary,
      alergias,
    })
  }

  return (
    <div className="rounded-2xl border border-hairline bg-canvas p-6 shadow-sm space-y-6">
      {/* Encabezado del Paso 3 */}
      <div className="flex items-center gap-3 border-b border-hairline pb-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#581c25] text-xs font-bold text-white">
          3
        </span>
        <h2 className="text-lg font-semibold text-ink">Restricciones & Requerimientos Dietéticos</h2>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {/* Celíacos */}
        <div className="space-y-2">
          <Label htmlFor="celiacos" className="text-xs font-medium uppercase tracking-wide text-ink-secondary">
            Celíacos (Sin TACC)
          </Label>
          <Input
            id="celiacos"
            type="number"
            min={0}
            className="h-11 tnum"
            value={dietary.celiacos}
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
            className="h-11 tnum"
            value={dietary.vegetarianos}
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
            className="h-11 tnum"
            value={dietary.veganos}
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
            className="h-11 tnum"
            value={dietary.hipertensos}
            onChange={(e) => handleCountChange('hipertensos', Number(e.target.value))}
          />
        </div>
      </div>

      {/* Alergias y Observaciones */}
      <div className="space-y-2 pt-2">
        <Label htmlFor="alergias" className="text-xs font-medium uppercase tracking-wide text-ink-secondary">
          Alergias o Observaciones especiales
        </Label>
        <Input
          id="alergias"
          type="text"
          className="h-11"
          placeholder="Ej: Alergia severa a frutos secos, intolerancia a la lactosa..."
          value={dietary.alergias}
          onChange={(e) => handleNotesChange(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-canvas-soft px-3.5 py-3 text-xs text-ink-mute">
        <AlertCircle className="h-4 w-4 shrink-0 text-[#581c25]" />
        <span>Garantizamos opciones seguras y trazabilidad para menús especiales sin costo adicional.</span>
      </div>
    </div>
  )
}