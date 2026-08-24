import { Badge, cn } from '@kafi/ui';

export type WorkflowEntity = 'registration' | 'travel-group';

export type WorkflowStatusCode =
  | 'DRAFT'
  | 'PROCESSING'
  | 'READY_FOR_TRAVEL'
  | 'PLANNING'
  | 'TRAVEL_PREPARED'
  | 'DEPARTED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ACTIVE'
  | 'PENDING'
  | 'INACTIVE'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CONFIRMED'
  | 'RELEASED'
  | 'ASSIGNED'
  | 'AVAILABLE'
  | 'TRANSFERRED'
  | 'PUBLISHED'
  | 'CLOSED'
  | 'ARCHIVED';

export type WorkflowStatusVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info'
  | 'stale'
  | 'outline';

export interface WorkflowStatusPresentation {
  label: string;
  variant: WorkflowStatusVariant;
}

export const workflowStatusPresentation: Record<
  WorkflowStatusCode,
  WorkflowStatusPresentation
> = {
  // Registration lifecycle
  DRAFT: { label: 'Draft', variant: 'stale' },
  PROCESSING: { label: 'Processing', variant: 'info' },
  READY_FOR_TRAVEL: { label: 'Ready for travel', variant: 'success' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'destructive' },

  // Travel group lifecycle
  PLANNING: { label: 'Planning', variant: 'info' },
  TRAVEL_PREPARED: { label: 'Travel prepared', variant: 'warning' },
  DEPARTED: { label: 'Departed', variant: 'info' },

  // Membership lifecycle
  ACTIVE: { label: 'Active', variant: 'success' },
  TRANSFERRED: { label: 'Transferred', variant: 'stale' },

  // Generic statuses
  PENDING: { label: 'Pending', variant: 'stale' },
  INACTIVE: { label: 'Inactive', variant: 'stale' },

  // Visa statuses
  SUBMITTED: { label: 'Submitted', variant: 'info' },
  APPROVED: { label: 'Approved', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'destructive' },

  // Flight / transport statuses
  CONFIRMED: { label: 'Confirmed', variant: 'success' },

  // Room assignment statuses
  ASSIGNED: { label: 'Assigned', variant: 'success' },
  AVAILABLE: { label: 'Available', variant: 'stale' },
  RELEASED: { label: 'Released', variant: 'stale' },

  // Package lifecycle statuses
  PUBLISHED: { label: 'Published', variant: 'info' },
  CLOSED: { label: 'Closed', variant: 'stale' },
  ARCHIVED: { label: 'Archived', variant: 'stale' },
};

function humanizeStatus(status: string): string {
  return status
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function getWorkflowStatusPresentation(
  status: string | null | undefined,
): WorkflowStatusPresentation {
  if (typeof status !== 'string' || !status.trim()) {
    return { label: 'Unknown', variant: 'outline' };
  }

  return (
    workflowStatusPresentation[status as WorkflowStatusCode] ?? {
      label: humanizeStatus(status),
      variant: 'outline',
    }
  );
}

interface WorkflowStatusBadgeProps {
  status: string | null | undefined;
  className?: string;
}

export function WorkflowStatusBadge({
  status,
  className,
}: WorkflowStatusBadgeProps) {
  const presentation = getWorkflowStatusPresentation(status);

  return (
    <Badge
      variant={presentation.variant}
      className={cn(className)}
      aria-label={`Status: ${presentation.label}`}
    >
      {presentation.label}
    </Badge>
  );
}
