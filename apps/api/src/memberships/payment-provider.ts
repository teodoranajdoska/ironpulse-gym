import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export interface PaymentProvider {
  requestPayment(amountMkd: number): Promise<{ provider: string; status: PaymentStatus }>;
}

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  async requestPayment(amountMkd: number): Promise<{ provider: string; status: PaymentStatus }> {
    if (!Number.isSafeInteger(amountMkd) || amountMkd < 0) {
      throw new BadRequestException('Payment amount must be a non-negative integer in MKD.');
    }
    return { provider: 'mock', status: PaymentStatus.PENDING };
  }
}
