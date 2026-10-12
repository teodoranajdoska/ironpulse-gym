import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit/audit-log.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { MachinesController } from './machines.controller';
import { MachinesService } from './machines.service';

@Module({
  imports: [AuditLogModule, MembershipsModule],
  controllers: [MachinesController],
  providers: [MachinesService],
})
export class MachinesModule {}
