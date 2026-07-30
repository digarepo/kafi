import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';

import type { LoginFormValues } from '../types/auth.types';
import { api, ApiError } from '../../../lib/api';

export function useLogin() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = useCallback(
    async (values: LoginFormValues) => {
      setError(null);

      try {
        const response = await api.login(
          values.email,
          values.password,
          values.remember,
        );

        if (response.user.must_change_password) {
          navigate('/change-password', { replace: true });
          return;
        }

        navigate('/', { replace: true });
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : 'Login failed. Please check your credentials and try again.';
        setError(message);
      }
    },
    [navigate],
  );

  return { onSubmit, error };
}
