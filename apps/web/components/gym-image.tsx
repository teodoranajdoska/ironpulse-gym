'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { imageManifest, type ImageSlot } from '@/lib/images';

const blurDataURL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGf/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9k=';

export function GymImage({
  slot,
  locale,
  className = '',
  sizes = '(max-width: 768px) 100vw, 50vw',
  priority = false,
  available,
}: {
  slot: ImageSlot;
  locale: 'mk' | 'en';
  available: boolean;
  className?: string;
  sizes?: string;
  priority?: boolean;
}): JSX.Element {
  const image = imageManifest[slot];
  const [status, setStatus] = useState<'loading' | 'loaded' | 'missing'>(
    available ? 'loading' : 'missing',
  );

  useEffect(() => {
    setStatus(available ? 'loading' : 'missing');
  }, [available, slot]);

  return (
    <div
      aria-label={status !== 'loaded' ? image.alt[locale] : undefined}
      className={`gym-image ${className}`}
      role={status !== 'loaded' ? 'img' : undefined}
      style={{ aspectRatio: image.aspectRatio }}
    >
      {available && status !== 'missing' && (
        <Image
          aria-hidden={status !== 'loaded'}
          alt={image.alt[locale]}
          className="gym-image__asset"
          fill
          loading={slot === 'hero' ? 'eager' : 'lazy'}
          placeholder="blur"
          blurDataURL={blurDataURL}
          priority={slot === 'hero' && priority && available}
          sizes={sizes}
          src={`/images/${image.file}`}
          onError={() => setStatus('missing')}
          onLoad={() => setStatus('loaded')}
          style={{ opacity: status === 'loaded' ? 1 : 0, objectPosition: image.objectPosition }}
        />
      )}
      {status !== 'loaded' && (
        <div aria-hidden="true" className="gym-image__placeholder">
          {process.env.NODE_ENV === 'development' && (
            <span className="gym-image__slot">{slot}</span>
          )}
        </div>
      )}
    </div>
  );
}
