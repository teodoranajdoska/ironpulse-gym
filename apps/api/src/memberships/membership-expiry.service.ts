import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MembershipsService } from './memberships.service';

@Injectable()
export class MembershipExpiryService {
  private readonly logger = new Logger(MembershipExpiryService.name);

  constructor(private readonly memberships: MembershipsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async expireDaily(): Promise<void> {
    const count = await this.memberships.expireMemberships();
    this.logger.log(`Marked ${count} memberships expired.`);
  }
}
