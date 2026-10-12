import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditLogModule } from '../audit/audit-log.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [AuthModule, AuditLogModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
