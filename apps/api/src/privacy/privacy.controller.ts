import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
} from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { confirmPasswordSchema } from '@ironpulse/shared';
import { ZodError } from 'zod';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PrivacyService } from './privacy.service';

@ApiTags('privacy')
@ApiCookieAuth('ip_access')
@Controller('me')
export class PrivacyController {
  constructor(private readonly privacy: PrivacyService) {}

  @Get('export')
  @ApiOperation({ summary: 'Export the authenticated user personal data as JSON' })
  export(@CurrentUser() user: AuthenticatedRequest['user']) {
    return this.privacy.exportUserData(this.userId(user));
  }

  @Delete()
  @ApiOperation({ summary: 'Anonymize personal data after password confirmation' })
  @ApiBody({ schema: { example: { password: 'current-password' } } })
  delete(
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Body() body: unknown,
  ) {
    const { password } = this.parse(confirmPasswordSchema, body);
    return this.privacy.anonymizeUser(this.userId(user), password);
  }

  private userId(user: AuthenticatedRequest['user']): string {
    if (!user) throw new BadRequestException('Authenticated user missing.');
    return user.id;
  }

  private parse<T>(schema: { parse(value: unknown): T }, value: unknown): T {
    try {
      return schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Validation failed.',
          issues: error.issues.map(({ path, code }) => ({ path: path.join('.'), code })),
        });
      }
      throw error;
    }
  }
}
