import { Skeleton } from '@kafi/ui';

export function RouteHydrateFallback() {
  return (
    <div
      className="space-y-6 p-4"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
