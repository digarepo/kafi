import { useCallback, useState } from 'react';

import type { ForgotPasswordFormValues } from '../types/auth.types';
import { api, ApiError } from '../../../lib/api';

export function useForgotPassword() {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = useCallback(async (values: ForgotPasswordFormValues) => {
    setError(null);
    setSuccess(false);

    try {
      // The backend always returns 200 even if the email is not registered,
      // so we show the same generic success message either way.
      await api.forgotPassword(values.email);
      setSuccess(true);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Failed to send reset link. Please try again.';
      setError(message);
    }
  }, []);

  return { onSubmit, success, error };
}
