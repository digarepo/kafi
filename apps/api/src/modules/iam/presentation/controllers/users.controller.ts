import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Inject,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { UsersService } from '../../application/services/users.service.js';
import { AuthService } from '../../application/services/auth.service.js';
import { CreateUserDto } from '../../application/dto/create-user.dto.js';
import { UpdateUserDto } from '../../application/dto/update-user.dto.js';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import * as schema from '@kafi/database';
import { JwtAuthGuard } from '../../../../shared/application/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../../shared/application/guards/permissions.guard.js';
import { MustChangePasswordGuard } from '../guards/must-change-password.guard.js';
import { RequirePermissions } from '../../../../shared/application/decorators/require-permissions.decorator.js';

/**
 * Admin user management endpoints.
 */
@Controller('admin/users')
@UseGuards(JwtAuthGuard, PermissionsGuard, MustChangePasswordGuard)
export class UsersController {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
    private readonly users: UsersService,
    private readonly auth: AuthService,
  ) {}

  /**
   * Lists staff users.
   */
  @Get()
  @RequirePermissions('USER_VIEW')
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(25), ParseIntPipe) pageSize: number,
  ) {
    return this.users.list(page, pageSize);
  }

  /**
   * Lists active user statuses.
   */
  @Get('statuses')
  @RequirePermissions('USER_VIEW')
  listStatuses() {
    return this.db.query.userStatuses.findMany({
      where: (userStatuses, { eq }) => eq(userStatuses.is_active, true),
      orderBy: (userStatuses, { asc }) => asc(userStatuses.status_code),
    });
  }

  /**
   * Gets a single staff user.
   */
  @Get(':id')
  @RequirePermissions('USER_VIEW')
  get(@Param('id') id: string) {
    return this.users.getById(id);
  }

  /**
   * Re-sends the email verification link to a staff user.
   */
  @Post(':id/resend-verification')
  @RequirePermissions('USER_EDIT')
  async resendVerification(@Param('id') id: string) {
    await this.auth.sendEmailVerification(id);
    return { success: true };
  }

  /**
   * Creates a new staff user.
   */
  @Post()
  @RequirePermissions('USER_CREATE')
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  /**
   * Updates a staff user.
   */
  @Patch(':id')
  @RequirePermissions('USER_EDIT')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }

  /**
   * Soft-deletes a staff user.
   */
  @Delete(':id')
  @RequirePermissions('USER_DELETE')
  delete(@Param('id') id: string) {
    return this.users.delete(id);
  }
}
