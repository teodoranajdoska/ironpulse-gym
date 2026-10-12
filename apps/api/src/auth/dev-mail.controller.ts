import { Controller, Get, NotFoundException, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../config/env';
import { MailService } from './mail.service';
import { Public } from './public.decorator';

@Controller('dev')
export class DevMailController {
  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly mail: MailService,
  ) {}

  @Get('last-email')
  @Public()
  lastEmail(@Query('to') email?: string) {
    if (this.config.get('NODE_ENV') === 'production') {
      throw new NotFoundException();
    }
    if (!email) {
      throw new NotFoundException('No development email found.');
    }
    const message = this.mail.latestDevEmail(email);
    if (!message) {
      throw new NotFoundException('No development email found for this address.');
    }
    return message;
  }
}
