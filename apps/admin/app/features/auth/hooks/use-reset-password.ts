import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';

import type { ResetPasswordFormValues } from '../types/auth.types';
import { api, ApiError } from '../../../lib/api';

export function useResetPassword(token: string) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = useCallback(
    async (values: ResetPasswordFormValues) => {
      setError(null);

      try {
        await api.resetPassword(token, values.newPassword);
        navigate('/', { replace: true });
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : 'Failed to reset password. Please try again.';
        setError(message);
      }
    },
    [navigate, token],
  );

  return { onSubmit, error, token };
}
