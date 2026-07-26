import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { UsersService } from '../../application/services/users.service.js';
import { CreateUserDto } from '../../application/dto/create-user.dto.js';
import { UpdateUserDto } from '../../application/dto/update-user.dto.js';
import { JwtAuthGuard } from '../../../../shared/application/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../../shared/application/guards/permissions.guard.js';
import { RequirePermissions } from '../../../../shared/application/decorators/require-permissions.decorator.js';

/**
 * Admin user management endpoints.
 */
@Controller('admin/users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

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
