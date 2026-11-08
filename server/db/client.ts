/**
 * Cliente de Base de Datos PostgreSQL (Neon) para SMT Catering.
 * Conexión centralizada asíncrona mediante pg.Pool y fallback HTTP.
 */
import 'dotenv/config'
import dns from 'node:dns'
import pg from 'pg'

// Priorizar IPv4 para evitar cuelgues por ENETUNREACH en redes sin soporte IPv6 nativo
try {
  dns.setDefaultResultOrder('ipv4first')
} catch {}

const { Pool, types } = pg

// Configuración de parsers de PostgreSQL para máxima compatibilidad:
// 1. OID 1082: DATE -> Devolver como string 'YYYY-MM-DD' directo (evita desfases de UTC/zona horaria)
types.setTypeParser(1082, (val: string) => val)
// 2. OID 1700: NUMERIC / DECIMAL -> Devolver como float numérico para operaciones aritméticas
types.setTypeParser(1700, (val: string) => (val === null ? null : parseFloat(val)))

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.warn(
    '⚠️ [DB WARNING] No se encontró DATABASE_URL en el entorno (.env). Verifique su configuración de Neon PostgreSQL.',
  )
}

export const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
})

const isNeon = Boolean(connectionString && connectionString.includes('neon.tech'))
let useHttpTransport = false

// En desarrollo local fuera de Vercel, probar si el puerto 5432 está bloqueado por el ISP/router
// Si está bloqueado, activar de inmediato el transporte HTTPS oficial de Neon (puerto 443)
if (isNeon && process.env.VERCEL !== '1') {
  import('node:net').then(({ default: net }) => {
    try {
      const parsed = new URL(connectionString!)
      const socket = net.connect(5432, parsed.hostname, () => {
        socket.destroy()
      })
      socket.setTimeout(1200, () => {
        useHttpTransport = true
        socket.destroy()
      })
      socket.on('error', () => {
        useHttpTransport = true
      })
    } catch {
      useHttpTransport = true
    }
  }).catch(() => {})
}

async function queryNeonHttp(
  pgSql: string,
  params: any[] = [],
): Promise<{ rows: any[]; rowCount: number }> {
  const parsed = new URL(connectionString!)
  const endpoint = `https://${parsed.hostname}/sql`
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Neon-Connection-String': connectionString!,
    },
    body: JSON.stringify({ query: pgSql, params }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Neon HTTP API Error (${res.status}): ${errText}`)
  }

  const data: any = await res.json()
  return {
    rows: (data.rows as any[]) || [],
    rowCount: data.rowCount ?? data.rows?.length ?? 0,
  }
}

async function executeRawQuery(
  pgSql: string,
  params: any[] = [],
): Promise<{ rows: any[]; rowCount: number }> {
  if (useHttpTransport && isNeon && connectionString) {
    return queryNeonHttp(pgSql, params)
  }

  try {
    const res = await pool.query(pgSql, params)
    return {
      rows: res.rows,
      rowCount: res.rowCount ?? res.rows.length,
    }
  } catch (err: any) {
    if (
      isNeon &&
      connectionString &&
      (err.code === 'ETIMEDOUT' ||
        err.message?.includes('ETIMEDOUT') ||
        err.message?.includes('timeout') ||
        err.message?.includes('connect'))
    ) {
      useHttpTransport = true
      return queryNeonHttp(pgSql, params)
    }
    throw err
  }
}

/**
 * Convierte placeholders posicionales tipo SQLite (?) a sintaxis PostgreSQL ($1, $2, ...)
 */
export function convertPlaceholders(sql: string): string {
  let paramIndex = 1
  return sql.replace(/\?/g, () => `$${paramIndex++}`)
}

export interface QueryResult<T = any> {
  rows: T[]
  rowCount: number
}

export const db = {
  /**
   * Ejecuta una consulta SELECT y retorna un array con todas las filas encontradas.
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const pgSql = convertPlaceholders(sql)
    const res = await executeRawQuery(pgSql, params)
    return res.rows as T[]
  },

  /**
   * Ejecuta una consulta SELECT y retorna una única fila o null si no hay coincidencias.
   */
  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params)
    return rows[0] ?? null
  },

  /**
   * Ejecuta una sentencia INSERT, UPDATE o DELETE.
   * Si es INSERT y no contiene RETURNING, añade RETURNING * para obtener el ID autogenerado.
   */
  async execute(
    sql: string,
    params: any[] = [],
  ): Promise<{
    lastInsertId?: number
    lastInsertRowid?: number
    changes: number
    row?: any
  }> {
    let pgSql = convertPlaceholders(sql)
    const isInsert = /^\s*INSERT\s+INTO/i.test(pgSql)
    if (isInsert && !/RETURNING/i.test(pgSql)) {
      pgSql += ' RETURNING *'
    }

    const res = await executeRawQuery(pgSql, params)
    const firstRow = res.rows[0]
    let lastInsertId: number | undefined

    if (firstRow) {
      const candidate =
        firstRow.id ||
        firstRow.id_cliente ||
        firstRow.id_usuario ||
        firstRow.id_reserva ||
        firstRow.id_pago ||
        firstRow.id_restriccion ||
        firstRow.id_comanda ||
        firstRow.id_estacion ||
        Object.values(firstRow)[0]

      if (candidate !== undefined && !isNaN(Number(candidate))) {
        lastInsertId = Number(candidate)
      }
    }

    const changes = res.rowCount ?? 0

    return {
      lastInsertId,
      lastInsertRowid: lastInsertId,
      changes,
      row: firstRow,
    }
  },

  /**
   * Ejecuta sentencias DDL (CREATE TABLE, ALTER, etc.)
   */
  async exec(sql: string): Promise<void> {
    const pgSql = convertPlaceholders(sql)
    await executeRawQuery(pgSql)
  },

  getPool(): pg.Pool {
    return pool
  },
}

export function getDatabase() {
  return db
}
