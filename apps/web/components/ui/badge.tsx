import { cn } from '@/lib/utils';

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-line bg-surface px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted',
        className,
      )}
    >
      {children}
    </span>
  );
}
