import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { ConfigService } from '../../../../shared/infrastructure/config/config.service.js';
import { PasswordService } from './password.service.js';
import { PermissionResolver } from './permission-resolver.service.js';
import { UserRepository } from '../ports/user.repository.js';
import { RefreshTokenRepository } from '../ports/refresh-token.repository.js';
import { OneTimeTokenRepository } from '../ports/one-time-token.repository.js';
import { Mailer } from '../ports/mailer.port.js';
import { AuditLogger } from './audit-logger.service.js';
import { createTypedId } from '../../../../shared/kernel/typed-id.js';

/**
 * Token pair returned on successful authentication.
 */
export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

/**
 * Authenticated user profile returned with tokens.
 */
export interface AuthProfile {
  id: string;
  email: string;
  full_name: string;
  phone_number: string;
  status_code: string;
  roles: string[];
  permissions: string[];
  must_change_password: boolean;
  created_at: string;
  last_login_at: string | null;
}

/**
 * Authentication response returned by login and refresh endpoints.
 */
export interface AuthResponse {
  user: AuthProfile;
  tokens: TokenPair;
}

/**
 * Service responsible for login, token refresh, and profile retrieval.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly users: UserRepository,
    private readonly password: PasswordService,
    private readonly permissionResolver: PermissionResolver,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly tokens: OneTimeTokenRepository,
    private readonly mailer: Mailer,
    private readonly audit: AuditLogger,
  ) {}

  /**
   * Authenticates a user and issues a new token pair.
   *
   * @param email - Normalized email address.
   * @param password - Plain-text password.
   * @returns Authentication response.
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await this.users.findActiveByEmail(email);

    if (!user || user.status_code !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await this.password.verify(user.password_hash, password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.users.updateLastLogin(user.id);

    const response = await this.issueTokenPair(user);
    await this.audit.log({ userId: user.id as string, event: 'LOGIN' });
    return response;
  }

  /**
   * Verifies a refresh token and issues a new token pair.
   *
   * @param refreshToken - Refresh token string.
   * @returns Authentication response.
   */
  async refresh(refreshToken: string): Promise<AuthResponse> {
    let payload: RefreshTokenPayload;
    try {
      payload = this.jwt.verify<RefreshTokenPayload>(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.users.findById(createTypedId<'User'>(payload.sub));
    if (!user || user.status_code !== 'ACTIVE') {
      throw new UnauthorizedException('User no longer active');
    }

    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    if (await this.refreshTokens.isBlocked(tokenHash)) {
      throw new UnauthorizedException('Token has been revoked');
    }

    const expiresAt = payload.exp ? new Date(payload.exp * 1000) : new Date();
    await this.refreshTokens.block(
      tokenHash,
      createTypedId<'User'>(payload.sub),
      expiresAt,
    );

    const response = await this.issueTokenPair(user);
    await this.audit.log({ userId: user.id as string, event: 'REFRESH' });
    return response;
  }

  /**
   * Builds the current user's profile from the repository.
   *
   * @param userId - User typed id.
   * @returns Authentication profile.
   */
  async me(userId: string): Promise<AuthProfile> {
    const user = await this.users.findById(createTypedId<'User'>(userId));
    if (!user) {
      throw new UnauthorizedException();
    }

    const permissions = await this.permissionResolver.resolveForUser(
      user.roles.map((r) => r.id as string),
    );

    return this.toProfile(user, permissions);
  }

  /**
   * Updates the authenticated user's own full name and phone number.
   *
   * @param userId - Authenticated user id.
   * @param full_name - New full name.
   * @param phone_number - New phone number.
   * @returns Updated profile.
   */
  async updateProfile(
    userId: string,
    full_name: string,
    phone_number: string,
  ): Promise<AuthProfile> {
    await this.users.update(createTypedId<'User'>(userId), {
      full_name,
      phone_number,
    });
    await this.audit.log({
      userId,
      event: 'PROFILE_UPDATED',
      details: `full_name: ${full_name}, phone_number: ${phone_number}`,
    });
    return this.me(userId);
  }

  /**
   * Changes a user's password and returns a fresh token pair.
   *
   * @param userId - Authenticated user id.
   * @param oldPassword - Current password.
   * @param newPassword - New password.
   * @returns New authentication response.
   */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<AuthResponse> {
    const user = await this.users.findById(createTypedId<'User'>(userId));
    if (!user) {
      throw new UnauthorizedException();
    }

    const valid = await this.password.verify(user.password_hash, oldPassword);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const newHash = await this.password.hash(newPassword);
    await this.users.updatePassword(user.id, newHash, false);
    await this.users.updateLastLogin(user.id);

    const response = await this.issueTokenPair(user);
    await this.audit.log({
      userId: user.id as string,
      event: 'CHANGE_PASSWORD',
    });
    return response;
  }

  /**
   * Revokes a refresh token so it can no longer be used.
   *
   * @param refreshToken - Refresh token to revoke.
   */
  async logout(refreshToken: string): Promise<void> {
    let payload: RefreshTokenPayload;
    try {
      payload = this.jwt.verify<RefreshTokenPayload>(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = payload.exp ? new Date(payload.exp * 1000) : new Date();
    await this.refreshTokens.block(
      tokenHash,
      createTypedId<'User'>(payload.sub),
      expiresAt,
    );

    await this.audit.log({ userId: payload.sub, event: 'LOGOUT' });
  }

  /**
   * Generates and e-mails an email verification token.
   *
   * @param userId - Authenticated user id.
   */
  async sendEmailVerification(userId: string): Promise<void> {
    const user = await this.users.findById(createTypedId<'User'>(userId));
    if (!user || user.is_email_verified) {
      return;
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.tokens.createEmailVerificationToken(
      user.id,
      tokenHash,
      expiresAt,
    );
    await this.mailer.sendVerificationEmail(user.email_address, token);
    await this.audit.log({
      userId: user.id as string,
      event: 'EMAIL_VERIFICATION_SENT',
    });
  }

  /**
   * Verifies an email using a one-time token.
   *
   * @param token - Plain token from the verification e-mail.
   */
  async verifyEmail(token: string): Promise<void> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const userId = await this.tokens.consumeEmailVerificationToken(tokenHash);
    if (!userId) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    await this.users.verifyEmail(createTypedId<'User'>(userId));
    await this.audit.log({ userId, event: 'EMAIL_VERIFIED' });
  }

  /**
   * Generates and e-mails a password reset token.
   *
   * @param email - Normalized email address.
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.users.findActiveByEmail(email);
    if (!user) {
      return;
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.tokens.createPasswordResetToken(user.id, tokenHash, expiresAt);
    await this.mailer.sendPasswordResetEmail(user.email_address, token);
    await this.audit.log({
      userId: user.id as string,
      event: 'PASSWORD_RESET_REQUESTED',
    });
  }

  /**
   * Resets a user's password using a one-time token.
   *
   * @param token - Plain token from the reset e-mail.
   * @param newPassword - New plain-text password.
   * @returns Authentication response.
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<AuthResponse> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const userId = await this.tokens.consumePasswordResetToken(tokenHash);
    if (!userId) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const user = await this.users.findById(createTypedId<'User'>(userId));
    if (!user || user.status_code !== 'ACTIVE') {
      throw new UnauthorizedException('User no longer active');
    }

    const newHash = await this.password.hash(newPassword);
    await this.users.updatePassword(user.id, newHash, false);
    await this.users.updateLastLogin(user.id);

    const response = await this.issueTokenPair(user);
    await this.audit.log({
      userId: user.id as string,
      event: 'PASSWORD_RESET_COMPLETED',
    });
    return response;
  }

  private async issueTokenPair(
    user: Awaited<ReturnType<UserRepository['findActiveByEmail']>> & {},
  ): Promise<AuthResponse> {
    const roleCodes = user.roles.map((r) => r.role_code);
    const permissions = await this.permissionResolver.resolveForUser(
      user.roles.map((r) => r.id as string),
    );
    const profile = this.toProfile(user, permissions);

    const accessPayload: AccessTokenPayload = {
      sub: user.id as string,
      email: user.email_address,
      roles: roleCodes,
      permissions,
      must_change_password: user.must_change_password,
      type: 'access',
    };

    const refreshPayload: RefreshTokenPayload = {
      ...accessPayload,
      type: 'refresh',
    };

    const accessExpiresIn = this.parseExpiry(
      this.config.get('JWT_ACCESS_EXPIRY'),
    );
    const refreshExpiresIn = this.parseExpiry(
      this.config.get('JWT_REFRESH_EXPIRY'),
    );

    const [access_token, refresh_token] = await Promise.all([
      this.jwt.signAsync(accessPayload, {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: accessExpiresIn,
      }),
      this.jwt.signAsync(refreshPayload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: refreshExpiresIn,
      }),
    ]);

    return {
      user: profile,
      tokens: {
        access_token,
        refresh_token,
        expires_in: accessExpiresIn,
      },
    };
  }

  private toProfile(user: UserShape, permissions: string[]): AuthProfile {
    return {
      id: user.id as string,
      email: user.email_address,
      full_name: user.full_name,
      phone_number: user.phone_number,
      status_code: user.status_code,
      roles: user.roles.map((r) => r.role_code),
      permissions,
      must_change_password: user.must_change_password,
      created_at: user.created_at.toISOString(),
      last_login_at: user.last_login_at?.toISOString() ?? null,
    };
  }

  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 1800;
    }

    const value = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    return value * (multipliers[unit] ?? 1);
  }
}

interface UserShape {
  id: unknown;
  email_address: string;
  full_name: string;
  phone_number: string;
  status_code: string;
  created_at: Date;
  last_login_at: Date | null;
  roles: { role_code: string; id: unknown }[];
  must_change_password: boolean;
}

interface TokenPayload {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
  must_change_password: boolean;
  exp?: number;
  type: 'access' | 'refresh';
}

type AccessTokenPayload = TokenPayload & { type: 'access' };
type RefreshTokenPayload = TokenPayload & { type: 'refresh' };
