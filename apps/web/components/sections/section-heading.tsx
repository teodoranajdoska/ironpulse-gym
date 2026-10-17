import { cn } from '@/lib/utils';

export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  className?: string;
}): JSX.Element {
  return (
    <div className={cn('mb-10 max-w-3xl', className)}>
      <p className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-brand-lime">{eyebrow}</p>
      <h2 className="display-font text-4xl font-bold leading-[0.98] tracking-tightest text-foreground sm:text-5xl md:text-6xl">
        {title}
      </h2>
      {description && <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">{description}</p>}
    </div>
  );
}
