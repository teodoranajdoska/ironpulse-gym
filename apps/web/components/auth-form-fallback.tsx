import { Skeleton } from '@/components/ui/skeleton';

export function AuthFormFallback(): JSX.Element {
  return (
    <div aria-hidden="true" className="space-y-5">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-11 w-full rounded-full" />
    </div>
  );
}
