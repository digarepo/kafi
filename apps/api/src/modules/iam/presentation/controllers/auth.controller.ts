import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from '../../application/services/auth.service.js';
import { LoginDto } from '../../application/dto/login.dto.js';
import { RefreshDto } from '../../application/dto/refresh.dto.js';
import { ChangePasswordDto } from '../../application/dto/change-password.dto.js';
import { LogoutDto } from '../../application/dto/logout.dto.js';
import { UpdateProfileDto } from '../../application/dto/update-profile.dto.js';
import { VerifyEmailDto } from '../../application/dto/verify-email.dto.js';
import { ForgotPasswordDto } from '../../application/dto/forgot-password.dto.js';
import { ResetPasswordDto } from '../../application/dto/reset-password.dto.js';
import { JwtAuthGuard } from '../../../../shared/application/guards/jwt-auth.guard.js';
import { RateLimitGuard } from '../../../../shared/application/guards/rate-limit.guard.js';
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
  @UseGuards(RateLimitGuard)
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
  @UseGuards(RateLimitGuard)
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refresh_token);
  }

  /**
   * Revokes the provided refresh token.
   *
   * @param dto - Refresh token to revoke.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Body() dto: LogoutDto) {
    return this.auth.logout(dto.refresh_token);
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

  /**
   * Updates the authenticated user's own profile.
   *
   * @param user - Authenticated user principal.
   * @param dto - Profile update data.
   * @returns Updated profile.
   */
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.auth.updateProfile(
      user.sub as string,
      dto.full_name,
      dto.phone_number,
    );
  }

  /**
   * Verifies a user's email address with a one-time token.
   *
   * @param dto - Verification token.
   */
  @Post('verify-email')
  @UseGuards(RateLimitGuard)
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto.token);
  }

  /**
   * Re-sends an email verification link to the authenticated user.
   *
   * @param user - Authenticated user principal.
   */
  @Post('resend-verification')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  resendVerification(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.sendEmailVerification(user.sub as string);
  }

  /**
   * Requests a password reset link for an email address.
   *
   * @param dto - Email address.
   */
  @Post('forgot-password')
  @UseGuards(RateLimitGuard)
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  /**
   * Resets a user's password using a one-time token.
   *
   * @param dto - Reset token and new password.
   */
  @UseGuards(RateLimitGuard)
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.new_password);
  }

  /**
   * Changes the authenticated user's password.
   *
   * @param user - Authenticated user principal.
   * @param dto - Password change data.
   * @returns New authentication response.
   */
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.auth.changePassword(
      user.sub as string,
      dto.old_password,
      dto.new_password,
    );
  }
}
