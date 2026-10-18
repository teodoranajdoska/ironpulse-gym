import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { paginated, pagination } from '../common/pagination';
import {
  AppointmentRequestInput,
  AppointmentUpdateInput,
  TrainerAvailabilityInput,
  TrainerProfileInput,
} from './trainers.schemas';

@Injectable()
export class TrainersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async publicList(input: { page?: string; pageSize?: string }) {
    const page = pagination(input);
    const where = { user: { status: 'ACTIVE', role: 'TRAINER' as const } };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.trainerProfile.findMany({
        where,
        include: { user: { select: { id: true, profile: { select: { name: true } } } } },
        orderBy: { createdAt: 'asc' },
        skip: page.skip,
        take: page.take,
      }),
      this.prisma.trainerProfile.count({ where }),
    ]);
    return paginated(
      data.map(({ user, ...profile }) => ({
        id: user.id,
        name: user.profile?.name ?? null,
        bio: profile.bio,
        specialties: profile.specialties,
        photoUrl: profile.photoUrl,
      })),
      total,
      page.page,
      page.pageSize,
    );
  }

  async updateOwnProfile(trainerId: string, input: TrainerProfileInput) {
    return this.prisma.trainerProfile.upsert({
      where: { userId: trainerId },
      update: input,
      create: {
        userId: trainerId,
        bio: input.bio,
        specialties: input.specialties,
        photoUrl: input.photoUrl,
      },
    });
  }

  async listClients(trainerId: string, input: { page?: string; pageSize?: string }) {
    const page = pagination(input);
    const where = { trainerId, status: 'ACTIVE' };
    const [assignments, total] = await this.prisma.$transaction([
      this.prisma.trainerClient.findMany({
        where,
        include: {
          member: { select: { id: true, email: true, profile: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: page.skip,
        take: page.take,
      }),
      this.prisma.trainerClient.count({ where }),
    ]);
    return paginated(
      assignments.map(({ member, createdAt }) => ({
        id: member.id,
        email: member.email,
        name: member.profile?.name ?? null,
        assignedAt: createdAt,
      })),
      total,
      page.page,
      page.pageSize,
    );
  }

  async addClient(trainerId: string, memberId: string) {
    const member = await this.prisma.user.findFirst({
      where: { id: memberId, role: 'MEMBER', status: 'ACTIVE' },
      select: { id: true },
    });
    if (!member) throw new NotFoundException('Active member not found.');
    try {
      const assignment = await this.prisma.trainerClient.create({
        data: { trainerId, memberId, status: 'ACTIVE' },
      });
      await this.audit.record(trainerId, 'trainer.client.add', 'TrainerClient', assignment.id);
      return assignment;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('This member is already assigned to the trainer.');
      }
      throw error;
    }
  }

  async removeClient(trainerId: string, memberId: string) {
    const removed = await this.prisma.trainerClient.deleteMany({
      where: { trainerId, memberId, status: 'ACTIVE' },
    });
    if (removed.count !== 1) throw new NotFoundException('Trainer client assignment not found.');
    await this.audit.record(trainerId, 'trainer.client.remove', 'TrainerClient', memberId);
    return { memberId };
  }

  async clientProfile(trainerId: string, memberId: string) {
    await this.assertClient(trainerId, memberId);
    const member = await this.prisma.user.findFirst({
      where: { id: memberId, role: 'MEMBER', status: 'ACTIVE' },
      select: {
        id: true,
        email: true,
        createdAt: true,
        profile: {
          select: {
            name: true,
            phone: true,
            birthDate: true,
            gender: true,
            heightCm: true,
            weightKg: true,
            avatarUrl: true,
          },
        },
      },
    });
    if (!member) throw new NotFoundException('Assigned member not found.');
    return member;
  }

  async clientWorkoutProgress(
    trainerId: string,
    memberId: string,
    input: { page?: string; pageSize?: string },
  ) {
    await this.assertClient(trainerId, memberId);
    const page = pagination(input);
    const where = { memberId };
    const [logs, total] = await this.prisma.$transaction([
      this.prisma.workoutLog.findMany({
        where,
        include: {
          sets: { orderBy: { setNumber: 'asc' } },
          exercise: {
            select: {
              id: true,
              nameEn: true,
              machine: { select: { slug: true, nameEn: true } },
            },
          },
        },
        orderBy: { performedAt: 'desc' },
        skip: page.skip,
        take: page.take,
      }),
      this.prisma.workoutLog.count({ where }),
    ]);
    return paginated(logs, total, page.page, page.pageSize);
  }

  async setAvailability(trainerId: string, input: TrainerAvailabilityInput) {
    const trainer = await this.prisma.trainerProfile.findUnique({
      where: { userId: trainerId },
      select: { id: true },
    });
    if (!trainer) throw new NotFoundException('Trainer profile not found.');
    return this.prisma.$transaction(async (transaction) => {
      await transaction.trainerAvailability.deleteMany({ where: { trainerId } });
      if (input.availability.length) {
        await transaction.trainerAvailability.createMany({
          data: input.availability.map((slot) => ({ ...slot, trainerId })),
        });
      }
      return transaction.trainerAvailability.findMany({
        where: { trainerId },
        orderBy: [{ weekday: 'asc' }, { startsAt: 'asc' }],
      });
    });
  }

  async getOwnAvailability(trainerId: string) {
    return this.prisma.trainerAvailability.findMany({
      where: { trainerId },
      orderBy: [{ weekday: 'asc' }, { startsAt: 'asc' }],
    });
  }

  async requestAppointment(memberId: string, input: AppointmentRequestInput) {
    const now = new Date();
    if (input.startsAt <= now) throw new BadRequestException('Appointments must be in the future.');
    const trainer = await this.prisma.user.findFirst({
      where: { id: input.trainerId, role: 'TRAINER', status: 'ACTIVE' },
      select: { id: true, trainerProfile: { select: { id: true } } },
    });
    if (!trainer?.trainerProfile) throw new NotFoundException('Active trainer not found.');

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const lock = await transaction.trainerProfile.updateMany({
          where: { userId: trainer.id },
          data: { bookingVersion: { increment: 1 } },
        });
        if (lock.count !== 1) throw new NotFoundException('Trainer profile not found.');

        const weekday = input.startsAt.getUTCDay();
        const startsAtMinute = input.startsAt.getUTCHours() * 60 + input.startsAt.getUTCMinutes();
        const endsAtMinute =
          input.endsAt.getUTCHours() * 60 + input.endsAt.getUTCMinutes() +
          (input.endsAt.toISOString().slice(0, 10) === input.startsAt.toISOString().slice(0, 10)
            ? 0
            : 1440);
        const availabilityCount = await transaction.trainerAvailability.count({
          where: { trainerId: trainer.id },
        });
        if (availabilityCount > 0) {
          const available = await transaction.trainerAvailability.findFirst({
            where: {
              trainerId: trainer.id,
              weekday,
              startsAt: { lte: startsAtMinute },
              endsAt: { gte: endsAtMinute },
            },
          });
          if (!available) {
            throw new BadRequestException('The requested time is outside trainer availability.');
          }
        }

        const conflict = await transaction.appointment.findFirst({
          where: {
            trainerId: trainer.id,
            status: { in: ['REQUESTED', 'CONFIRMED'] },
            startsAt: { lt: input.endsAt },
            endsAt: { gt: input.startsAt },
          },
          select: { id: true },
        });
        if (conflict) throw new ConflictException('The trainer is already booked for that time.');
        return transaction.appointment.create({
          data: {
            trainerId: trainer.id,
            memberId,
            startsAt: input.startsAt,
            endsAt: input.endsAt,
            status: 'REQUESTED',
          },
        });
      });
    } catch (error) {
      if (this.isSerializationConflict(error)) {
        throw new ConflictException('The trainer is already booked for that time.');
      }
      throw error;
    }
  }

  async listMemberAppointments(memberId: string, input: { page?: string; pageSize?: string }) {
    const page = pagination(input);
    const where = { memberId };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where,
        include: {
          trainer: { select: { profile: { select: { name: true } } } },
        },
        orderBy: { startsAt: 'desc' },
        skip: page.skip,
        take: page.take,
      }),
      this.prisma.appointment.count({ where }),
    ]);
    return paginated(
      data.map(({ trainer, ...appointment }) => ({
        ...appointment,
        trainerName: trainer.profile?.name ?? null,
      })),
      total,
      page.page,
      page.pageSize,
    );
  }

  async listTrainerAppointments(trainerId: string, input: { page?: string; pageSize?: string }) {
    const page = pagination(input);
    const where = { trainerId };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where,
        include: { member: { select: { id: true, profile: { select: { name: true } } } } },
        orderBy: { startsAt: 'asc' },
        skip: page.skip,
        take: page.take,
      }),
      this.prisma.appointment.count({ where }),
    ]);
    return paginated(
      data.map(({ member, ...appointment }) => ({
        ...appointment,
        member: { id: member.id, name: member.profile?.name ?? null },
      })),
      total,
      page.page,
      page.pageSize,
    );
  }

  async cancelMemberAppointment(memberId: string, appointmentId: string) {
    const updated = await this.prisma.appointment.updateMany({
      where: {
        id: appointmentId,
        memberId,
        status: { in: ['REQUESTED', 'CONFIRMED'] },
      },
      data: { status: 'CANCELLED' },
    });
    if (updated.count !== 1) throw new NotFoundException('Appointment not found or cannot be cancelled.');
    return this.prisma.appointment.findUniqueOrThrow({ where: { id: appointmentId } });
  }

  async updateTrainerAppointment(
    trainerId: string,
    appointmentId: string,
    input: AppointmentUpdateInput,
  ) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, trainerId },
      select: { id: true, status: true },
    });
    if (!appointment) throw new NotFoundException('Appointment not found.');
    const allowed =
      (appointment.status === 'REQUESTED' &&
        ['CONFIRMED', 'CANCELLED'].includes(input.status)) ||
      (appointment.status === 'CONFIRMED' &&
        ['CANCELLED', 'COMPLETED'].includes(input.status));
    if (!allowed) throw new BadRequestException('Invalid appointment status transition.');
    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: input.status, notes: input.notes },
    });
    await this.audit.record(trainerId, 'trainer.appointment.update', 'Appointment', appointmentId, {
      status: input.status,
    });
    return updated;
  }

  private async assertClient(trainerId: string, memberId: string): Promise<void> {
    const assignment = await this.prisma.trainerClient.findUnique({
      where: { trainerId_memberId: { trainerId, memberId } },
      select: { status: true },
    });
    if (!assignment || assignment.status !== 'ACTIVE') {
      throw new ForbiddenException('This member is not assigned to the trainer.');
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return this.prismaErrorCode(error) === 'P2002';
  }

  private isSerializationConflict(error: unknown): boolean {
    return ['P2034', 'SQLITE_BUSY', 'SQLITE_LOCKED'].includes(this.prismaErrorCode(error) ?? '');
  }

  private prismaErrorCode(error: unknown): string | undefined {
    if (error instanceof Prisma.PrismaClientKnownRequestError) return error.code;
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof error.code === 'string'
    ) {
      return error.code;
    }
    return undefined;
  }
}
