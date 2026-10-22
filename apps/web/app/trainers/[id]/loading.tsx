import { Skeleton } from '@/components/ui/skeleton';

export default function TrainerProfileLoading(): JSX.Element {
  return (
    <main aria-busy="true" className="page-width min-h-[70vh] py-12 sm:py-20">
      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
        <Skeleton className="aspect-[4/5] rounded-panel" />
        <div className="space-y-5 self-center">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-14 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </main>
  );
}
