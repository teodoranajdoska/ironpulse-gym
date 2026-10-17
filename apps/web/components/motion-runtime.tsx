'use client';

import { APP_NAME } from '@ironpulse/shared';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export function MotionRuntime(): JSX.Element {
  const pathname = usePathname();
  const progressRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const previousPath = useRef(pathname);
  const [ready, setReady] = useState(false);
  const [motionEnabled, setMotionEnabled] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setReady(true), 450);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = (): void => setMotionEnabled(!preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!motionEnabled) return;

    let destroy: (() => void) | undefined;
    let cancelled = false;
    void Promise.all([import('gsap'), import('gsap/ScrollTrigger'), import('lenis')])
      .then(([gsapModule, scrollTriggerModule, lenisModule]) => {
        if (cancelled) return;
        const gsap = gsapModule.gsap;
        const ScrollTrigger = scrollTriggerModule.ScrollTrigger;
        gsap.registerPlugin(ScrollTrigger);
        const lenis = new lenisModule.default({ smoothWheel: true, lerp: 0.085 });
        const syncScroll = (): void => ScrollTrigger.update();
        const tick = (time: number): void => lenis.raf(time * 1000);
        const updateProgress = (): void => {
          const max = document.documentElement.scrollHeight - window.innerHeight;
          gsap.set(progressRef.current, { scaleX: max > 0 ? window.scrollY / max : 0 });
        };
        lenis.on('scroll', syncScroll);
        lenis.on('scroll', updateProgress);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);
        updateProgress();

        const finePointer = window.matchMedia('(pointer: fine)').matches;
        const cursor = cursorRef.current;
        const moveCursor = (event: PointerEvent): void => {
          if (cursor) {
            gsap.set(cursor, { x: event.clientX - 6, y: event.clientY - 6 });
          }
        };
        if (finePointer) window.addEventListener('pointermove', moveCursor, { passive: true });

        destroy = () => {
          if (finePointer) window.removeEventListener('pointermove', moveCursor);
          lenis.off('scroll', syncScroll);
          lenis.off('scroll', updateProgress);
          gsap.ticker.remove(tick);
          lenis.destroy();
          ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
        };
      })
      .catch((error: unknown) => {
        console.error('Unable to initialize global motion.', error);
      });

    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [motionEnabled]);

  useEffect(() => {
    if (motionEnabled) return;
    const updateProgress = (): void => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? window.scrollY / max : 0;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${progress})`;
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    updateProgress();
    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, [motionEnabled]);

  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    if (!motionEnabled) return;
    void import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    }).catch((error: unknown) => {
      console.error('Unable to clean up route scroll triggers.', error);
    });
  }, [motionEnabled, pathname]);

  return (
    <>
      <div aria-hidden="true" className="app-progress" ref={progressRef} />
      <div aria-hidden="true" className="custom-cursor" ref={cursorRef} />
      <div aria-hidden="true" className="loading-screen" data-ready={ready}>
        <span className="display-font text-4xl font-bold tracking-tightest text-brand-lime">
          {APP_NAME}
        </span>
      </div>
    </>
  );
}
