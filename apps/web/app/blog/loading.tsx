import { Skeleton } from '@/components/ui/skeleton';

export default function BlogLoading(): JSX.Element {
  return (
    <main aria-busy="true" className="page-width min-h-[70vh] py-16 sm:py-24">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-4 h-16 w-2/3" />
      <Skeleton className="mt-5 h-6 w-full max-w-2xl" />
      <div className="mt-10 flex gap-2">
        <Skeleton className="h-10 w-24 rounded-full" />
        <Skeleton className="h-10 w-28 rounded-full" />
        <Skeleton className="h-10 w-28 rounded-full" />
      </div>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton className="h-96 rounded-panel" key={index} />
        ))}
      </div>
    </main>
  );
}
