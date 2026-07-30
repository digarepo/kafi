import { isValidPhoneNumber } from 'libphonenumber-js';
import { z } from 'zod';

import type { UserFormMode } from '../types/users.types';

export const userFormSchema = (mode: UserFormMode) =>
  z.object({
    employee_number:
      mode === 'create'
        ? z.string().min(1, 'Employee number is required')
        : z.string().optional(),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.email('Enter a valid email address'),
    phone: z.string().refine(
      (v) => isValidPhoneNumber(v, 'ET'),
      'Enter a valid phone number',
    ),
    job_title: z.string(),
    gender: z.enum(['Male', 'Female']),
    role_id: z.string().min(1, 'Select a role'),
    user_status_id:
      mode === 'edit'
        ? z.string().min(1, 'Select a status')
        : z.string().optional(),
  });

export type UserFormSchema = z.infer<ReturnType<typeof userFormSchema>>;
