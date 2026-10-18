import { PrismaService } from '../src/prisma/prisma.service';
import { AdminService } from '../src/admin/admin.service';

describe('AdminService audit filters', () => {
  it('applies action and entity filters to both rows and total count', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prismaMock = {
      auditLog: { findMany, count },
      $transaction: jest.fn().mockImplementation((queries: unknown[]) => Promise.all(queries)),
    };
    const service = new AdminService(
      prismaMock as unknown as PrismaService,
      {} as never,
    );

    await service.auditLog({ action: 'sponsor', entity: 'Offer' });

    const filter = {
      action: { contains: 'sponsor' },
      entity: { contains: 'Offer' },
    };
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: filter }));
    expect(count).toHaveBeenCalledWith({ where: filter });
  });
});
