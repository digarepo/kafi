import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';
import { AuthService } from './auth.service.js';
import { createTypedId } from '../../../../shared/kernel/typed-id.js';

const user = {
  id: createTypedId<'User'>('user-1'),
  employee_number: '0001',
  full_name: 'Test User',
  gender: 'Male',
  email_address: 'user@example.com',
  phone_number: '+251111111111',
  job_title: null,
  password_hash: 'hash',
  must_change_password: false,
  is_email_verified: true,
  user_status_id: createTypedId<'UserStatus'>('status-1'),
  status_code: 'ACTIVE',
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  last_login_at: null,
  roles: [
    {
      id: createTypedId<'Role'>('role-1'),
      role_code: 'ADMIN',
      name: 'Admin',
    },
  ],
};

describe('AuthService login and refresh', () => {
  let service: AuthService;
  let users: any;
  let password: any;
  let jwt: any;
  let config: any;
  let permissions: any;
  let refreshTokens: any;
  let audit: any;

  beforeEach(() => {
    users = {
      findActiveByEmail: vi.fn(),
      findById: vi.fn(),
      updateLastLogin: vi.fn(),
    };
    password = { verify: vi.fn(), hash: vi.fn() };
    jwt = {
      signAsync: vi.fn().mockResolvedValue('token'),
      verify: vi.fn(),
    };
    config = {
      get: vi.fn((key: string) => {
        if (key.includes('SECRET')) return 'secret';
        if (key.includes('EXPIRY')) return '30m';
        return '';
      }),
      isProduction: vi.fn().mockReturnValue(false),
    };
    permissions = { resolveForUser: vi.fn().mockResolvedValue(['USER_VIEW']) };
    refreshTokens = {
      isBlocked: vi.fn().mockResolvedValue(false),
      block: vi.fn().mockResolvedValue(undefined),
    };
    audit = { log: vi.fn() };

    service = new AuthService(
      jwt as any,
      config as any,
      users as any,
      password as any,
      permissions as any,
      refreshTokens as any,
      {} as any,
      {} as any,
      audit as any,
    );
  });

  describe('login', () => {
    it('returns tokens and a profile when credentials are valid', async () => {
      users.findActiveByEmail.mockResolvedValue(user);
      password.verify.mockResolvedValue(true);

      const result = await service.login('user@example.com', 'password');

      expect(result.user.email).toBe('user@example.com');
      expect(result.user.full_name).toBe('Test User');
      expect(result.tokens.access_token).toBe('token');
      expect(result.tokens.refresh_token).toBe('token');
      expect(users.updateLastLogin).toHaveBeenCalledWith(user.id);
      expect(audit.log).toHaveBeenCalledWith({
        userId: 'user-1',
        event: 'LOGIN',
      });
    });

    it('throws when the user is not found', async () => {
      users.findActiveByEmail.mockResolvedValue(undefined);

      await expect(
        service.login('missing@example.com', 'password'),
      ).rejects.toThrow('Invalid credentials');
    });

    it('throws when the password is invalid', async () => {
      users.findActiveByEmail.mockResolvedValue(user);
      password.verify.mockResolvedValue(false);

      await expect(service.login('user@example.com', 'wrong')).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('throws when the user is not active', async () => {
      users.findActiveByEmail.mockResolvedValue({
        ...user,
        status_code: 'INACTIVE',
      });

      await expect(
        service.login('user@example.com', 'password'),
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('refresh', () => {
    it('returns a new token pair for a valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
      jwt.verify.mockReturnValue({
        sub: 'user-1',
        type: 'refresh',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      users.findById.mockResolvedValue(user);

      const result = await service.refresh(refreshToken);

      expect(result.user.email).toBe('user@example.com');
      expect(result.tokens.access_token).toBe('token');
      expect(refreshTokens.isBlocked).toHaveBeenCalledWith(tokenHash);
    });

    it('throws for an invalid refresh token', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(service.refresh('bad')).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('throws when the token is blocked', async () => {
      jwt.verify.mockReturnValue({
        sub: 'user-1',
        type: 'refresh',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      users.findById.mockResolvedValue(user);
      refreshTokens.isBlocked.mockResolvedValue(true);

      await expect(service.refresh('blocked')).rejects.toThrow(
        'Token has been revoked',
      );
    });
  });
});
