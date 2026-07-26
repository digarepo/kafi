import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '../../../../shared/infrastructure/config/config.service.js';
import { PasswordService } from './password.service.js';
import { PermissionResolver } from './permission-resolver.service.js';
import { UserRepository } from '../ports/user.repository.js';
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
  roles: string[];
  permissions: string[];
  must_change_password: boolean;
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

    return this.issueTokenPair(user);
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

    return this.issueTokenPair(user);
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
      roles: user.roles.map((r) => r.role_code),
      permissions,
      must_change_password: user.must_change_password,
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
  roles: { role_code: string; id: unknown }[];
  must_change_password: boolean;
}

interface TokenPayload {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
  must_change_password: boolean;
  type: 'access' | 'refresh';
}

type AccessTokenPayload = TokenPayload & { type: 'access' };
type RefreshTokenPayload = TokenPayload & { type: 'refresh' };
