import { Injectable } from '@nestjs/common';
import { UserRole } from '@ironpulse/shared';
import { PrismaService } from '../prisma/prisma.service';

export type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserProfile | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: { select: { name: true } } },
    });
    if (!user) return null;
    return { id: user.id, email: user.email, name: user.profile?.name ?? null, role: user.role };
  }

  async me(id: string): Promise<UserProfile | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { profile: { select: { name: true } } },
    });
    if (!user) return null;
    return { id: user.id, email: user.email, name: user.profile?.name ?? null, role: user.role };
  }
}
