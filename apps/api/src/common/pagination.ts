import { BadRequestException } from '@nestjs/common';
import { z, ZodError } from 'zod';

export type PageInput = {
  page?: string | number;
  pageSize?: string | number;
};

export function pagination(input: PageInput): {
  skip: number;
  take: number;
  page: number;
  pageSize: number;
} {
  let parsed: { page: number; pageSize: number };
  try {
    parsed = z
      .object({
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(20),
      })
      .parse(input);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new BadRequestException({
        message: 'Validation failed.',
        issues: error.issues.map(({ path, code }) => ({ path: path.join('.'), code })),
      });
    }
    throw error;
  }
  const { page, pageSize } = parsed;
  return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
}

export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
): { data: T[]; pagination: { page: number; pageSize: number; total: number; pages: number } } {
  return {
    data,
    pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) },
  };
}
