import { z } from 'zod';

export const trainerProfileSchema = z.object({
  bio: z.string().max(2000).nullable().optional(),
  specialties: z.array(z.string().trim().min(1).max(80)).max(20),
  photoUrl: z.string().url().nullable().optional(),
});

export const trainerClientSchema = z.object({
  memberId: z.string().min(1),
});

export const trainerAvailabilitySchema = z.object({
  availability: z
    .array(
      z.object({
        weekday: z.number().int().min(0).max(6),
        startsAt: z.number().int().min(0).max(1439),
        endsAt: z.number().int().min(1).max(1440),
      }).refine((slot) => slot.endsAt > slot.startsAt, {
        message: 'Availability must end after it starts.',
      }),
    )
    .max(28)
    .superRefine((slots, context) => {
      for (let index = 0; index < slots.length; index += 1) {
        for (let otherIndex = index + 1; otherIndex < slots.length; otherIndex += 1) {
          const slot = slots[index];
          const other = slots[otherIndex];
          if (
            slot.weekday === other.weekday &&
            slot.startsAt < other.endsAt &&
            slot.endsAt > other.startsAt
          ) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: [otherIndex],
              message: 'Availability slots cannot overlap.',
            });
          }
        }
      }
    }),
});

export const appointmentRequestSchema = z
  .object({
    trainerId: z.string().min(1),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
  })
  .refine((appointment) => appointment.endsAt > appointment.startsAt, {
    message: 'Appointment must end after it starts.',
    path: ['endsAt'],
  });

export const appointmentUpdateSchema = z.object({
  status: z.enum(['CONFIRMED', 'CANCELLED', 'COMPLETED']),
  notes: z.string().max(2000).nullable().optional(),
});

export type TrainerProfileInput = z.infer<typeof trainerProfileSchema>;
export type TrainerAvailabilityInput = z.infer<typeof trainerAvailabilitySchema>;
export type AppointmentRequestInput = z.infer<typeof appointmentRequestSchema>;
export type AppointmentUpdateInput = z.infer<typeof appointmentUpdateSchema>;
