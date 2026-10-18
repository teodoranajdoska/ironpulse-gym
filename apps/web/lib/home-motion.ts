import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initializeHomeMotion(root: HTMLElement): () => void {
  const media = gsap.matchMedia();
  const magneticCleanup: Array<() => void> = [];
  const context = gsap.context(() => {
    gsap.fromTo(
      '.hero-eyebrow, .hero-title-word, .hero-subtitle, .hero-actions, .hero-trust',
      { y: 24, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.75, stagger: 0.06, ease: 'power2.out' },
    );

    gsap.to('.statement-word', {
      color: 'var(--foreground)',
      stagger: 0.08,
      ease: 'none',
      scrollTrigger: {
        trigger: '.home-statement',
        start: 'top 75%',
        end: 'bottom 50%',
        scrub: true,
      },
    });

    media.add('(min-width: 768px) and (hover: hover) and (pointer: fine)', () => {
      gsap.to('.hero-media', {
        scale: 1.08,
        yPercent: 8,
        ease: 'none',
        scrollTrigger: { trigger: '.home-hero', start: 'top top', end: 'bottom top', scrub: 0.6 },
      });

      gsap.utils.toArray<HTMLElement>('.image-reveal').forEach((image) => {
        gsap.fromTo(
          image,
          { clipPath: 'inset(0 100% 0 0)', scale: 1.05 },
          {
            clipPath: 'inset(0 0% 0 0)',
            scale: 1,
            duration: 1,
            ease: 'power2.out',
            scrollTrigger: { trigger: image, start: 'top 82%' },
          },
        );
      });

      gsap.utils.toArray<HTMLElement>('.parallax-image').forEach((image) => {
        gsap.fromTo(
          image,
          { yPercent: -5 },
          {
            yPercent: 5,
            ease: 'none',
            scrollTrigger: { trigger: image, start: 'top bottom', end: 'bottom top', scrub: true },
          },
        );
      });

      root.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((button) => {
        const move = (event: PointerEvent): void => {
          const bounds = button.getBoundingClientRect();
          gsap.to(button, {
            x: (event.clientX - bounds.left - bounds.width / 2) * 0.12,
            y: (event.clientY - bounds.top - bounds.height / 2) * 0.12,
            duration: 0.2,
            overwrite: true,
          });
        };
        const reset = (): void => {
          gsap.to(button, { x: 0, y: 0, duration: 0.35, ease: 'power2.out', overwrite: true });
        };
        button.addEventListener('pointermove', move);
        button.addEventListener('pointerleave', reset);
        magneticCleanup.push(() => {
          button.removeEventListener('pointermove', move);
          button.removeEventListener('pointerleave', reset);
        });
      });
    });

    media.add('(min-width: 900px) and (hover: hover) and (pointer: fine)', () => {
      const section = root.querySelector<HTMLElement>('.zones-gallery');
      const track = root.querySelector<HTMLElement>('.zones-track');
      if (!section || !track) return;

      const distance = (): number => Math.max(0, track.scrollWidth - section.clientWidth);
      if (distance() === 0) return;

      gsap.fromTo(track, { x: 0 }, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
          scrub: 0.7,
          invalidateOnRefresh: true,
        },
      });
    });
  }, root);

  return () => {
    magneticCleanup.forEach((cleanup) => cleanup());
    media.revert();
    context.revert();
    ScrollTrigger.getAll().forEach((trigger) => {
      if (trigger.trigger && root.contains(trigger.trigger)) trigger.kill();
    });
  };
}
