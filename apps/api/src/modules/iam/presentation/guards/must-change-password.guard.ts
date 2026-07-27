import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class MustChangePasswordGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<{
      user?: { must_change_password?: boolean };
    }>();

    if (req.user?.must_change_password) {
      throw new ForbiddenException(
        'You must change your password before accessing this resource',
      );
    }

    return true;
  }
}
