'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';

export function CountUp({
  value,
  suffix = '',
}: {
  value: number;
  suffix?: string;
}): JSX.Element {
  const locale = useLocale();
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (preference.matches) {
      setDisplay(value);
      return;
    }
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      const start = performance.now();
      const duration = 1100;
      const animate = (now: number): void => {
        const progress = Math.min(1, (now - start) / duration);
        setDisplay(Math.round(value * (1 - (1 - progress) ** 3)));
        if (progress < 1) frame = requestAnimationFrame(animate);
      };
      frame = requestAnimationFrame(animate);
      observer.disconnect();
    });
    const stopForReducedMotion = (): void => {
      if (!preference.matches) return;
      cancelAnimationFrame(frame);
      observer.disconnect();
      setDisplay(value);
    };
    observer.observe(element);
    preference.addEventListener('change', stopForReducedMotion);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      preference.removeEventListener('change', stopForReducedMotion);
    };
  }, [value]);

  return (
    <span ref={ref}>
      {new Intl.NumberFormat(locale === 'mk' ? 'mk-MK' : 'en-GB').format(display)} {suffix}
    </span>
  );
}
