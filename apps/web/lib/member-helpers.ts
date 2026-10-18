export function daysRemaining(endsAt: Date, now = new Date()): number {
  return Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / 86_400_000));
}

export function weeklyWorkoutCount(
  dates: Date[],
  now = new Date(),
): number {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return dates.filter((date) => date >= start && date < end).length;
}

export function localDateTimeMinimum(now = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export type MachineAnimationKind = 'cardio' | 'push' | 'pull' | 'legs' | 'general';

export function machineAnimationKind(animationKey: string | null): MachineAnimationKind {
  const key = (animationKey ?? '').toLowerCase().replace(/[_\s]+/g, '-');
  if (/\b(cardio|tread(?:mill)?|bike|elliptical)\b/.test(key)) return 'cardio';
  if (/\b(leg|squat|calf|quadricep|hamstring|glute)\b/.test(key)) return 'legs';
  if (/\b(press|chest|shoulder)\b/.test(key)) return 'push';
  if (/\b(row|lat|back|curl)\b/.test(key)) return 'pull';
  return 'general';
}

export function isYouTubeVideoId(value: string | null): value is string {
  return value !== null && /^[A-Za-z0-9_-]{11}$/.test(value);
}
