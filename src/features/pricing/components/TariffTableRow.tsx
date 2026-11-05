import { Check, Edit2, X } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TD, TR } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import type { Tariff } from '@/types/domain'

const categoryLabel: Record<Tariff['category'], string> = {
  base: 'Base',
  station: 'Estación',
  extra: 'Adicional',
  insurance: 'Seguro',
}

interface RowItemProps {
  tariff: Tariff
  previewPrice?: number
  onUpdate: (id: string, cents: number) => void
  onUpdateFixed: (id: string, cents: number) => void
}

/**
 * Fila individual de la tabla de tarifas (Módulo 3: Tarifas).
 */
export function TariffTableRow({ tariff, previewPrice, onUpdate, onUpdateFixed }: RowItemProps) {
  const isFixed = tariff.category === 'insurance'
  const currentCents = isFixed ? (tariff.fixedCents ?? 0) : tariff.pricePerGuestCents
  const inPreview = previewPrice !== undefined

  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState((currentCents / 100).toFixed(0))
  const [savedBadge, setSavedBadge] = useState(false)

  const handleSave = () => {
    const parsed = Number(val)
    if (Number.isFinite(parsed) && parsed >= 0) {
      const cents = Math.round(parsed * 100)
      if (isFixed) onUpdateFixed(tariff.id, cents)
      else onUpdate(tariff.id, cents)
      setSavedBadge(true)
      setTimeout(() => setSavedBadge(false), 2500)
    }
    setEditing(false)
  }

  const handleCancel = () => {
    setVal((currentCents / 100).toFixed(0))
    setEditing(false)
  }

  return (
    <TR key={tariff.id}>
      <TD className="font-normal text-ink">
        <div className="flex items-center gap-2">
          <span>{tariff.label}</span>
          {savedBadge && (
            <span className="text-[10px] text-state-ok font-medium animate-pulse" role="status">
              ✓ Guardado
            </span>
          )}
        </div>
      </TD>
      <TD>
        {/* Usamos 'brand' en lugar de 'primary' para categorías base si querés mantener el color unificado */}
        <Badge variant={tariff.category === 'base' ? 'primary' : 'neutral'}>
          {categoryLabel[tariff.category]}
        </Badge>
      </TD>
      <TD className="text-right">
        {editing ? (
          <div className="flex items-center justify-end gap-1.5">
            <span className="text-xs text-ink-mute">$</span>
            <Input
              type="number"
              min="0"
              step="100"
              autoFocus
              className="h-8 w-28 text-right tnum"
              aria-label={
                isFixed
                  ? `Monto fijo por evento de ${tariff.label}`
                  : `Precio por comensal de ${tariff.label}`
              }
              value={val}
              onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') handleCancel()
              }}
            />
            {/* Botón de confirmación (Check) con color brand corporativo */}
            <button
              type="button"
              onClick={handleSave}
              className="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-white hover:bg-brand-dark transition-colors"
              title="Guardar nuevo precio"
              aria-label="Confirmar nuevo precio"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-hairline text-ink-mute hover:text-ink transition-colors"
              title="Cancelar edición"
              aria-label="Cancelar edición"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <span
            className={`tnum ${inPreview && !isFixed ? 'text-ink-mute line-through' : 'text-ink font-normal'}`}
          >
            {formatCurrency(currentCents)}
          </span>
        )}
      </TD>
      {inPreview ? (
        <TD className="text-right font-normal text-brand tnum">
          {isFixed ? (
            <span className="text-ink-mute">Sin ajuste</span>
          ) : (
            formatCurrency(previewPrice ?? 0)
          )}
        </TD>
      ) : (
        <TD className="text-right">
          {!editing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setVal((currentCents / 100).toFixed(0))
                setEditing(true)
              }}
              className="h-7 px-2.5 text-xs text-brand hover:bg-brand/10"
              aria-label={`Editar tarifa de ${tariff.label}`}
            >
              <Edit2 className="h-3 w-3 mr-1" />
              Editar
            </Button>
          )}
        </TD>
      )}
    </TR>
  )
}