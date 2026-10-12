import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit/audit-log.module';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';

@Module({
  imports: [AuditLogModule],
  controllers: [ContentController],
  providers: [ContentService],
})
export class ContentModule {}
