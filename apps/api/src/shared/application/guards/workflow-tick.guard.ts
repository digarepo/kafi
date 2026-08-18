import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '../../infrastructure/config/config.service.js';
import { Request } from 'express';

/**
 * Guard that protects internal workflow endpoints (e.g. the EasyCron tick)
 * using a shared secret passed via the `x-workflow-tick-secret` header.
 *
 * This is intentionally separate from JWT auth — the cron caller is an
 * external system, not an authenticated admin user.
 */
@Injectable()
export class WorkflowTickGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers['x-workflow-tick-secret'] as
      | string
      | undefined;

    const expected = this.config.get('WORKFLOW_TICK_SECRET');

    if (!provided || provided !== expected) {
      throw new UnauthorizedException('Invalid workflow tick secret');
    }

    return true;
  }
}
