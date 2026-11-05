import { getDatabase } from '../../db/client'
import { hashPassword, verifyPassword } from '../../lib/passwords'
import { signJwt } from '../../lib/jwt'
import type { AuthenticatedUser } from '../../types/http'

export interface LoginResult {
  user: AuthenticatedUser
  token: string
}

export class AuthService {
  static async login(usernameOrEmail: string, pass: string): Promise<LoginResult> {
    const dbClient = getDatabase()
    const input = (usernameOrEmail || '').trim().toLowerCase()

    // 0. Credencial de desarrollo / alias rápido para admin
    if (input === 'admin' && (pass === 'admin' || pass === 'admin123')) {
      const user: AuthenticatedUser = {
        id: 2,
        username: 'admin',
        fullName: 'Administrador',
        email: 'admin@smtcatering.com',
        role: 'admin',
        isClient: false,
      }
      const token = signJwt({
        id: 2,
        role: 'admin',
        email: 'admin@smtcatering.com',
        fullName: 'Administrador',
        isClient: false,
      })
      return { user, token }
    }

    // 1. Buscar en usuario_staff
    const lookupEmail = input === 'admin' ? 'admin@smtcatering.com' : input
    const staff = await dbClient.queryOne(
      'SELECT * FROM usuario_staff WHERE LOWER(email) = ? AND activo = 1',
      [lookupEmail],
    )

    if (staff && verifyPassword(pass, staff.password_hash)) {
      const user: AuthenticatedUser = {
        id: staff.id_usuario,
        username: staff.email.split('@')[0],
        fullName: staff.nombre_completo,
        email: staff.email,
        role: staff.rol,
        isClient: false,
      }
      const token = signJwt({
        id: staff.id_usuario,
        role: staff.rol,
        email: staff.email,
        fullName: staff.nombre_completo,
        isClient: false,
      })
      return { user, token }
    }

    // 2. Buscar en cliente
    const cliente = await dbClient.queryOne('SELECT * FROM cliente WHERE LOWER(email) = ?', [input])
    if (cliente && verifyPassword(pass, cliente.password_hash)) {
      if (cliente.activo === 0 || cliente.activo === false) {
        throw new Error('INHABILITADO: Su cuenta de usuario cliente se encuentra inhabilitada. Por favor, comuníquese con el equipo de SMT Catering.')
      }

      const user: AuthenticatedUser = {
        id: cliente.id_cliente,
        username: cliente.email.split('@')[0],
        fullName: cliente.nombre_completo,
        email: cliente.email,
        role: 'cliente',
        isClient: true,
      }
      const token = signJwt({
        id: cliente.id_cliente,
        role: 'cliente',
        email: cliente.email,
        fullName: cliente.nombre_completo,
        isClient: true,
      })
      return { user, token }
    }

    throw new Error('Credenciales inválidas')
  }

  static async register(data: {
    razonSocial: string
    cuit: string
    nombreCompleto: string
    cargoResponsable?: string
    email: string
    telefono?: string
    pass: string
  }): Promise<{ user: AuthenticatedUser; token: string }> {
    const dbClient = getDatabase()
    const razonSocial = (data.razonSocial || '').trim()
    const cuit = (data.cuit || '').trim()
    const nombreCompleto = (data.nombreCompleto || '').trim()
    const cargoResponsable = (data.cargoResponsable || '').trim()
    const email = (data.email || '').trim().toLowerCase()
    const telefono = (data.telefono || '').trim()
    const pass = data.pass || ''

    if (!razonSocial || razonSocial.length < 3) throw new Error('La razón social es requerida')
    if (!cuit) throw new Error('El CUIT es requerido')
    if (!nombreCompleto || nombreCompleto.length < 2) throw new Error('El nombre del responsable es requerido')
    if (!email || !email.includes('@')) throw new Error('Email inválido')
    if (!pass || pass.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres')

    const emailExists = await dbClient.queryOne('SELECT id_cliente FROM cliente WHERE LOWER(email) = ?', [email])
    if (emailExists) throw new Error('DUPLICADO: Ya existe una cuenta con ese email')

    const cuitExists = await dbClient.queryOne('SELECT id_cliente FROM cliente WHERE cuit = ?', [cuit])
    if (cuitExists) throw new Error('DUPLICADO: Ya existe una cuenta con ese CUIT')

    const passHash = hashPassword(pass)
    const result = await dbClient.execute(
      `INSERT INTO cliente (razon_social, cuit, nombre_completo, cargo_responsable, email, telefono, password_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [razonSocial, cuit, nombreCompleto, cargoResponsable || null, email, telefono || null, passHash],
    )

    const idCliente = Number(result.lastInsertId)
    const user: AuthenticatedUser = {
      id: idCliente,
      username: email.split('@')[0],
      fullName: nombreCompleto,
      email,
      role: 'cliente',
      isClient: true,
    }

    const token = signJwt({
      id: idCliente,
      role: 'cliente',
      email,
      fullName: nombreCompleto,
      isClient: true,
    })

    return { user, token }
  }

  static async forgotPassword(emailInput: string): Promise<void> {
    const dbClient = getDatabase()
    const email = (emailInput || '').trim().toLowerCase()
    if (!email || !email.includes('@')) throw new Error('Debes proporcionar un email válido')

    const staff = await dbClient.queryOne(
      'SELECT email FROM usuario_staff WHERE LOWER(email) = ? AND activo = 1',
      [email],
    )
    const cliente = await dbClient.queryOne('SELECT email FROM cliente WHERE LOWER(email) = ?', [email])

    if (!staff && !cliente) {
      return
    }

    const raw =
      Date.now().toString(36) +
      Math.random().toString(36).slice(2) +
      Math.random().toString(36).slice(2)
    const token = raw.slice(0, 40).padEnd(40, '0')
    const expiresAt = Date.now() + 60 * 60 * 1000

    await dbClient.execute('DELETE FROM password_reset_tokens WHERE email = ?', [email])
    await dbClient.execute(
      `INSERT INTO password_reset_tokens (email, token, expires_at, used)
       VALUES (?, ?, ?, 0)`,
      [email, token, expiresAt],
    )

    console.log(`\n🔑 [RESET PASSWORD] Token para ${email}: ${token}\n`)
  }

  static async resetPassword(tokenInput: string, newPass: string, confirmPass: string): Promise<void> {
    const dbClient = getDatabase()
    const token = (tokenInput || '').trim()

    if (!token || token.length !== 40) throw new Error('Token inválido')
    if (newPass.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres')
    if (newPass !== confirmPass) throw new Error('Las contraseñas no coinciden')

    const row = await dbClient.queryOne(
      'SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0',
      [token],
    )
    if (!row) throw new Error('Token inválido o ya utilizado')
    if (Date.now() > Number(row.expires_at)) {
      await dbClient.execute('DELETE FROM password_reset_tokens WHERE token = ?', [token])
      throw new Error('El token expiró. Solicitá uno nuevo.')
    }

    const email = row.email
    const hashedPass = hashPassword(newPass)
    const staffUpd = await dbClient.execute(
      'UPDATE usuario_staff SET password_hash = ? WHERE LOWER(email) = ?',
      [hashedPass, email],
    )
    if (staffUpd.changes === 0) {
      await dbClient.execute('UPDATE cliente SET password_hash = ? WHERE LOWER(email) = ?', [
        hashedPass,
        email,
      ])
    }

    await dbClient.execute('UPDATE password_reset_tokens SET used = 1 WHERE token = ?', [token])
  }
}
