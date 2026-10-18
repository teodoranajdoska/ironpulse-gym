import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { randomBytes } from 'node:crypto';
import { Request, Response } from 'express';
import { ZodError, ZodType } from 'zod';
import {
  createAccountSchema,
  emailSchema,
  emailVerificationSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '@ironpulse/shared';
import { Env } from '../config/env';
import { AuthService, authCookieNames, ClientMeta } from './auth.service';
import { AuthenticatedRequest } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { Public } from './public.decorator';
import { Roles } from './roles.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Get('csrf')
  @Public()
  @ApiOperation({ summary: 'Issue a CSRF token for cookie-authenticated requests' })
  csrf(@Res({ passthrough: true }) response: Response): { csrfToken: string } {
    const csrfToken = randomBytes(32).toString('base64url');
    response.cookie('csrf_token', csrfToken, {
      httpOnly: false,
      secure: this.isProduction(),
      sameSite: 'lax',
      path: '/',
    });
    return { csrfToken };
  }

  @Post('register')
  @Public()
  @Throttle({ short: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register a member account' })
  @ApiBody({ schema: { example: { email: 'member@example.com', password: 'password123', name: 'Member' } } })
  @ApiResponse({ status: 201, description: 'Registration completed; a session is issued when email verification is disabled' })
  async register(
    @Body() body: unknown,
    @Headers('accept-language') language: string | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string; user?: unknown }> {
    const result = await this.authService.register(
      this.parse(registerSchema, body),
      this.locale(language),
      this.clientMeta(request),
    );
    if (result.session) {
      this.setSessionCookies(response, result.session.accessToken, result.session.refreshToken);
      return { message: result.message, user: result.session.user };
    }
    return { message: result.message };
  }

  @Post('login')
  @Public()
  @HttpCode(200)
  @Throttle({ short: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Sign in and issue secure cookies' })
  @ApiBody({ schema: { example: { email: 'member@example.com', password: 'password123' } } })
  async login(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: unknown }> {
    const session = await this.authService.login(this.parse(loginSchema, body), this.clientMeta(request));
    this.setSessionCookies(response, session.accessToken, session.refreshToken);
    return { user: session.user };
  }

  @Post('refresh')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate the refresh token and access cookie' })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: unknown }> {
    const oldToken = request.cookies?.[authCookieNames.refresh] as string | undefined;
    if (!oldToken) {
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }
    const session = await this.authService.refresh(oldToken, this.clientMeta(request));
    this.setSessionCookies(response, session.accessToken, session.refreshToken);
    return { user: session.user };
  }

  @Post('logout')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Revoke the current refresh token and clear auth cookies' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    const refreshToken = request.cookies?.[authCookieNames.refresh] as string | undefined;
    await this.authService.logout(refreshToken);
    this.clearSessionCookies(response);
    return { message: 'Logged out.' };
  }

  @Post('logout-all')
  @HttpCode(200)
  @ApiOperation({ summary: 'Revoke all refresh sessions for the authenticated user' })
  async logoutAll(
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    if (!user) {
      throw new UnauthorizedException('Authentication required.');
    }
    await this.authService.logoutAll(user.id);
    this.clearSessionCookies(response);
    return { message: 'All sessions signed out.' };
  }

  @Post('verify-email')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify an email address using its one-time token' })
  @ApiBody({ schema: { example: { token: 'one-time-verification-token' } } })
  async verifyEmail(@Body() body: unknown): Promise<{ message: string }> {
    const { token } = this.parse(emailVerificationSchema, body);
    await this.authService.verifyEmail(token);
    return { message: 'Email verified successfully.' };
  }

  @Post('resend-verification')
  @Public()
  @HttpCode(200)
  @Throttle({ short: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Resend verification without revealing account existence' })
  @ApiBody({ schema: { example: { email: 'member@example.com' } } })
  async resendVerification(
    @Body() body: unknown,
    @Headers('accept-language') language?: string,
  ): Promise<{ message: string }> {
    const { email } = this.parse(emailSchema, body);
    await this.authService.resendVerification(email, this.locale(language));
    return { message: 'If the account needs verification, an email has been sent.' };
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(200)
  @Throttle({ short: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Request a password reset without revealing account existence' })
  @ApiBody({ schema: { example: { email: 'member@example.com' } } })
  async forgotPassword(
    @Body() body: unknown,
    @Headers('accept-language') language?: string,
  ): Promise<{ message: string }> {
    const { email } = this.parse(emailSchema, body);
    await this.authService.forgotPassword(email, this.locale(language));
    return { message: 'If the account exists, a password reset email has been sent.' };
  }

  @Post('reset-password')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Set a new password using a single-use reset token' })
  @ApiBody({
    schema: { example: { token: 'one-time-reset-token', password: 'new-password-123' } },
  })
  async resetPassword(@Body() body: unknown): Promise<{ message: string }> {
    const input = this.parse(resetPasswordSchema, body);
    await this.authService.resetPassword(input.token, input.password);
    return { message: 'Password updated successfully.' };
  }

  @Post('admin/accounts')
  @Roles('ADMIN')
  @Throttle({ short: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Create a trainer or sponsor account and send a password invitation' })
  @ApiCookieAuth('ip_access')
  @ApiBody({
    schema: {
      example: { email: 'trainer@example.com', name: 'Trainer Name', role: 'TRAINER' },
    },
  })
  createPrivilegedAccount(
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Headers('accept-language') language?: string,
  ) {
    if (!user) {
      throw new UnauthorizedException('Authentication required.');
    }
    return this.authService.createPrivilegedAccount(
      this.parse(createAccountSchema, body),
      user.id,
      this.locale(language),
    );
  }

  @Get('me')
  @ApiOperation({ summary: 'Return the authenticated user and profile' })
  @ApiCookieAuth('ip_access')
  async me(@CurrentUser() user: AuthenticatedRequest['user']) {
    if (!user) {
      throw new UnauthorizedException('Authentication required.');
    }
    return { user: await this.authService.me(user.id) };
  }

  private setSessionCookies(response: Response, accessToken: string, refreshToken: string): void {
    const shared = {
      httpOnly: true,
      secure: this.isProduction(),
      sameSite: 'lax' as const,
      path: '/',
    };
    response.cookie(authCookieNames.access, accessToken, {
      ...shared,
      maxAge: 15 * 60 * 1000,
    });
    response.cookie(authCookieNames.refresh, refreshToken, {
      ...shared,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private clearSessionCookies(response: Response): void {
    const shared = {
      httpOnly: true,
      secure: this.isProduction(),
      sameSite: 'lax' as const,
      path: '/',
    };
    response.clearCookie(authCookieNames.access, shared);
    response.clearCookie(authCookieNames.refresh, shared);
    response.clearCookie('csrf_token', {
      secure: this.isProduction(),
      sameSite: 'lax',
      path: '/',
    });
  }

  private clientMeta(request: Request): ClientMeta {
    return {
      userAgent: request.get('user-agent')?.slice(0, 512),
      ip: request.ip,
    };
  }

  private locale(language?: string): 'mk' | 'en' {
    return language?.toLowerCase().startsWith('mk') ? 'mk' : 'en';
  }

  private isProduction(): boolean {
    return this.config.get('NODE_ENV') === 'production';
  }

  private parse<T>(schema: ZodType<T>, body: unknown): T {
    try {
      return schema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Validation failed.',
          issues: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            code: issue.code,
          })),
        });
      }
      throw error;
    }
  }
}
