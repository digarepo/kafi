import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import type { ResetPasswordFormValues } from '../types/auth.types';
import { api, ApiError } from '../../../lib/api';

export function useResetPassword(token: string) {
  const navigate = useNavigate();

  const onSubmit = useCallback(
    async (values: ResetPasswordFormValues) => {
      try {
        await api.resetPassword(token, values.newPassword);
        toast.success('Password reset successfully.');
        navigate('/login', { replace: true });
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : 'Failed to reset password. Please try again.';
        toast.error(message);
      }
    },
    [navigate, token],
  );

  return { onSubmit, token };
}
