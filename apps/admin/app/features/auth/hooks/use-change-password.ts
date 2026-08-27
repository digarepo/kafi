import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import type { ChangePasswordFormValues } from '../types/auth.types';
import { api, ApiError } from '../../../lib/api';

export function useChangePassword() {
  const navigate = useNavigate();

  const onSubmit = useCallback(
    async (values: ChangePasswordFormValues) => {
      try {
        await api.changePassword(values.oldPassword, values.newPassword);
        toast.success('Password changed successfully.');
        navigate(-1);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : 'Failed to change password. Please try again.';
        toast.error(message);
      }
    },
    [navigate],
  );

  return { onSubmit };
}
