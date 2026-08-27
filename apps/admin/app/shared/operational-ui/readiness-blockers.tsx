import { useId } from 'react';
import { AlertCircle, CheckCircle2, CircleAlert } from 'lucide-react';
import { Button, cn } from '@kafi/ui';
import { Link } from 'react-router';

export type ReadinessItemStatus = 'satisfied' | 'blocked' | 'warning';

export interface ReadinessItemAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface ReadinessItem {
  key: string;
  label: string;
  status: ReadinessItemStatus;
  detail?: string;
  action?: ReadinessItemAction;
}

interface ReadinessBlockersProps {
  items: ReadinessItem[];
  title?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

const itemPresentation: Record<
  ReadinessItemStatus,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  satisfied: {
    label: 'Satisfied',
    icon: CheckCircle2,
    className: 'text-success',
  },
  blocked: {
    label: 'Needs attention',
    icon: AlertCircle,
    className: 'text-destructive',
  },
  warning: {
    label: 'Review',
    icon: CircleAlert,
    className: 'text-warning',
  },
};

export function ReadinessBlockers({
  items,
  title = 'Readiness',
  emptyTitle = 'No readiness conditions reported',
  emptyDescription = 'The backend did not return any conditions for this record.',
  className,
}: ReadinessBlockersProps) {
  const titleId = useId();
  const blockedItems = items.filter((item) => item.status === 'blocked');
  const warningItems = items.filter((item) => item.status === 'warning');
  const isReady = items.length > 0 && blockedItems.length === 0;
  const hasNoConditions = items.length === 0;

  return (
    <section
      className={cn('space-y-3 rounded-lg border p-4', className)}
      aria-labelledby={titleId}
      aria-live="polite"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id={titleId} className="font-medium">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isReady
              ? warningItems.length > 0
                ? 'Ready — with warnings to review.'
                : 'Everything is ready.'
              : hasNoConditions
                ? 'No readiness result is available.'
                : 'Staff action is required.'}
          </p>
        </div>
        <span
          className={cn(
            'rounded-full px-2 py-1 text-xs font-medium',
            isReady
              ? warningItems.length > 0
                ? 'bg-warning/10 text-warning'
                : 'bg-success/10 text-success'
              : hasNoConditions
                ? 'bg-muted text-muted-foreground'
                : 'bg-destructive/10 text-destructive',
          )}
        >
          {isReady
            ? warningItems.length > 0
              ? `${warningItems.length} warning${warningItems.length > 1 ? 's' : ''}`
              : 'Ready'
            : hasNoConditions
              ? 'Unavailable'
              : `${blockedItems.length} to resolve`}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{emptyTitle}</p>
          <p>{emptyDescription}</p>
        </div>
      ) : (
        <ul className="space-y-2" aria-label={`${title} conditions`}>
          {items.map((item) => {
            const presentation = itemPresentation[item.status];
            const Icon = presentation.icon;

            return (
              <li
                key={item.key}
                className="flex flex-wrap items-start gap-2 rounded-md border bg-background p-2.5 text-sm"
              >
                <Icon
                  className={cn(
                    'mt-0.5 h-4 w-4 shrink-0',
                    presentation.className,
                  )}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.label}</p>
                  {item.detail && (
                    <p className="text-muted-foreground">{item.detail}</p>
                  )}
                </div>
                <span className="sr-only">{presentation.label}</span>
                {item.action &&
                  (item.action.href ? (
                    <Button
                      variant="link"
                      size="sm"
                      render={<Link to={item.action.href} />}
                    >
                      {item.action.label}
                    </Button>
                  ) : (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={item.action.onClick}
                    >
                      {item.action.label}
                    </Button>
                  ))}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
