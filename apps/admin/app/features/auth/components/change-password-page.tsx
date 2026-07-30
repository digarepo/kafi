import { ChangePasswordForm } from './change-password-form';
import { useChangePassword } from '../hooks/use-change-password';

export function ChangePasswordPage() {
  const { onSubmit, success, error } = useChangePassword();

  return (
    <div className="mx-auto max-w-lg py-8">
      <ChangePasswordForm onSubmit={onSubmit} success={success} error={error} />
    </div>
  );
}
