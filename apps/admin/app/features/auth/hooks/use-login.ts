import { useCallback, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import type { LoginFormValues } from '../types/auth.types';
import { api, ApiError } from '../../../lib/api';

function getSafeRedirect(value: string | null): string {
  if (!value) {
    return '/';
  }

  const decoded = decodeURIComponent(value);
  if (!decoded.startsWith('/') || decoded.startsWith('//')) {
    return '/';
  }

  return decoded;
}

export function useLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const redirectTo = getSafeRedirect(searchParams.get('redirect'));

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

        navigate(redirectTo, { replace: true });
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : 'Login failed. Please check your credentials and try again.';
        setError(message);
      }
    },
    [navigate, redirectTo],
  );

  return { onSubmit, error };
}
