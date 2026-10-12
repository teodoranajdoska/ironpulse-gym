import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit/audit-log.module';
import { AppointmentsController } from './appointments.controller';
import { TrainersController } from './trainers.controller';
import { TrainersService } from './trainers.service';

@Module({
  imports: [AuditLogModule],
  controllers: [TrainersController, AppointmentsController],
  providers: [TrainersService],
  exports: [TrainersService],
})
export class TrainersModule {}
