import { useState } from 'react';
import { useSearchParams } from 'react-router';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@kafi/ui';

import { ResetPasswordForm } from './reset-password-form';
import { useResetPassword } from '../hooks/use-reset-password';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const initialToken = searchParams.get('token') ?? '';
  const [token, setToken] = useState(initialToken);
  const [manualToken, setManualToken] = useState('');
  const { onSubmit, error } = useResetPassword(token);

  const handleManualTokenSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setToken(manualToken.trim());
  };

  const clearToken = () => {
    setToken('');
    setManualToken('');
  };

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

        {token ? (
          <div className="space-y-4">
            <ResetPasswordForm onSubmit={onSubmit} error={error} />

            <Button
              type="button"
              variant="ghost"
              className="w-full text-xs"
              onClick={clearToken}
            >
              Use a different reset token
            </Button>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Reset password</CardTitle>
              <CardDescription>
                Paste the reset token from your email to continue.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form
                onSubmit={handleManualTokenSubmit}
                className="flex flex-col gap-4"
              >
                <Input
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Reset token"
                  autoFocus
                />

                <Button type="submit" disabled={!manualToken.trim()}>
                  Continue
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
