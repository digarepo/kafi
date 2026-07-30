import { z } from 'zod';

function passwordMeetsRequirements(value: string) {
  const hasUpperAndLower = /[a-z]/.test(value) && /[A-Z]/.test(value);
  const hasNumberOrSpecial = /\d/.test(value) || /[^A-Za-z0-9]/.test(value);
  return value.length >= 8 && hasUpperAndLower && hasNumberOrSpecial;
}

export const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Password must contain at least 8 characters')
      .refine(passwordMeetsRequirements, {
        message:
          'Password must contain uppercase and lowercase letters and at least one number or special character',
      }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;
