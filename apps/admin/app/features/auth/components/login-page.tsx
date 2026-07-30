import { LoginForm } from './login-form';
import { useLogin } from '../hooks/use-login';

export function LoginPage() {
  const { onSubmit, error } = useLogin();

  return (
    <div className="flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background p-4 md:p-8">
      <div className="flex w-full max-w-4xl flex-col gap-6">
        <div className="flex justify-center">
          <div className="flex items-center gap-3">
            <img src="/KafiDef.svg" alt="Kafi Tours" className="h-10 w-10" />

            <div>
              <h1 className="font-semibold text-accent tracking-wide">
                <span className="text-primary">KAFI</span> TOURS
              </h1>
            </div>
          </div>
        </div>

        <LoginForm onSubmit={onSubmit} error={error} />
      </div>
    </div>
  );
}
