import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }): JSX.Element {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-xl bg-raised', className)} />;
}
