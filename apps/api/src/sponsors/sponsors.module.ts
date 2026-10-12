import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit/audit-log.module';
import { SponsorsController } from './sponsors.controller';
import { SponsorsService } from './sponsors.service';

@Module({
  imports: [AuditLogModule],
  controllers: [SponsorsController],
  providers: [SponsorsService],
})
export class SponsorsModule {}
