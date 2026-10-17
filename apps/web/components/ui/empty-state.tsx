import { cn } from '@/lib/utils';

export function EmptyState({
  title,
  description,
  className,
}: {
  title: string;
  description: string;
  className?: string;
}): JSX.Element {
  return (
    <div className={cn('rounded-panel border border-dashed border-line bg-surface/60 p-8 text-center', className)}>
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">{description}</p>
    </div>
  );
}
