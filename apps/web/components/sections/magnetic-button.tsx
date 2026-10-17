'use client';

import { useRef } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';

export function MagneticButton(props: ButtonProps): JSX.Element {
  const ref = useRef<HTMLButtonElement>(null);

  function move(event: React.PointerEvent<HTMLButtonElement>): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left - bounds.width / 2;
    const y = event.clientY - bounds.top - bounds.height / 2;
    event.currentTarget.style.transform = `translate3d(${x * 0.08}px, ${y * 0.12}px, 0)`;
  }

  function reset(): void {
    if (ref.current) ref.current.style.transform = '';
  }

  return (
    <Button
      {...props}
      onPointerLeave={reset}
      onPointerMove={move}
      ref={ref}
      className={`transition-transform duration-200 ${props.className ?? ''}`}
    />
  );
}
