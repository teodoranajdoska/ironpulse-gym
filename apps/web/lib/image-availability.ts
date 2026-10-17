import { existsSync } from 'node:fs';
import path from 'node:path';
import { imageManifest, type ImageSlot } from '@/lib/images';

const imageSlots: ImageSlot[] = [
  'hero',
  'free-weights',
  'machines',
  'cardio',
  'functional',
  'group-class',
  'recovery',
  'personal-training',
  'trainer-1',
  'trainer-2',
  'trainer-3',
  'community',
  'nutrition',
  'cta',
];

export function getImageAvailability(): Record<ImageSlot, boolean> {
  const publicImages = path.join(process.cwd(), 'public', 'images');
  return Object.fromEntries(
    imageSlots.map((slot) => [
      slot,
      existsSync(path.join(publicImages, imageManifest[slot].file)),
    ]),
  ) as Record<ImageSlot, boolean>;
}
