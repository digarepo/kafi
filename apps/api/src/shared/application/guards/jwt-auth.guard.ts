import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Route guard that validates JWT access tokens.
 *
 * Unauthorized requests receive a 401 response.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(
    err: Error | null,
    user: TUser | false,
    _info: unknown,
  ): TUser {
    if (err || !user) {
      throw err ?? new UnauthorizedException();
    }

    return user as TUser;
  }
}
