import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';
import { AuthService } from './auth.service.js';
import { createTypedId } from '../../../../shared/kernel/typed-id.js';

describe('AuthService mailer flows', () => {
  let service: AuthService;
  let mailer: any;
  let tokens: any;
  let users: any;
  let audit: any;

  beforeEach(() => {
    mailer = {
      sendVerificationEmail: vi.fn(),
      sendPasswordResetEmail: vi.fn(),
    };
    tokens = {
      createEmailVerificationToken: vi.fn(),
      createPasswordResetToken: vi.fn(),
      consumeEmailVerificationToken: vi.fn(),
      consumePasswordResetToken: vi.fn(),
    };
    users = {
      findById: vi.fn(),
      findActiveByEmail: vi.fn(),
      updatePassword: vi.fn(),
      updateLastLogin: vi.fn(),
      verifyEmail: vi.fn(),
    };
    audit = { log: vi.fn() };

    service = new AuthService(
      { signAsync: vi.fn() } as any,
      {
        get: vi.fn().mockReturnValue(''),
        isProduction: vi.fn().mockReturnValue(false),
      } as any,
      users as any,
      { hash: vi.fn(), verify: vi.fn() } as any,
      { resolveForUser: vi.fn() } as any,
      {} as any,
      tokens as any,
      mailer as any,
      audit as any,
    );
  });

  const user = {
    id: createTypedId<'User'>('user-1'),
    employee_number: '0001',
    full_name: 'Test',
    gender: 'M',
    email_address: 'user@example.com',
    phone_number: '+251111111111',
    job_title: null,
    password_hash: 'hash',
    must_change_password: false,
    is_email_verified: false,
    user_status_id: createTypedId<'UserStatus'>('status-1'),
    status_code: 'ACTIVE',
    roles: [],
  };

  describe('sendEmailVerification', () => {
    it('does nothing when the user is already verified', async () => {
      users.findById.mockResolvedValue({
        ...user,
        is_email_verified: true,
      });

      await service.sendEmailVerification('user-1');

      expect(mailer.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('creates a token and sends a verification email', async () => {
      users.findById.mockResolvedValue(user);

      await service.sendEmailVerification('user-1');

      expect(mailer.sendVerificationEmail).toHaveBeenCalledWith(
        'user@example.com',
        expect.stringMatching(/^[a-f0-9]{64}$/),
      );
      const [, plainToken] = mailer.sendVerificationEmail.mock.calls[0];
      const tokenHash = createHash('sha256').update(plainToken).digest('hex');
      expect(tokens.createEmailVerificationToken).toHaveBeenCalledWith(
        user.id,
        tokenHash,
        expect.any(Date),
      );
      expect(audit.log).toHaveBeenCalledWith({
        userId: 'user-1',
        event: 'EMAIL_VERIFICATION_SENT',
      });
    });
  });

  describe('forgotPassword', () => {
    it('does nothing when the user is not found', async () => {
      users.findActiveByEmail.mockResolvedValue(undefined);

      await service.forgotPassword('missing@example.com');

      expect(mailer.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('creates a token and sends a password reset email', async () => {
      users.findActiveByEmail.mockResolvedValue(user);

      await service.forgotPassword('user@example.com');

      expect(mailer.sendPasswordResetEmail).toHaveBeenCalledWith(
        'user@example.com',
        expect.stringMatching(/^[a-f0-9]{64}$/),
      );
      const [, plainToken] = mailer.sendPasswordResetEmail.mock.calls[0];
      const tokenHash = createHash('sha256').update(plainToken).digest('hex');
      expect(tokens.createPasswordResetToken).toHaveBeenCalledWith(
        user.id,
        tokenHash,
        expect.any(Date),
      );
      expect(audit.log).toHaveBeenCalledWith({
        userId: 'user-1',
        event: 'PASSWORD_RESET_REQUESTED',
      });
    });
  });
});
