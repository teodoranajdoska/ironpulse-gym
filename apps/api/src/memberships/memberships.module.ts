import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit/audit-log.module';
import { MembershipExpiryService } from './membership-expiry.service';
import { MembershipsController } from './memberships.controller';
import { MembershipsService } from './memberships.service';
import { MockPaymentProvider, PAYMENT_PROVIDER } from './payment-provider';

@Module({
  imports: [AuditLogModule],
  controllers: [MembershipsController],
  providers: [
    MembershipsService,
    MembershipExpiryService,
    MockPaymentProvider,
    { provide: PAYMENT_PROVIDER, useExisting: MockPaymentProvider },
  ],
  exports: [MembershipsService],
})
export class MembershipsModule {}
