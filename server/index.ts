/**
 * Punto de entrada del servidor Backend de SMT Catering.
 * Servidor HTTP nativo de Node.js que orquesta los módulos de la aplicación.
 */
import { createServer } from 'node:http'
import { app } from './app'
import { db, getDatabase } from './db/client'

const PORT = Number(process.env.PORT) || 3001

/** Crea la tabla de tokens de reset de contraseña si no existe (idempotente). */
async function ensureResetTokensTable(dbClient: typeof db) {
  try {
    await dbClient.exec(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        email VARCHAR(100) NOT NULL,
        token VARCHAR(64) NOT NULL UNIQUE,
        expires_at BIGINT NOT NULL,
        used INTEGER NOT NULL DEFAULT 0
      )
    `)
  } catch (err: any) {
    console.error('⚠️ Error al verificar tabla password_reset_tokens:', err.message)
  }
}

/** Garantiza que la columna activo exista en la tabla cliente (idempotente). */
async function ensureClientActiveColumn(dbClient: typeof db) {
  try {
    await dbClient.exec(`ALTER TABLE cliente ADD COLUMN IF NOT EXISTS activo INTEGER NOT NULL DEFAULT 1`)
  } catch {
    // Si ya existe la columna o la base no lo permite, continúa
  }
}

export { app }
export const server = createServer(app)

// En entorno de ejecución local estándar, levantar servidor HTTP en puerto asignado
if (process.env.VERCEL !== '1') {
  server.listen(PORT, '0.0.0.0', async () => {
    const dbClient = getDatabase()
    await ensureResetTokensTable(dbClient)
    await ensureClientActiveColumn(dbClient)

    console.log(`🚀 SMT Catering Server corriendo en http://localhost:${PORT}`)
    console.log(`📡 Base de Datos: Neon PostgreSQL Cloud`)
    console.log(`✨ Arquitectura Vertical Slices activa:`)
    console.log(`   - Auth:       POST /api/auth/{login,register,logout,forgot-password,reset-password}, GET /api/auth/me`)
    console.log(`   - Tariffs:    GET /api/tariffs, PUT /api/tariffs/:id, POST /api/tariffs/bulk`)
    console.log(`   - Events:     GET /api/events, POST /api/events, PATCH /api/events/:id, GET /api/events/my-events`)
    console.log(`   - Quotation:  GET /api/quotation/availability, POST /api/quotation/calculate`)
    console.log(`   - Production: GET /api/production/:eventId`)
    console.log(`   - Profile:    GET /api/client/profile, PUT /api/client/profile, POST /api/client/change-password`)
    console.log(`   - Users:      GET /api/users, POST /api/users/staff, PATCH /api/users/staff/:id, DELETE /api/users/staff/:id, PATCH /api/users/clients/:id`)
  })
}

export default server
