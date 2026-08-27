import { lazy, Suspense } from 'react';

/**
 * Lazy wrapper for the custom package form.
 *
 * @remarks
 * - Defers loading of TanStack Form + Zod until the user actually clicks
 *   "Request Custom Package", keeping the schemas chunk (32 KB) off the
 *   initial packages page bundle.
 * - The fallback reserves roughly the same height as the form so there is
 *   no visible layout shift when the component loads.
 */
const CustomPackageForm = lazy(() => import('./custom-package-form'));

export function LazyCustomPackageForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-11 animate-pulse rounded-md bg-muted/30" />
            <div className="h-11 animate-pulse rounded-md bg-muted/30" />
          </div>
          <div className="h-11 animate-pulse rounded-md bg-muted/30" />
          <div className="h-24 animate-pulse rounded-md bg-muted/30" />
          <div className="flex justify-end gap-3 pt-2">
            <div className="h-11 w-20 animate-pulse rounded-md bg-muted/30" />
            <div className="h-11 w-32 animate-pulse rounded-md bg-muted/30" />
          </div>
        </div>
      }
    >
      <CustomPackageForm onSuccess={onSuccess} onCancel={onCancel} />
    </Suspense>
  );
}
