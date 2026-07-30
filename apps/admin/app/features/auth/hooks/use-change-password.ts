import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';

import type { ChangePasswordFormValues } from '../types/auth.types';
import { api, ApiError } from '../../../lib/api';

export function useChangePassword() {
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = useCallback(
    async (values: ChangePasswordFormValues) => {
      setError(null);
      setSuccess(false);

      try {
        await api.changePassword(values.oldPassword, values.newPassword);
        setSuccess(true);
        setTimeout(() => navigate('/', { replace: true }), 1500);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : 'Failed to change password. Please try again.';
        setError(message);
      }
    },
    [navigate],
  );

  return { onSubmit, success, error };
}
