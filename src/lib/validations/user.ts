import { z } from 'zod'
import { UserRole } from '@prisma/client'

export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Minimum 8 caractères'),
})

export const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string()
    .min(8, 'Minimum 8 caractères')
    .regex(/[A-Z]/, 'Au moins une majuscule')
    .regex(/[0-9]/, 'Au moins un chiffre')
    .regex(/[^A-Za-z0-9]/, 'Au moins un caractère spécial'),
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  organizationName: z.string().min(2).max(100),
})

export const updateUserSchema = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  avatarUrl: z.string().url().optional(),
  role: z.nativeEnum(UserRole).optional(),
})

export const updateEmployeeSchema = z.object({
  jobTitle: z.string().max(100).optional(),
  jobLevel: z.string().max(50).optional(),
  departmentId: z.string().cuid().optional(),
  managerId: z.string().cuid().optional(),
  siteLocation: z.string().max(100).optional(),
  contractType: z.string().max(50).optional(),
  hireDate: z.coerce.date().optional(),
})

export const resetPasswordSchema = z.object({
  email: z.string().email(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[0-9]/)
    .regex(/[^A-Za-z0-9]/),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>
