import { getDatabase } from '../../db/client.ts'
import { hashPassword, verifyPassword } from '../../lib/passwords.ts'

export class ProfileService {
  static async getProfile(clientId: number) {
    const dbClient = getDatabase()
    const cliente = await dbClient.queryOne('SELECT * FROM cliente WHERE id_cliente = ?', [clientId])
    if (!cliente) throw new Error('NOT_FOUND: Cliente no encontrado')

    return {
      razonSocial: cliente.razon_social || '',
      cuit: cliente.cuit || '',
      nombreCompleto: cliente.nombre_completo || '',
      cargoResponsable: cliente.cargo_responsable || '',
      email: cliente.email || '',
      telefono: cliente.telefono || '',
      direccionLegal: cliente.direccion_legal || '',
    }
  }

  static async updateProfile(clientId: number, body: any) {
    const dbClient = getDatabase()
    const cliente = await dbClient.queryOne('SELECT * FROM cliente WHERE id_cliente = ?', [clientId])
    if (!cliente) throw new Error('NOT_FOUND: Cliente no encontrado')

    const razonSocial = (body.razonSocial || cliente.razon_social || '').trim()
    const nombreCompleto = (body.nombreCompleto || cliente.nombre_completo || '').trim()
    const cargoResponsable = (body.cargoResponsable ?? cliente.cargo_responsable ?? '').trim()
    const email = (body.email || cliente.email || '').trim().toLowerCase()
    const telefono = (body.telefono ?? cliente.telefono ?? '').trim()
    const direccionLegal = (body.direccionLegal ?? cliente.direccion_legal ?? '').trim()

    if (!razonSocial || !nombreCompleto || !email) {
      throw new Error('Razón social, nombre del responsable y email son obligatorios')
    }

    if (email !== cliente.email.toLowerCase()) {
      const staffDup = await dbClient.queryOne('SELECT email FROM usuario_staff WHERE LOWER(email) = ?', [email])
      const clienteDup = await dbClient.queryOne(
        'SELECT email FROM cliente WHERE LOWER(email) = ? AND id_cliente != ?',
        [email, cliente.id_cliente],
      )
      if (staffDup || clienteDup) {
        throw new Error('DUPLICATE: El email ya se encuentra registrado por otra cuenta')
      }
    }

    await dbClient.execute(
      `UPDATE cliente
       SET
         razon_social = ?,
         nombre_completo = ?,
         cargo_responsable = ?,
         email = ?,
         telefono = ?,
         direccion_legal = ?
       WHERE id_cliente = ?`,
      [
        razonSocial,
        nombreCompleto,
        cargoResponsable || null,
        email,
        telefono || null,
        direccionLegal || null,
        cliente.id_cliente,
      ],
    )

    return {
      razonSocial,
      cuit: cliente.cuit,
      nombreCompleto,
      cargoResponsable,
      email,
      telefono,
      direccionLegal,
    }
  }

  static async changePassword(clientId: number, currentPasswordRaw: string, newPasswordRaw: string) {
    const dbClient = getDatabase()
    const cliente = await dbClient.queryOne('SELECT * FROM cliente WHERE id_cliente = ?', [clientId])
    if (!cliente) throw new Error('NOT_FOUND: Cliente no encontrado')

    const currentPassword = (currentPasswordRaw || '').trim()
    const newPassword = (newPasswordRaw || '').trim()

    if (!currentPassword || !newPassword) {
      throw new Error('Debes completar la contraseña actual y la nueva contraseña')
    }
    if (newPassword.length < 6) {
      throw new Error('La nueva contraseña debe tener al menos 6 caracteres')
    }

    if (!verifyPassword(currentPassword, cliente.password_hash)) {
      throw new Error('La contraseña actual ingresada es incorrecta')
    }

    const newPassHash = hashPassword(newPassword)
    await dbClient.execute('UPDATE cliente SET password_hash = ? WHERE id_cliente = ?', [
      newPassHash,
      cliente.id_cliente,
    ])
  }
}

