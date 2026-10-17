import { existsSync } from 'node:fs';
import path from 'node:path';
import { HomeExperience } from '@/components/home-experience';
import { getImageAvailability } from '@/lib/image-availability';

export default function HomePage(): JSX.Element {
  const imageAvailability = getImageAvailability();
  const hasHeroVideo = imageAvailability.hero &&
    existsSync(path.join(process.cwd(), 'public', 'video', 'hero.mp4'));
  return <HomeExperience hasHeroVideo={hasHeroVideo} imageAvailability={imageAvailability} />;
}
