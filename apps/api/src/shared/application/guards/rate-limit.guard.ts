import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';

/**
 * In-memory sliding-window rate limiter.
 *
 * Suitable for a single API instance. For a multi-instance deployment this
 * should be backed by Redis or another shared store.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly windowMs = 60_000;
  private readonly maxRequests = 10;
  private readonly requests = new Map<string, number[]>();

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const ip = ((req.ip ?? req.socket?.remoteAddress) as string) ?? 'unknown';
    const path = (req.route?.path ?? req.path ?? 'unknown') as string;
    const key = `${ip}:${path}`;

    const now = Date.now();
    const timestamps = this.requests.get(key) ?? [];
    const withinWindow = timestamps.filter((t) => now - t < this.windowMs);

    if (withinWindow.length >= this.maxRequests) {
      throw new HttpException('Too many requests', 429);
    }

    withinWindow.push(now);
    this.requests.set(key, withinWindow);

    return true;
  }
}
