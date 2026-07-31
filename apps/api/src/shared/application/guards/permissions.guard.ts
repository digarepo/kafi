import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator.js';
import { AuthenticatedUser } from '../../kernel/principal.js';

/**
 * Guard that enforces permission requirements declared with @RequirePermissions.
 *
 * The user's permission codes are read from the JWT payload attached by
 * JwtAuthGuard. Permission resolution is computed at login/refresh time.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const hasPermission = required.every((permission) => user.permissions.includes(permission));
    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
