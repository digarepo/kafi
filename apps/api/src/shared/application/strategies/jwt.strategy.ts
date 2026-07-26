import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '../../infrastructure/config/config.service.js';
import { AuthenticatedUser } from '../../kernel/principal.js';
import { createTypedId } from '../../kernel/typed-id.js';

/**
 * Payload shape of a valid access token.
 */
interface AccessTokenPayload {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
  must_change_password: boolean;
  type: 'access';
}

/**
 * Passport JWT strategy that validates access tokens and attaches an
 * AuthenticatedUser to the request.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET'),
    });
  }

  /**
   * Converts a verified JWT payload into the application user principal.
   *
   * @param payload - Verified JWT payload.
   * @returns Authenticated user principal.
   */
  validate(payload: AccessTokenPayload): AuthenticatedUser {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    return {
      sub: createTypedId<'User'>(payload.sub),
      email: payload.email,
      roles: payload.roles ?? [],
      permissions: payload.permissions ?? [],
      must_change_password: payload.must_change_password ?? false,
    };
  }
}
