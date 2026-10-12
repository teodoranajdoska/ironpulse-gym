import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { CsrfGuard } from './csrf.guard';
import { MailService } from './mail.service';
import { DevMailController } from './dev-mail.controller';

@Module({
  imports: [UsersModule, JwtModule.register({})],
  controllers: [AuthController, DevMailController],
  providers: [
    AuthService,
    MailService,
    JwtAuthGuard,
    RolesGuard,
    CsrfGuard,
    { provide: APP_GUARD, useExisting: JwtAuthGuard },
    { provide: APP_GUARD, useExisting: RolesGuard },
    { provide: APP_GUARD, useExisting: CsrfGuard },
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard, JwtModule],
})
export class AuthModule {}
