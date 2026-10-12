import { roleEnum } from '@ironpulse/shared';
import { z } from 'zod';

export const userStatusFilterSchema = z.enum(['ACTIVE', 'SUSPENDED', 'PENDING', 'DELETED']);
export const userStatusUpdateSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']),
});

export const adminUserQuerySchema = z.object({
  role: roleEnum.optional(),
  status: userStatusFilterSchema.optional(),
  search: z.string().trim().max(100).optional(),
});

export type AdminUserQuery = z.infer<typeof adminUserQuerySchema>;
