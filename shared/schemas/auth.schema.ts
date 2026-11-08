import { z } from 'zod'

export const loginSchema = z.object({
  usernameOrEmail: z.string().min(1, 'El usuario o email es requerido'),
  pass: z.string().min(4, 'La contraseña debe tener al menos 4 caracteres'),
})

export const registerSchema = z
  .object({
    razonSocial: z.string().min(3, 'La razón social es requerida'),
    cuit: z
      .string()
      .regex(/^\d{2}-\d{8}-\d{1}$/, 'Formato CUIT: 00-00000000-0')
      .or(z.string().regex(/^\d{11}$/, 'CUIT debe tener 11 dígitos')),
    nombreCompleto: z.string().min(2, 'El nombre del responsable es requerido'),
    cargoResponsable: z.string().optional(),
    email: z.string().email('Email inválido'),
    telefono: z.string().optional(),
    direccionLegal: z.string().max(100, 'La dirección legal no puede superar los 100 caracteres').optional(),
    fechaAniversario: z.string().optional(),
    pass: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    confirmPass: z.string().min(6, 'Confirmá la contraseña'),
  })
  .refine((d) => d.pass === d.confirmPass, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPass'],
  })

export const forgotPasswordSchema = z.object({
  email: z.string().email('Ingresá un email válido'),
})

export const resetPasswordSchema = z
  .object({
    email: z.string().email('Ingresá un email válido'),
    token: z.string().regex(/^\d{6}$/, 'El código debe tener 6 dígitos'),
    newPass: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    confirmPass: z.string().min(6, 'Confirmá la contraseña'),
  })
  .refine((d) => d.newPass === d.confirmPass, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPass'],
  })

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

