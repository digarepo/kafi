import { useCallback } from 'react';
import { toast } from 'sonner';

import type { ForgotPasswordFormValues } from '../types/auth.types';
import { api, ApiError } from '../../../lib/api';

export function useForgotPassword() {
  const onSubmit = useCallback(async (values: ForgotPasswordFormValues) => {
    try {
      await api.forgotPassword(values.email);
      toast.success(
        'If an account exists for that email, a password reset link has been sent.',
      );
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Failed to send reset link. Please try again.';
      toast.error(message);
    }
  }, []);

  return { onSubmit };
}
