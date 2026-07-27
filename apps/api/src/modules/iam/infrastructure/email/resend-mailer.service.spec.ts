import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResendMailer } from './resend-mailer.service.js';

const mailer = new ResendMailer({
  apiKey: 're_test-key',
  from: 'Kafi <noreply@kafitour.com>',
  appUrl: 'https://kafi.app',
});

function getLastFetchBody(): Record<string, string> {
  const fetchMock = (globalThis as any).fetch;
  const calls = fetchMock?.mock?.calls;
  if (!calls?.length) {
    return {};
  }
  return JSON.parse(calls[calls.length - 1][1].body);
}

describe('ResendMailer', () => {
  beforeEach(() => {
    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '',
    });
  });

  it('sends a verification email with the correct link', async () => {
    await mailer.sendVerificationEmail('user@example.com', 'verif-token');
    const body = getLastFetchBody();

    expect(body.to).toBe('user@example.com');
    expect(body.from).toBe('Kafi <noreply@kafitour.com>');
    expect(body.subject).toBe('Verify your email');
    expect(body.text).toContain(
      'https://kafi.app/verify-email?token=verif-token',
    );
  });

  it('sends a password reset email with the correct link', async () => {
    await mailer.sendPasswordResetEmail('user@example.com', 'reset-token');
    const body = getLastFetchBody();

    expect(body.text).toContain(
      'https://kafi.app/reset-password?token=reset-token',
    );
  });

  it('strips trailing slashes from the app URL', async () => {
    const localMailer = new ResendMailer({
      apiKey: 're_test-key',
      from: 'Kafi <noreply@kafitour.com>',
      appUrl: 'https://kafi.app/',
    });

    await localMailer.sendVerificationEmail('user@example.com', 'token');
    const body = getLastFetchBody();

    expect(body.text).toContain('https://kafi.app/verify-email?token=token');
  });

  it('throws when Resend responds with an error', async () => {
    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => 'Unauthorized',
    });

    await expect(
      mailer.sendVerificationEmail('user@example.com', 'token'),
    ).rejects.toThrow('Resend API error');
  });
});
