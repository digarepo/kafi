import { ChangePasswordForm } from './change-password-form';
import { useChangePassword } from '../hooks/use-change-password';

export function ChangePasswordPage() {
  const { onSubmit } = useChangePassword();

  return (
    <div className="mx-auto max-w-lg py-8 min-w-full min-h-screen flex justify-center items-center">
      <ChangePasswordForm onSubmit={onSubmit} />
    </div>
  );
}
