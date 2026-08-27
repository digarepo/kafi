import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@kafi/ui';

import { api, ApiError } from '../../../lib/api';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialToken = searchParams.get('token') ?? '';
  const [token, setToken] = useState(initialToken);
  const [manualToken, setManualToken] = useState('');
  const [status, setStatus] = useState<
    'idle' | 'verifying' | 'success' | 'error'
  >(initialToken ? 'verifying' : 'idle');
  const [message, setMessage] = useState(
    initialToken ? 'Verifying your email address…' : '',
  );

  const verify = useCallback(
    async (value: string) => {
      setStatus('verifying');
      setMessage('Verifying your email address…');

      try {
        await api.verifyEmail(value);
        setStatus('success');
        setMessage('Your email has been verified. Redirecting to login…');
        setTimeout(() => navigate('/login', { replace: true }), 2000);
      } catch (err) {
        setStatus('error');
        setMessage(
          err instanceof ApiError
            ? err.message
            : 'Failed to verify email. The link may be expired or invalid.',
        );
      }
    },
    [navigate],
  );

  useEffect(() => {
    if (token) {
      verify(token);
    }
  }, [token, verify]);

  const handleManualSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setToken(manualToken.trim());
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>Email verification</CardTitle>
          <CardDescription>
            {status === 'idle'
              ? 'Paste the verification token from your email.'
              : 'We are confirming your email address.'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {status === 'idle' ? (
            <form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
              <Input
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Verification token"
                autoFocus
              />

              <Button type="submit" disabled={!manualToken.trim()}>
                Verify email
              </Button>
            </form>
          ) : (
            <p
              className={
                status === 'error'
                  ? 'text-destructive'
                  : status === 'success'
                    ? 'text-success'
                    : 'text-muted-foreground'
              }
            >
              {message}
            </p>
          )}

          {status === 'error' && (
            <Button
              type="button"
              variant="ghost"
              className="mt-4 w-full text-xs"
              onClick={() => {
                setToken('');
                setManualToken('');
                setStatus('idle');
                setMessage('');
              }}
            >
              Try a different token
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
