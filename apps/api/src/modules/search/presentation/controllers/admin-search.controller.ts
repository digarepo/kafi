import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { JwtAuthGuard } from '../../../../shared/application/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../../shared/application/guards/permissions.guard.js';
import { CurrentUser } from '../../../../shared/application/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../../shared/kernel/principal.js';
import { SearchService } from '../../application/services/search.service.js';

/**
 * Global cross-entity search endpoint for the admin command palette.
 *
 * Any authenticated user may call the endpoint; the service filters results
 * by the caller's permissions so unauthorized entities are never returned.
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminSearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('search')
  search(@Query('q') q: string, @CurrentUser() user: AuthenticatedUser) {
    const parsed = z
      .string()
      .trim()
      .max(100)
      .safeParse(q ?? '');
    return this.searchService.search(parsed.success ? parsed.data : '', user);
  }
}
