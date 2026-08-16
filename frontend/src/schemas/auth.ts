import { z } from 'zod';
import type { Dictionary } from '@/i18n';

/**
 * Schemas are built from the active dictionary so a shopper on /ar sees Arabic
 * validation errors. They mirror the server-side class-validator rules — client
 * validation is a UX affordance only, the API re-validates everything.
 */
export function buildLoginSchema(t: Dictionary) {
  return z.object({
    email: z.string().min(1, t.validation.emailRequired).email(t.validation.emailInvalid),
    password: z.string().min(1, t.validation.passwordRequired),
  });
}

export function buildRegisterSchema(t: Dictionary) {
  return z
    .object({
      firstName: z.string().trim().min(2, t.validation.firstNameMin).max(50),
      lastName: z.string().trim().min(2, t.validation.lastNameMin).max(50),
      email: z.string().min(1, t.validation.emailRequired).email(t.validation.emailInvalid),
      phone: z
        .string()
        .trim()
        .regex(/^[+\d][\d\s-]{6,19}$/, t.validation.phoneInvalid)
        .optional()
        .or(z.literal('')),
      password: z
        .string()
        .min(8, t.validation.passwordMin)
        .max(72)
        .regex(/[a-z]/, t.validation.passwordLower)
        .regex(/[A-Z]/, t.validation.passwordUpper)
        .regex(/\d/, t.validation.passwordNumber),
      confirmPassword: z.string(),
    })
    .refine((values) => values.password === values.confirmPassword, {
      message: t.validation.passwordMismatch,
      path: ['confirmPassword'],
    });
}

export type LoginInput = z.infer<ReturnType<typeof buildLoginSchema>>;
export type RegisterInput = z.infer<ReturnType<typeof buildRegisterSchema>>;
