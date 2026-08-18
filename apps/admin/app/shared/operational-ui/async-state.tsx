import type { ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button, Skeleton, cn } from "@kafi/ui";

interface AsyncStateProps {
  loading?: boolean;
  loadingLabel?: string;
  error?: ReactNode;
  errorTitle?: string;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function AsyncState({
  loading = false,
  loadingLabel = "Loading",
  error,
  errorTitle = "Unable to load this information",
  onRetry,
  isEmpty = false,
  emptyTitle = "Nothing to show yet",
  emptyDescription,
  emptyAction,
  className,
  children,
}: AsyncStateProps) {
  if (loading) {
    return (
      <div
        className={cn("space-y-3", className)}
        role="status"
        aria-live="polite"
        aria-label={loadingLabel}
      >
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4",
          className
        )}
        role="alert"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-medium">{errorTitle}</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div
        className={cn("rounded-lg border border-dashed p-6 text-center", className)}
        role="status"
      >
        <p className="font-medium">{emptyTitle}</p>
        {emptyDescription && (
          <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
        )}
        {emptyAction && <div className="mt-3">{emptyAction}</div>}
      </div>
    );
  }

  return <>{children}</>;
}
