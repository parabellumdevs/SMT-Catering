/**
 * mailer.ts — Servicio de envío de correos electrónicos transaccionales con Nodemailer.
 */
import nodemailer from 'nodemailer'

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

function getTransporter() {
  const user = (process.env.SMTP_USER || '').trim()
  const pass = (process.env.SMTP_PASS || '').trim()

  if (!user || !pass) {
    return null
  }

  const host = (process.env.SMTP_HOST || 'smtp-relay.brevo.com').trim()
  const port = Number(process.env.SMTP_PORT) || 587
  const secure = port === 465

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  })
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  const transporter = getTransporter()

  if (!transporter) {
    return false
  }

  try {
    const fromAddress =
      process.env.SMTP_FROM ||
      `"SMT Catering" <${process.env.SMTP_USER || 'smtcatering.notificaciones@outlook.com'}>`

    await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
    })

    console.log(`[EMAIL ENVIADO] Correo enviado exitosamente a: ${to}`)
    return true
  } catch (error) {
    console.warn('[SMTP ERROR] Falló el envío de correo mediante Nodemailer:', error)
    return false
  }
}

/**
 * Envía el correo de recuperación de contraseña con código/token temporal.
 */
export async function sendPasswordResetEmail(toEmail: string, token: string): Promise<void> {
  const emailSent = await sendEmail({
    to: toEmail,
    subject: 'Recuperación de contraseña — SMT Catering',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
        <div style="margin-bottom: 24px;">
          <span style="font-size: 20px; font-weight: 700; color: #003770; letter-spacing: -0.5px;">SMT Catering</span>
        </div>
        <h1 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 12px 0;">Recuperación de contraseña</h1>
        <p style="font-size: 14px; line-height: 20px; color: #4b5563; margin: 0 0 20px 0;">
          Recibimos una solicitud para restablecer la contraseña de tu cuenta empresarial en SMT Catering.
        </p>
        <p style="font-size: 14px; line-height: 20px; color: #4b5563; margin: 0 0 10px 0;">
          Tu código de verificación es:
        </p>
        <div style="background-color: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; text-align: center; margin: 0 0 20px 0;">
          <span style="font-family: 'SF Pro Mono', Monaco, Consolas, monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #003770; display: inline-block;">${token}</span>
        </div>
        <p style="font-size: 13px; line-height: 18px; color: #6b7280; margin: 0 0 24px 0;">
          Este código es válido por <strong>10 minutos</strong> y solo puede ser utilizado una vez. Si vos no solicitaste este cambio, podés ignorar este mensaje de forma segura.
        </p>
        <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 0 0 16px 0;" />
        <p style="font-size: 12px; color: #9ca3af; margin: 0;">
          SMT Catering — Sistema de Gestión Gastronómica
        </p>
      </div>
    `,
  })

  // En desarrollo (o si falló el envío) mostramos el código en consola para agilizar pruebas.
  // En producción no se loguea si el email salió bien, para no exponer códigos en los logs de Vercel.
  if (!emailSent || process.env.NODE_ENV !== 'production') {
    console.log(`\n🔑 [RESET PASSWORD] Token para ${toEmail}: ${token} (Email enviado: ${emailSent ? 'SÍ' : 'NO'})\n`)
  }
}