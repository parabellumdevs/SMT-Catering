import { getDatabase } from '../../db/client'

export class TariffsService {
  static async list() {
    const dbClient = getDatabase()
    const rows = await dbClient.query(
      'SELECT id, label, category, price_per_guest_cents, fixed_cents FROM tarifas WHERE is_active = 1',
    )
    return rows.map((r: any) => ({
      id: r.id,
      label: r.label,
      category: r.category,
      pricePerGuestCents: r.price_per_guest_cents,
      fixedCents: r.fixed_cents,
    }))
  }

  static async update(id: string, pricePerGuestCents: number, fixedCents?: number | null) {
    const dbClient = getDatabase()
    await dbClient.execute(
      'UPDATE tarifas SET price_per_guest_cents = ?, fixed_cents = COALESCE(?, fixed_cents) WHERE id = ?',
      [pricePerGuestCents, fixedCents ?? null, id],
    )
  }

  static async bulkUpdate(list: Array<{ id: string; pricePerGuestCents: number; fixedCents?: number }>) {
    const dbClient = getDatabase()
    if (Array.isArray(list)) {
      for (const t of list) {
        await dbClient.execute('UPDATE tarifas SET price_per_guest_cents = ? WHERE id = ?', [
          t.pricePerGuestCents,
          t.id,
        ])
      }
    }
  }
}
