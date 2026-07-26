import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from '../../application/services/auth.service.js';
import { LoginDto } from '../../application/dto/login.dto.js';
import { RefreshDto } from '../../application/dto/refresh.dto.js';
import { JwtAuthGuard } from '../../../../shared/application/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../../shared/application/decorators/current-user.decorator.js';
import { AuthenticatedUser } from '../../../../shared/kernel/principal.js';

/**
 * Public authentication endpoints.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /**
   * Authenticates a user and returns access/refresh tokens.
   *
   * @param dto - Login credentials.
   * @returns Authentication response.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  /**
   * Refreshes an access token pair from a valid refresh token.
   *
   * @param dto - Refresh token.
   * @returns Authentication response.
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refresh_token);
  }

  /**
   * Returns the currently authenticated user's profile.
   *
   * @param user - Authenticated user principal.
   * @returns User profile.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.me(user.sub as string);
  }
}
