import { cn } from '@/lib/utils';

export function Section({
  children,
  id,
  className,
}: {
  children: React.ReactNode;
  id?: string;
  className?: string;
}): JSX.Element {
  return (
    <section className={cn('page-width py-20 md:py-28', className)} id={id}>
      {children}
    </section>
  );
}
