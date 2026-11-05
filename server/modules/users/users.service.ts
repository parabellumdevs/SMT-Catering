import { getDatabase } from '../../db/client'
import { hashPassword } from '../../lib/passwords'

export class UsersService {
  static async list() {
    const dbClient = getDatabase()
    const staff = await dbClient.query(`
      SELECT id_usuario, nombre_completo, email, rol, activo, fecha_creacion
      FROM usuario_staff
      ORDER BY id_usuario ASC
    `)

    const clients = await dbClient.query(`
      SELECT id_cliente, razon_social, cuit, nombre_completo, cargo_responsable, email, telefono, direccion_legal, fecha_aniversario, activo, fecha_creacion
      FROM cliente
      ORDER BY id_cliente ASC
    `)

    return { staff, clients }
  }

  static async createStaff(data: {
    nombreCompleto: string
    email: string
    password: string
    rol: string
    activo?: number
  }, authUserRole: string) {
    const dbClient = getDatabase()
    const nombreCompleto = (data.nombreCompleto || '').trim()
    const email = (data.email || '').trim().toLowerCase()
    const password = (data.password || '').trim()
    const rol = (data.rol || 'admin').trim().toLowerCase()
    const activo = data.activo === 0 ? 0 : 1

    if (!nombreCompleto || !email || !password) {
      throw new Error('Nombre completo, email y contraseña son obligatorios.')
    }
    if (password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres.')
    }
    if (!['superadmin', 'admin', 'cocina'].includes(rol)) {
      throw new Error('Rol inválido. Opciones válidas: superadmin, admin, cocina.')
    }
    if (rol === 'superadmin' && authUserRole !== 'superadmin') {
      throw new Error('FORBIDDEN: Solo el Superadministrador puede crear usuarios con rol superadmin.')
    }

    const staffExists = await dbClient.queryOne('SELECT id_usuario FROM usuario_staff WHERE LOWER(email) = ?', [email])
    const clientExists = await dbClient.queryOne('SELECT id_cliente FROM cliente WHERE LOWER(email) = ?', [email])
    if (staffExists || clientExists) {
      throw new Error('DUPLICATE: El email ya se encuentra registrado por otra cuenta.')
    }

    const passwordHash = hashPassword(password)
    const insertRes = await dbClient.execute(
      `INSERT INTO usuario_staff (nombre_completo, email, password_hash, rol, activo)
       VALUES (?, ?, ?, ?, ?)`,
      [nombreCompleto, email, passwordHash, rol, activo],
    )

    const newId = Number(insertRes.lastInsertId)
    return await dbClient.queryOne(
      `SELECT id_usuario, nombre_completo, email, rol, activo, fecha_creacion
       FROM usuario_staff
       WHERE id_usuario = ?`,
      [newId],
    )
  }

  static async updateStaff(targetId: number, body: any, authUserRole: string) {
    const dbClient = getDatabase()
    const existing = await dbClient.queryOne('SELECT * FROM usuario_staff WHERE id_usuario = ?', [targetId])
    if (!existing) {
      throw new Error('NOT_FOUND: Usuario no encontrado.')
    }

    if (existing.rol === 'superadmin' && authUserRole !== 'superadmin') {
      throw new Error('FORBIDDEN: Solo un Superadministrador puede modificar a otro Superadministrador.')
    }

    const nombreCompleto =
      body.nombreCompleto !== undefined
        ? String(body.nombreCompleto).trim()
        : body.nombre_completo !== undefined
        ? String(body.nombre_completo).trim()
        : existing.nombre_completo

    const email = body.email !== undefined ? String(body.email).trim().toLowerCase() : existing.email
    const rol = body.rol !== undefined ? String(body.rol).trim().toLowerCase() : existing.rol
    const activo = body.activo !== undefined ? (Number(body.activo) === 0 ? 0 : 1) : existing.activo

    if (rol && !['superadmin', 'admin', 'cocina'].includes(rol)) {
      throw new Error('Rol inválido. Opciones válidas: superadmin, admin, cocina.')
    }
    if (rol === 'superadmin' && authUserRole !== 'superadmin') {
      throw new Error('FORBIDDEN: Solo un Superadministrador puede promover un usuario a superadmin.')
    }

    if (email !== existing.email.toLowerCase()) {
      const staffDup = await dbClient.queryOne(
        'SELECT id_usuario FROM usuario_staff WHERE LOWER(email) = ? AND id_usuario != ?',
        [email, targetId],
      )
      const clientDup = await dbClient.queryOne('SELECT id_cliente FROM cliente WHERE LOWER(email) = ?', [email])
      if (staffDup || clientDup) {
        throw new Error('DUPLICATE: El email ya se encuentra en uso por otra cuenta.')
      }
    }

    let newPasswordHash = existing.password_hash
    if (body.password && String(body.password).trim().length >= 6) {
      newPasswordHash = hashPassword(String(body.password).trim())
    }

    await dbClient.execute(
      `UPDATE usuario_staff
       SET nombre_completo = ?, email = ?, password_hash = ?, rol = ?, activo = ?
       WHERE id_usuario = ?`,
      [nombreCompleto, email, newPasswordHash, rol, activo, targetId],
    )

    return await dbClient.queryOne(
      `SELECT id_usuario, nombre_completo, email, rol, activo, fecha_creacion
       FROM usuario_staff
       WHERE id_usuario = ?`,
      [targetId],
    )
  }

  static async deleteStaff(targetId: number, currentUserId: number) {
    const dbClient = getDatabase()
    if (targetId === currentUserId) {
      throw new Error('No puedes eliminar tu propia cuenta de Superadministrador.')
    }

    await dbClient.execute('DELETE FROM usuario_staff WHERE id_usuario = ?', [targetId])
  }

  static async updateClient(targetId: number, body: any) {
    const dbClient = getDatabase()
    const existing = await dbClient.queryOne('SELECT * FROM cliente WHERE id_cliente = ?', [targetId])
    if (!existing) {
      throw new Error('NOT_FOUND: Cliente no encontrado.')
    }

    const razonSocial = body.razonSocial !== undefined ? String(body.razonSocial).trim() : existing.razon_social
    const cuit = body.cuit !== undefined ? String(body.cuit).trim() : existing.cuit
    const nombreCompleto =
      body.nombreCompleto !== undefined ? String(body.nombreCompleto).trim() : existing.nombre_completo
    const cargoResponsable =
      body.cargoResponsable !== undefined ? String(body.cargoResponsable).trim() : existing.cargo_responsable
    const email = body.email !== undefined ? String(body.email).trim().toLowerCase() : existing.email
    const telefono = body.telefono !== undefined ? String(body.telefono).trim() : existing.telefono
    const direccionLegal =
      body.direccionLegal !== undefined ? String(body.direccionLegal).trim() : existing.direccion_legal
    const activo = body.activo !== undefined ? (Number(body.activo) === 0 ? 0 : 1) : existing.activo

    if (email !== existing.email.toLowerCase()) {
      const staffDup = await dbClient.queryOne('SELECT id_usuario FROM usuario_staff WHERE LOWER(email) = ?', [email])
      const clientDup = await dbClient.queryOne(
        'SELECT id_cliente FROM cliente WHERE LOWER(email) = ? AND id_cliente != ?',
        [email, targetId],
      )
      if (staffDup || clientDup) {
        throw new Error('DUPLICATE: El email ya está en uso por otro usuario.')
      }
    }

    let newPasswordHash = existing.password_hash
    if (body.password && String(body.password).trim().length >= 6) {
      newPasswordHash = hashPassword(String(body.password).trim())
    }

    await dbClient.execute(
      `UPDATE cliente
       SET razon_social = ?, cuit = ?, nombre_completo = ?, cargo_responsable = ?, email = ?, telefono = ?, direccion_legal = ?, password_hash = ?, activo = ?
       WHERE id_cliente = ?`,
      [
        razonSocial,
        cuit,
        nombreCompleto,
        cargoResponsable,
        email,
        telefono,
        direccionLegal,
        newPasswordHash,
        activo,
        targetId,
      ],
    )

    return await dbClient.queryOne(
      `SELECT id_cliente, razon_social, cuit, nombre_completo, cargo_responsable, email, telefono, direccion_legal, fecha_aniversario, activo, fecha_creacion
       FROM cliente
       WHERE id_cliente = ?`,
      [targetId],
    )
  }
}
