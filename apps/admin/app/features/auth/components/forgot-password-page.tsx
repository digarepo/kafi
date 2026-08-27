import { ForgotPasswordForm } from './forgot-password-form';
import { useForgotPassword } from '../hooks/use-forgot-password';

export function ForgotPasswordPage() {
  const { onSubmit } = useForgotPassword();

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6 md:p-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <div className="flex items-center gap-3">
            <img src="/KafiDef.svg" alt="Kafi Tours" className="h-10 w-10" />

            <div>
              <h1 className="font-semibold tracking-wide">
                <span className="text-primary">KAFI</span> TOURS
              </h1>
            </div>
          </div>
        </div>

        <ForgotPasswordForm onSubmit={onSubmit} />
      </div>
    </div>
  );
}
