import {
  appointmentRequestSchema,
  confirmPasswordSchema,
  memberProfileUpdateSchema,
  membershipRequestSchema,
  workoutLogSchema,
} from '@ironpulse/shared';
import { describe, expect, it } from 'vitest';
import {
  daysRemaining,
  isYouTubeVideoId,
  localDateTimeMinimum,
  machineAnimationKind,
  weeklyWorkoutCount,
} from '../lib/member-helpers';

describe('member dashboard helpers', () => {
  it('rounds remaining membership time up to full days and never returns a negative count', () => {
    const now = new Date('2026-10-18T10:00:00.000Z');
    expect(daysRemaining(new Date('2026-10-19T09:59:59.000Z'), now)).toBe(1);
    expect(daysRemaining(new Date('2026-10-17T10:00:00.000Z'), now)).toBe(0);
  });

  it('counts workout dates within the current Monday-to-Monday week', () => {
    const now = new Date(2026, 9, 21, 12);
    expect(weeklyWorkoutCount([
      new Date(2026, 9, 19, 8),
      new Date(2026, 9, 20, 8),
      new Date(2026, 9, 18, 8),
      new Date(2026, 9, 26, 8),
    ], now)).toBe(2);
  });

  it('formats a local datetime input minimum without a UTC offset conversion', () => {
    const now = new Date(2026, 9, 18, 9, 7);
    expect(localDateTimeMinimum(now)).toBe('2026-10-18T09:07');
  });

  it('maps machine slugs to reduced-motion-aware animation variants', () => {
    expect(machineAnimationKind('leg-press')).toBe('legs');
    expect(machineAnimationKind('chest_press')).toBe('push');
    expect(machineAnimationKind('chest-press')).toBe('push');
    expect(machineAnimationKind('treadmill')).toBe('cardio');
    expect(machineAnimationKind('lat-pulldown')).toBe('pull');
    expect(machineAnimationKind(null)).toBe('general');
  });

  it('accepts only bare YouTube video IDs for privacy-enhanced embeds', () => {
    expect(isYouTubeVideoId('dQw4w9WgXcQ')).toBe(true);
    expect(isYouTubeVideoId('TODO-replace')).toBe(false);
    expect(isYouTubeVideoId('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe(false);
    expect(isYouTubeVideoId(null)).toBe(false);
  });
});

describe('member form schemas', () => {
  it('requires a valid plan id', () => {
    expect(membershipRequestSchema.safeParse({ planId: 'plan-monthly' }).success).toBe(true);
    expect(membershipRequestSchema.safeParse({ planId: '' }).success).toBe(false);
  });

  it('rejects out-of-range workout sets and accepts valid sets', () => {
    const valid = { exerciseId: 'exercise-1', sets: [{ reps: 8, weightKg: 42.5 }] };
    expect(workoutLogSchema.safeParse(valid).success).toBe(true);
    expect(workoutLogSchema.safeParse({ ...valid, sets: [{ reps: 0, weightKg: 501 }] }).success).toBe(false);
    expect(workoutLogSchema.safeParse({ ...valid, sets: Array.from({ length: 21 }, () => valid.sets[0]) }).success).toBe(false);
  });

  it('validates editable member profile fields and account-deletion confirmation', () => {
    expect(memberProfileUpdateSchema.safeParse({ name: 'A. Member', heightCm: 178, weightKg: 80, locale: 'en' }).success).toBe(true);
    expect(memberProfileUpdateSchema.safeParse({ name: 'A', heightCm: 300, locale: 'fr' }).success).toBe(false);
    expect(confirmPasswordSchema.safeParse({ password: 'password123' }).success).toBe(true);
    expect(confirmPasswordSchema.safeParse({ password: 'short' }).success).toBe(false);
  });

  it('requires the requested appointment to end after it starts', () => {
    const startsAt = '2026-10-20T10:00:00.000Z';
    expect(appointmentRequestSchema.safeParse({
      trainerId: 'trainer-1',
      startsAt,
      endsAt: '2026-10-20T11:00:00.000Z',
    }).success).toBe(true);
    expect(appointmentRequestSchema.safeParse({
      trainerId: 'trainer-1',
      startsAt,
      endsAt: startsAt,
    }).success).toBe(false);
  });
});
